/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'officer' | 'assistant' | 'accountant';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  token?: string;
  officeName: string;
}

export interface JudicialFile {
  id?: string; // Auto-incremented in Dexie/Postgres
  caseNumber: string; // Dynamic case tracking ID (رقم الملف)
  courtName: string; // Court Name (المحكمة المصدرة)
  plaintiffName: string; // Plaintiff (encrypted in IndexedDB) (المدعي)
  defendantName: string; // Defendant (encrypted in IndexedDB) (المدعى عليه)
  defendantAddress: string; // Defendant Address (encrypted in IndexedDB) (العنوان)
  caseType: 'notification' | 'execution' | 'preview' | 'other'; // Type (تبليغ | تنفيذ | معاينة)
  status: 'pending' | 'inprogress' | 'served' | 'failed'; // (قيد المعالجة | تم التبليغ | تعذر)
  depositAmount: number; // Cash deposit (الوديعة)
  isEncrypted: boolean; // Flag to indicate if records are encrypted in storage
  createdAt: string;
  updatedAt: string;
}

export interface JudicialReport {
  id?: string;
  fileId: string; // Linked Case File ID
  reportType: 'notification_minutes' | 'execution_minutes' | 'preview_report'; // (محضر تبليغ | محضر تنفيذ | محضر معاينة)
  reporterName: string; // Assistant or Officer who filled it
  statementDetails: string; // Details (تفاصيل المعاينة والمحضر)
  servingOutcome: 'handed_in_person' | 'handed_to_family' | 'neighbor_refused' | 'closed_door' | 'executed_successfully' | 'execution_obstruction';
  recipientName?: string; // Who received the document/notification (encrypted in DB)
  signatureBase64?: string; // Digital signature of the recipient or assistant
  hasOfficialStamp: boolean; // Custom electronic certifying stamp status
  latitude?: number;
  longitude?: number;
  createdAt: string;
}

export interface MediaFile {
  id?: string;
  fileId: string; // Linked case file
  reportId?: string; // Optional linked report
  title: string;
  base64Data: string; // Optimized JPEG data
  fileType: string;
  createdAt: string;
}

export interface FinancialLedgerItem {
  id?: string;
  fileId?: string; // Linked judicial file
  billNumber: string; // Unique Invoice ID (رقم الفاتورة)
  payerName: string; // Name of person paying
  amountPaid: number; // Paid amount (المبلغ المؤدى)
  taxAmount: number; // Value Added Tax (VAT / الضريبة)
  stampsFee: number; // Official stamp cost (واجبات التمبر)
  executionFees: number; // Bailiff travel and execution fees (أتعاب التنفيذ)
  paymentType: 'deposit_receipt' | 'final_invoice' | 'service_fee';
  paymentMethod: 'cash' | 'check' | 'bank_transfer';
  status: 'paid' | 'unpaid' | 'cancelled';
  accountantName: string;
  createdAt: string;
}

export interface SyncQueueItem {
  id?: number; // Primary key in IndexedDB
  action: 'create' | 'update' | 'delete';
  table: 'files' | 'reports' | 'media' | 'financials';
  recordId: string; // Local ID (string)
  data: string; // Encrypted JSON string of the record data
  timestamp: string;
}

export interface SyncStatus {
  lastSyncTime: string;
  pendingCount: number;
  isOnline: boolean;
}

export interface LocalAlert {
  id: string;
  fileId: string;
  caseNumber: string;
  defendantName: string;
  title: string;
  alertType: 'session' | 'notification' | 'execution' | 'preview' | 'other';
  appointmentDate: string; // ISO string or YYYY-MM-DDTHH:mm
  note: string;
  priority: 'high' | 'medium' | 'low';
  isTriggered: boolean;
  isCompleted: boolean;
  createdAt: string;
}

