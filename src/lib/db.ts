/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Dexie, { type Table } from 'dexie';
import { JudicialFile, JudicialReport, MediaFile, FinancialLedgerItem, SyncQueueItem } from '../types';
import { encryptFields, decryptFields } from './crypto';

// Column subsets to encrypt
const FILE_ENCRYPTED_FIELDS = ['plaintiffName', 'defendantName', 'defendantAddress'];
const REPORT_ENCRYPTED_FIELDS = ['recipientName'];

class BailiffDatabase extends Dexie {
  files!: Table<JudicialFile, string>;
  reports!: Table<JudicialReport, string>;
  media!: Table<MediaFile, string>;
  financials!: Table<FinancialLedgerItem, string>;
  syncQueue!: Table<SyncQueueItem, number>;

  constructor() {
    super('BailiffDatabase');
    this.version(1).stores({
      files: 'id, caseNumber, courtName, caseType, status, createdAt',
      reports: 'id, fileId, reportType, reporterName, createdAt',
      media: 'id, fileId, reportId, createdAt',
      financials: 'id, fileId, billNumber, payerName, status, createdAt',
      syncQueue: '++id, action, table, recordId, timestamp',
    });
  }
}

export const dbLocal = new BailiffDatabase();

/**
 * Appends an operation to the local synchronization queue.
 */
async function appendToSyncQueue(
  action: 'create' | 'update' | 'delete',
  table: 'files' | 'reports' | 'media' | 'financials',
  recordId: string,
  recordData: any
) {
  const syncItem: SyncQueueItem = {
    action,
    table,
    recordId,
    data: JSON.stringify(recordData),
    timestamp: new Date().toISOString()
  };
  await dbLocal.syncQueue.add(syncItem);
  
  // Trigger custom window event to notify UI components of queue updates
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('sync_queue_updated'));
  }
}

/**
 * DB wrapper helper methods supporting high-level security (AES decryption/encryption)
 * and seamless transactional logs tracking for the offline-first background synchronizer.
 */
