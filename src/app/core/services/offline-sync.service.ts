import { Injectable, inject, signal } from '@angular/core';
import { OrderItem } from './data.service';

// ─── Offline Bill Queue Item ───────────────────────────────────────────────
export interface OfflineBillItem {
  offlineId: string;           // Unique local ID e.g. "OFFLINE-20240729-A3F2"
  createdAt: string;           // ISO timestamp
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  retryCount: number;

  // All bill data needed for Firestore sync
  customerData: {
    name: string;
    phone: string;
    email?: string;
    address: string;
    pincode?: string;
    uid?: string;
  };
  items: OrderItem[];
  billingSummary: {
    subTotal: number;
    badha: number;
    totalAmount: number;
    previousBalance: number;
    netPayable: number;
  };
  notes: string;

  // Assigned after sync
  serverBillNumber?: string;
  serverOrderId?: string;
}

const STORAGE_KEY = 'kh_offline_bills_queue';
const MAX_RETRIES = 3;

@Injectable({
  providedIn: 'root'
})
export class OfflineSyncService {

  // Signal for UI to react to queue changes
  pendingCount = signal<number>(0);
  isSyncing = signal<boolean>(false);
  lastSyncResult = signal<{ success: number; failed: number } | null>(null);

  constructor() {
    this._refreshCount();
  }

  // ─── Generate a unique offline bill ID ────────────────────────────────────
  generateOfflineId(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `OFFLINE-${dateStr}-${rand}`;
  }

  // ─── Save a new offline bill to queue ─────────────────────────────────────
  enqueue(bill: Omit<OfflineBillItem, 'status' | 'retryCount'>): OfflineBillItem {
    const queue = this._loadQueue();
    const newBill: OfflineBillItem = {
      ...bill,
      status: 'pending',
      retryCount: 0
    };
    queue.push(newBill);
    this._saveQueue(queue);
    this._refreshCount();
    return newBill;
  }

  // ─── Get all pending (unsynced) bills ─────────────────────────────────────
  getPendingBills(): OfflineBillItem[] {
    return this._loadQueue().filter(b => b.status === 'pending' || b.status === 'failed');
  }

  // ─── Get all bills (for display) ──────────────────────────────────────────
  getAllBills(): OfflineBillItem[] {
    return this._loadQueue();
  }

  // ─── Mark a bill as syncing ────────────────────────────────────────────────
  markSyncing(offlineId: string) {
    this._updateBill(offlineId, { status: 'syncing' });
  }

  // ─── Mark a bill as synced (assign server bill number) ─────────────────────
  markSynced(offlineId: string, serverBillNumber: string, serverOrderId: string) {
    this._updateBill(offlineId, { status: 'synced', serverBillNumber, serverOrderId });
    this._refreshCount();
  }

  // ─── Mark a bill as failed ────────────────────────────────────────────────
  markFailed(offlineId: string) {
    const queue = this._loadQueue();
    const bill = queue.find(b => b.offlineId === offlineId);
    if (bill) {
      bill.retryCount = (bill.retryCount || 0) + 1;
      bill.status = bill.retryCount >= MAX_RETRIES ? 'failed' : 'pending';
      this._saveQueue(queue);
      this._refreshCount();
    }
  }

  // ─── Clear successfully synced bills ──────────────────────────────────────
  clearSynced() {
    const queue = this._loadQueue().filter(b => b.status !== 'synced');
    this._saveQueue(queue);
    this._refreshCount();
  }

  // ─── Internal helpers ─────────────────────────────────────────────────────
  private _loadQueue(): OfflineBillItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private _saveQueue(queue: OfflineBillItem[]) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.error('[OfflineSync] Failed to save queue to localStorage:', e);
    }
  }

  private _updateBill(offlineId: string, updates: Partial<OfflineBillItem>) {
    const queue = this._loadQueue();
    const index = queue.findIndex(b => b.offlineId === offlineId);
    if (index !== -1) {
      queue[index] = { ...queue[index], ...updates };
      this._saveQueue(queue);
    }
  }

  private _refreshCount() {
    const pending = this._loadQueue().filter(b => b.status === 'pending' || b.status === 'syncing').length;
    this.pendingCount.set(pending);
  }
}
