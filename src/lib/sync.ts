/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { dbLocal } from './db';
import { SyncStatus } from '../types';

let isSyncing = false;

/**
 * Checks if the system is currently online using the draft navigator properties
 */
export function getOnlineStatus(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

/**
 * Fetches current synchronization metrics from the local IndexedDB stack
 */
export async function getSyncStatus(): Promise<SyncStatus> {
  const pendingCount = await dbLocal.syncQueue.count();
  const lastSyncTime = localStorage.getItem('last_sync_timestamp') || 'لم يتمت المزامنة بعد';
  return {
    lastSyncTime,
    pendingCount,
    isOnline: getOnlineStatus(),
  };
}

/**
 * Synchronizes the offline client queue with the server backend
 */
export async function performSynchronize(clerkName: string): Promise<{ success: boolean; syncedCount: number; message: string }> {
  if (isSyncing) {
    return { success: false, syncedCount: 0, message: 'مزامنة جارية بالفعل...' };
  }

  const isOnline = getOnlineStatus();
  if (!isOnline) {
    return { success: false, syncedCount: 0, message: 'لا يمكن المزامنة: الجهاز في وضع عدم الاتصال (Offline).' };
  }

  const queueItems = await dbLocal.syncQueue.toArray();
  if (queueItems.length === 0) {
    return { success: true, syncedCount: 0, message: 'كل السجلات محلية محدثة بالكامل مع السيرفر المركزي.' };
  }

  isSyncing = true;
  console.log(`[Sync Engine] Pushing ${queueItems.length} transactional logs to server...`);

  try {
    const response = await fetch('/api/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        queueItems,
        clerk: clerkName || 'Bailiff App'
      }),
    });

    if (!response.ok) {
      throw new Error(`خطأ سيرفر: ${response.statusText}`);
    }

    const result = await response.json();
    if (result.success && result.syncedIds && Array.isArray(result.syncedIds)) {
      // Clean up successfully synchronized logs from local Dexie queue
      await dbLocal.syncQueue.bulkDelete(result.syncedIds);
      
      const count = result.syncedIds.length;
      localStorage.setItem('last_sync_timestamp', new Date().toLocaleTimeString('ar-MA') + ' ' + new Date().toLocaleDateString('ar-MA'));
      
      // Dispatch custom status event for reactive UI updates
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('sync_queue_updated'));
      }

      isSyncing = false;
      return {
        success: true,
        syncedCount: count,
        message: `تم مزامنة ${count} عمليات بنجاح مع قاعدة البيانات المركزية ومسح سجل الانتظار!`
      };
    } else {
      throw new Error(result.error || 'عطل مجهول من خدمة المزامنة');
    }
  } catch (error: any) {
    console.error('[Sync Engine] Critical synchronizer sync-failed:', error);
    isSyncing = false;
    return {
      success: false,
      syncedCount: 0,
      message: `فشلت عملية المزامنة: ${error?.message || error || 'خطأ اتصال بالشبكة'}`
    };
  }
}