export const dbService = {
  // --- Case Files ---
  async saveFile(file: JudicialFile, triggerSync = true): Promise<string> {
    const id = file.id || `file_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const record: JudicialFile = {
      ...file,
      id,
      isEncrypted: true,
      createdAt: file.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Encrypt sensitive records before writing to Disk
    const encryptedRecord = encryptFields(record, FILE_ENCRYPTED_FIELDS);
    await dbLocal.files.put(encryptedRecord);

    if (triggerSync) {
      await appendToSyncQueue('create', 'files', id, encryptedRecord);
    }
    return id;
  },

  async getFile(id: string): Promise<JudicialFile | undefined> {
    const record = await dbLocal.files.get(id);
    if (!record) return undefined;
    return decryptFields(record, FILE_ENCRYPTED_FIELDS);
  },

  async getAllFiles(): Promise<JudicialFile[]> {
    const records = await dbLocal.files.toArray();
    return records.map((rec) => decryptFields(rec, FILE_ENCRYPTED_FIELDS));
  },

  async deleteFile(id: string): Promise<void> {
    await dbLocal.files.delete(id);
    await appendToSyncQueue('delete', 'files', id, { id });
  },

  // --- Judicial Reports ---
  async saveReport(report: JudicialReport, triggerSync = true): Promise<string> {
    const id = report.id || `rep_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const record: JudicialReport = {
      ...report,
      id,
      createdAt: report.createdAt || new Date().toISOString(),
    };

    const encryptedRecord = encryptFields(record, REPORT_ENCRYPTED_FIELDS);
    await dbLocal.reports.put(encryptedRecord);

    // Also update associated file status to inprogress or served depending on outcomes
    const outcome = report.servingOutcome;
    let fileStatus: JudicialFile['status'] = 'inprogress';
    if (['handed_in_person', 'handed_to_family', 'executed_successfully'].includes(outcome)) {
      fileStatus = 'served';
    } else if (['neighbor_refused', 'closed_door', 'execution_obstruction'].includes(outcome)) {
      fileStatus = 'failed';
    }

    const linkedFile = await dbLocal.files.get(report.fileId);
    if (linkedFile) {
      linkedFile.status = fileStatus;
      linkedFile.updatedAt = new Date().toISOString();
      await dbLocal.files.put(linkedFile);
      if (triggerSync) {
        await appendToSyncQueue('update', 'files', linkedFile.id!, linkedFile);
      }
    }

    if (triggerSync) {
      await appendToSyncQueue('create', 'reports', id, encryptedRecord);
    }
    return id;
  },

  async getReport(id: string): Promise<JudicialReport | undefined> {
    const record = await dbLocal.reports.get(id);
    if (!record) return undefined;
    return decryptFields(record, REPORT_ENCRYPTED_FIELDS);
  },

  async getReportsForFile(fileId: string): Promise<JudicialReport[]> {
    const records = await dbLocal.reports.where('fileId').equals(fileId).toArray();
    return records.map((rec) => decryptFields(rec, REPORT_ENCRYPTED_FIELDS));
  },

  async getAllReports(): Promise<JudicialReport[]> {
    const records = await dbLocal.reports.toArray();
    return records.map((rec) => decryptFields(rec, REPORT_ENCRYPTED_FIELDS));
  },

  // --- Attachments / Media ---
  async saveMedia(media: MediaFile, triggerSync = true): Promise<string> {
    const id = media.id || `med_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const record: MediaFile = {
      ...media,
      id,
      createdAt: media.createdAt || new Date().toISOString(),
    };
    await dbLocal.media.put(record);

    if (triggerSync) {
      await appendToSyncQueue('create', 'media', id, record);
    }
    return id;
  },

  async getMediaForFile(fileId: string): Promise<MediaFile[]> {
    return await dbLocal.media.where('fileId').equals(fileId).toArray();
  },

  // --- Financial Ledgers ---
  async saveFinancialItem(item: FinancialLedgerItem, triggerSync = true): Promise<string> {
    const id = item.id || `fin_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const record: FinancialLedgerItem = {
      ...item,
      id,
      createdAt: item.createdAt || new Date().toISOString(),
    };
    await dbLocal.financials.put(record);

    if (triggerSync) {
      await appendToSyncQueue('create', 'financials', id, record);
    }
    return id;
  },

  async getAllFinancials(): Promise<FinancialLedgerItem[]> {
    return await dbLocal.financials.toArray();
  },

  // --- Clean Database Seed ---
  async seedInitialDemoData(): Promise<void> {
    const filesCount = await dbLocal.files.count();
    if (filesCount > 0) return; // Prevent double seeding

    console.log('Seeding initial judicial bailiff demo files...');

    // Save Case Files
    const f1 = await this.saveFile({
      caseNumber: 'م-ت-2026-8834',
      courtName: 'المحكمة الابتدائية بالرباط',
      plaintiffName: 'الشركة المغربية للتأمين ش.م.',
      defendantName: 'بشير الإدريسي',
      defendantAddress: 'شارع الحسن الثاني، عمارة 14، شقة 4، الرباط',
      caseType: 'notification',
      status: 'pending',
      depositAmount: 850,
      isEncrypted: false,
      createdAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString(), // 3 days ago
      updatedAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString()
    }, false);

    const f2 = await this.saveFile({
      caseNumber: 'م-ن-2026-1129',
      courtName: 'محكمة الاستئناف التجارية بالدار البيضاء',
      plaintiffName: 'مؤسسة التجاري وفا بنك',
      defendantName: 'سليمان الداودي',
      defendantAddress: 'حي رياض السلام، زنقة النخيل، رقم 45، الدار البيضاء',
      caseType: 'execution',
      status: 'inprogress',
      depositAmount: 2500,
      isEncrypted: false,
      createdAt: new Date(Date.now() - 3600000 * 24 * 6).toISOString(), // 6 days ago
      updatedAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString()
    }, false);

    const f3 = await this.saveFile({
      caseNumber: 'م-ت-2026-4412',
      courtName: 'المحكمة التجارية بطنجة',
      plaintiffName: 'كمال بن جلون',
      defendantName: 'شركة شمال لوجيستيك ش.م.م',
      defendantAddress: 'المنطقة الصناعية مغوغة، بلوك ج، طنجة',
      caseType: 'preview',
      status: 'served',
      depositAmount: 1200,
      isEncrypted: false,
      createdAt: new Date(Date.now() - 3600000 * 24 * 10).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 24 * 9).toISOString()
    }, false);

    // Save initial financial ledgers
    await this.saveFinancialItem({
      fileId: f1,
      billNumber: 'BILL-2026-001',
      payerName: 'الشركة المغربية للتأمين',
      amountPaid: 850,
      taxAmount: 170, // 20% VAT
      stampsFee: 50,
      executionFees: 630,
      paymentType: 'deposit_receipt',
      paymentMethod: 'bank_transfer',
      status: 'paid',
      accountantName: 'رشيدة علمي',
      createdAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString()
    }, false);

    await this.saveFinancialItem({
      fileId: f2,
      billNumber: 'BILL-2026-002',
      payerName: 'مؤسسة التجاري وفا بنك',
      amountPaid: 2500,
      taxAmount: 500,
      stampsFee: 150,
      executionFees: 1850,
      paymentType: 'deposit_receipt',
      paymentMethod: 'check',
      status: 'paid',
      accountantName: 'رشيدة علمي',
      createdAt: new Date(Date.now() - 3600000 * 24 * 6).toISOString()
    }, false);

    console.log('Seeding completed successfully!');
  }
};
