import { Injectable, signal, Inject, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { OfflineSyncService } from './offline-sync.service';

@Injectable({
  providedIn: 'root'
})
export class NetworkService {
  isOnline = signal<boolean>(true);

  /** Backward-compatible: true when admin chose to use offline billing mode */
  isOfflineBillingMode = signal<boolean>(false);

  private offlineSync = inject(OfflineSyncService);

  // Lazy-inject DataService to avoid circular dep at construction time
  private _dataService: any = null;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      this.isOnline.set(navigator.onLine);

      window.addEventListener('online', () => {
        this.isOnline.set(true);
        console.log('[Network] Internet restored. Triggering offline bill sync...');
        // Small delay so Firebase connection also re-establishes
        setTimeout(() => this.syncOfflineBills(), 2000);
      });

      window.addEventListener('offline', () => {
        this.isOnline.set(false);
        console.log('[Network] Internet lost. Offline mode active.');
      });
    }
  }

  /** Register DataService lazily to avoid circular dependency */
  registerDataService(ds: any) {
    this._dataService = ds;
  }

  /** Called from admin-layout offline overlay button */
  enableOfflineBilling() {
    this.isOfflineBillingMode.set(true);
  }

  /** Called automatically when internet comes back */
  async syncOfflineBills() {
    if (!this._dataService) {
      console.warn('[Network] DataService not registered yet — skipping auto-sync.');
      return;
    }

    const pending = this.offlineSync.getPendingBills();
    if (pending.length === 0) {
      console.log('[Network] No pending offline bills to sync.');
      return;
    }

    console.log(`[Network] Found ${pending.length} offline bill(s) to sync.`);
    this.offlineSync.isSyncing.set(true);

    let successCount = 0;
    let failCount = 0;

    for (const bill of pending) {
      try {
        this.offlineSync.markSyncing(bill.offlineId);

        // createAdminBill handles: Firestore order save + stock deduction + balance update
        const createdOrder = await this._dataService.createAdminBill(
          bill.customerData,
          bill.items,
          bill.billingSummary,
          `${bill.notes} [Synced from Offline: ${bill.offlineId}]`
        );

        this.offlineSync.markSynced(
          bill.offlineId,
          createdOrder.billNumber || createdOrder.id,
          createdOrder.id
        );

        successCount++;
        console.log(`[Network] ✅ Offline bill ${bill.offlineId} synced → Server Bill: ${createdOrder.billNumber}`);

      } catch (error) {
        this.offlineSync.markFailed(bill.offlineId);
        failCount++;
        console.error(`[Network] ❌ Failed to sync offline bill ${bill.offlineId}:`, error);
      }
    }

    this.offlineSync.isSyncing.set(false);
    this.offlineSync.lastSyncResult.set({ success: successCount, failed: failCount });
    console.log(`[Network] Sync complete. ✅ ${successCount} synced, ❌ ${failCount} failed.`);

    // Auto-clear the sync result banner after 5 seconds
    setTimeout(() => {
      this.offlineSync.lastSyncResult.set(null);
    }, 5000);
  }
}
