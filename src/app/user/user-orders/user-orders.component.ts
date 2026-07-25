import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DataService, Order } from '../../core/services/data.service';

@Component({
  selector: 'app-user-orders',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="orders-page">

      <!-- ─── Header ───────────────────── -->
      <div class="orders-header">
        <button class="back-btn" (click)="router.navigate(['/shop/account'])">
          <span class="material-symbols-outlined">arrow_back</span>
        </button>
        <h2>My Orders</h2>
        <span class="order-count" *ngIf="!isLoading() && orders().length > 0">
          {{ orders().length }}
        </span>
      </div>

      <!-- ─── Loading State ────────────── -->
      <div class="loading-state" *ngIf="isLoading()">
        <div class="order-card-skeleton" *ngFor="let i of [1,2,3]">
          <div class="skel-line" style="width: 40%; height: 10px; border-radius: 4px;"></div>
          <div class="skel-line mt-2" style="width: 70%; height: 14px; border-radius: 4px;"></div>
          <div class="skel-line mt-2" style="width: 50%; height: 10px; border-radius: 4px;"></div>
        </div>
      </div>

      <!-- ─── Empty State ──────────────── -->
      <div class="empty-state" *ngIf="!isLoading() && orders().length === 0">
        <div class="empty-icon">
          <span class="material-symbols-outlined">package_2</span>
        </div>
        <h3>No orders yet</h3>
        <p>Start shopping and your orders will appear here.</p>
        <button class="shop-btn" (click)="router.navigate(['/shop'])">
          <span class="material-symbols-outlined">storefront</span>
          Browse Products
        </button>
      </div>

      <!-- ─── Orders List ──────────────── -->
      <div class="orders-list" *ngIf="!isLoading() && orders().length > 0">
        <div class="order-card" *ngFor="let order of orders()" (click)="toggleExpand(order.id)">
          <div class="order-card-top">
            <div class="order-status-row">
              <div class="status-dot" [ngClass]="getStatusClass(order.status)"></div>
              <span class="status-label" [ngClass]="getStatusClass(order.status)">
                {{ getStatusLabel(order.status) }}
              </span>
            </div>
            <span class="order-date">{{ formatDate(order.date) }}</span>
          </div>

          <div class="order-meta">
            <span class="order-id">Order #{{ order.id.slice(-6).toUpperCase() }}</span>
            <span class="items-count">{{ order.items.length }} {{ order.items.length === 1 ? 'item' : 'items' }}</span>
          </div>

          <!-- Expanded Details -->
          <div class="order-details" *ngIf="expandedOrder() === order.id">
            <div class="detail-divider"></div>

            <div class="detail-row">
              <span class="detail-label">Name</span>
              <span class="detail-value">{{ order.customerName }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Phone</span>
              <span class="detail-value">+91 {{ order.phone }}</span>
            </div>
            <div class="detail-row" *ngIf="order.address">
              <span class="detail-label">Address</span>
              <span class="detail-value">{{ order.address }}</span>
            </div>
            <div class="detail-row" *ngIf="order.notes">
              <span class="detail-label">Notes</span>
              <span class="detail-value">{{ order.notes }}</span>
            </div>
            <div class="detail-row" *ngIf="order.cancellationReason">
              <span class="detail-label">Reason</span>
              <span class="detail-value text-error">{{ order.cancellationReason }}</span>
            </div>

            <div class="items-section">
              <div class="items-label">Items Ordered</div>
              <div class="order-item-row" *ngFor="let item of order.items">
                <div class="item-img-wrap">
                  <img [src]="getProductImage(item.productId)" [alt]="getProductName(item.productId)" class="item-thumb">
                </div>
                <div class="item-info">
                  <span class="item-name">{{ getProductName(item.productId) }}</span>
                  <span class="item-sku">{{ getProductSku(item.productId) }}</span>
                </div>
                <div class="item-qty">Qty: {{ item.quantity }}</div>
              </div>
            </div>
          </div>

          <div class="expand-indicator">
            <span class="material-symbols-outlined" [class.rotated]="expandedOrder() === order.id">
              expand_more
            </span>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .orders-page {
      min-height: 100%;
      background: var(--background);
      padding-bottom: 2rem;
    }

    /* ─── Header ──────────────────────────── */
    .orders-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px var(--space-base);
      background: var(--surface);
      border-bottom: 1px solid rgba(0,0,0,0.05);
      position: sticky;
      top: 0;
      z-index: 10;

      h2 { margin: 0; font-size: 1rem; font-weight: 700; color: var(--text-main); flex: 1; }
    }
    .back-btn {
      background: none; border: none; cursor: pointer;
      color: var(--text-secondary); display: flex; align-items: center;
      padding: 4px; border-radius: 8px;
      &:active { background: rgba(0,0,0,0.05); }
      .material-symbols-outlined { font-size: 1.3rem; }
    }
    .order-count {
      background: var(--primary);
      color: white;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 999px;
    }

    /* ─── Loading Skeletons ────────────────── */
    .loading-state {
      padding: 16px var(--space-base);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .order-card-skeleton {
      background: var(--surface);
      border-radius: 16px;
      padding: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    }
    .skel-line {
      background: linear-gradient(90deg, #f0f0f0 25%, #e4e4e4 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: shimmer 1.4s infinite ease-in-out;
    }
    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* ─── Empty State ──────────────────────── */
    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
    }
    .empty-icon {
      width: 72px; height: 72px;
      background: rgba(139,0,0,0.07);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 1rem;
      .material-symbols-outlined { font-size: 2rem; color: var(--primary); }
    }
    .empty-state h3 { font-size: 1rem; font-weight: 700; margin: 0 0 8px; }
    .empty-state p { font-size: 0.85rem; color: var(--text-muted); margin: 0 0 1.5rem; }
    .shop-btn {
      display: inline-flex; align-items: center; gap: 8px;
      background: var(--primary); color: white;
      border: none; border-radius: 12px;
      padding: 12px 24px; font-size: 0.9rem; font-weight: 600;
      font-family: inherit; cursor: pointer;
      .material-symbols-outlined { font-size: 1.1rem; }
    }

    /* ─── Orders List ──────────────────────── */
    .orders-list {
      padding: 16px var(--space-base);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    /* ─── Order Card ───────────────────────── */
    .order-card {
      background: var(--surface);
      border-radius: 16px;
      padding: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
      border: 1px solid rgba(0,0,0,0.04);
      cursor: pointer;
      transition: box-shadow 0.2s;
      &:active { box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
    }
    .order-card-top {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 8px;
    }
    .order-status-row {
      display: flex; align-items: center; gap: 6px;
    }
    .status-dot {
      width: 8px; height: 8px; border-radius: 50%;
      &.pending { background: #f59e0b; }
      &.completed { background: var(--success); }
      &.cancelled { background: var(--error); }
    }
    .status-label {
      font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
      &.pending { color: #f59e0b; }
      &.completed { color: var(--success); }
      &.cancelled { color: var(--error); }
    }
    .order-date {
      font-size: 0.72rem; color: var(--text-muted); font-weight: 500;
    }
    .order-meta {
      display: flex; justify-content: space-between; align-items: center;
    }
    .order-id { font-size: 0.88rem; font-weight: 700; color: var(--text-main); }
    .items-count { font-size: 0.75rem; color: var(--text-muted); }

    .expand-indicator {
      display: flex; justify-content: center; margin-top: 8px;
      .material-symbols-outlined {
        font-size: 1.2rem; color: var(--text-muted);
        transition: transform 0.3s ease;
        &.rotated { transform: rotate(180deg); }
      }
    }

    /* ─── Order Details (Expanded) ─────────── */
    .order-details { margin-top: 4px; }
    .detail-divider {
      height: 1px; background: rgba(0,0,0,0.06); margin: 10px 0;
    }
    .detail-row {
      display: flex; justify-content: space-between; gap: 12px;
      padding: 5px 0; font-size: 0.8rem;
    }
    .detail-label { color: var(--text-muted); font-weight: 500; flex-shrink: 0; }
    .detail-value { color: var(--text-main); font-weight: 500; text-align: right; }
    .text-error { color: var(--error); }

    .items-section { margin-top: 12px; }
    .items-label {
      font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.5px; color: var(--text-muted); margin-bottom: 8px;
    }
    .order-item-row {
      display: flex; align-items: center; gap: 10px; padding: 8px 0;
      border-bottom: 1px solid rgba(0,0,0,0.04);
      &:last-child { border-bottom: none; }
    }
    .item-img-wrap {
      width: 40px; height: 40px; border-radius: 8px;
      overflow: hidden; background: #f0f0f0; flex-shrink: 0;
    }
    .item-thumb { width: 100%; height: 100%; object-fit: cover; }
    .item-info {
      flex: 1; display: flex; flex-direction: column; gap: 2px;
    }
    .item-name { font-size: 0.8rem; font-weight: 600; color: var(--text-main); }
    .item-sku { font-size: 0.68rem; color: var(--text-muted); }
    .item-qty {
      font-size: 0.75rem; font-weight: 600; color: var(--primary);
      background: rgba(139,0,0,0.07); padding: 3px 8px; border-radius: 6px;
      flex-shrink: 0;
    }

    .mt-2 { margin-top: 0.5rem; }
  `]
})
export class UserOrdersComponent implements OnInit {
  router = inject(Router);
  private authService = inject(AuthService);
  private dataService = inject(DataService);

  orders = signal<Order[]>([]);
  isLoading = signal(true);
  expandedOrder = signal<string | null>(null);

  async ngOnInit() {
    const user = this.authService.currentUser();
    if (!user) { this.isLoading.set(false); return; }
    try {
      const orders = await this.dataService.getUserOrders(user.uid);
      this.orders.set(orders);
    } catch (e) {
      console.error('Error fetching orders:', e);
    } finally {
      this.isLoading.set(false);
    }
  }

  toggleExpand(orderId: string) {
    this.expandedOrder.update(cur => cur === orderId ? null : orderId);
  }

  getStatusClass(status: string): string { return status; }

  getStatusLabel(status: string): string {
    switch(status) {
      case 'pending': return 'Pending';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  }

  formatDate(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return dateStr; }
  }

  getProductName(id: string): string {
    return this.dataService.products().find(p => p.id === id)?.name || 'Product';
  }
  getProductSku(id: string): string {
    return this.dataService.products().find(p => p.id === id)?.sku || '';
  }
  getProductImage(id: string): string {
    return this.dataService.products().find(p => p.id === id)?.images[0] || '';
  }
}
