import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService, Order } from '../../core/services/data.service';
import { InvoiceService } from '../../core/services/invoice.service';
import { SideDrawerComponent } from '../../shared/side-drawer/side-drawer.component';

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CommonModule, SideDrawerComponent],
  template: `
    <div class="page-header">
      <div>
        <h2>Orders</h2>
        <p class="text-muted">Manage customer orders and inventory</p>
      </div>
    </div>
    
    <div class="card p-0">
      <table class="table">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Customer</th>
            <th>Items</th>
            <th>Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let order of orders()" (click)="openOrderDetails(order)" class="clickable-row">
            <td><strong>{{ order.id }}</strong></td>
            <td>
              <div class="customer-info">
                <strong>{{ order.customerName }}</strong>
                <span class="text-muted text-sm">{{ order.phone }}</span>
              </div>
            </td>
            <td>{{ getTotalItems(order) }} items</td>
            <td>{{ order.date | date:'mediumDate' }}</td>
            <td>
              <span class="badge" [ngClass]="order.status === 'pending' ? 'badge-warning' : 'badge-success'">
                {{ order.status | titlecase }}
              </span>
            </td>
          </tr>
          <tr *ngIf="orders().length === 0">
            <td colspan="5" class="text-center text-muted py-4">No orders found.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Right Drawer for Order Details -->
    <app-side-drawer 
      [isOpen]="isDrawerOpen()" 
      [title]="'Order ' + selectedOrder()?.id" 
      width="500px"
      (close)="closeDrawer()">
      
      <div class="order-details-content" *ngIf="selectedOrder() as order">
        <div class="status-banner" [ngClass]="order.status === 'pending' ? 'bg-warning-light' : 'bg-success-light'">
          <span class="material-symbols-outlined" 
                [class.text-warning]="order.status === 'pending'"
                [class.text-success]="order.status === 'completed'">
            {{ order.status === 'pending' ? 'pending_actions' : 'check_circle' }}
          </span>
          <div class="status-text">
            <strong>{{ order.status | titlecase }} Order</strong>
            <span>{{ order.date | date:'medium' }}</span>
          </div>
        </div>
        
        <div class="details-section mt-4">
          <h4>Customer Details</h4>
          <div class="detail-row">
            <span class="material-symbols-outlined text-muted">person</span>
            <span>{{ order.customerName }}</span>
          </div>
          <div class="detail-row">
            <span class="material-symbols-outlined text-muted">call</span>
            <span>{{ order.phone }}</span>
          </div>
          <div class="detail-row">
            <span class="material-symbols-outlined text-muted">mail</span>
            <span>{{ order.email }}</span>
          </div>
          <div class="detail-row">
            <span class="material-symbols-outlined text-muted">location_on</span>
            <span>{{ order.address }}</span>
          </div>
          <div class="detail-row" *ngIf="order.notes">
            <span class="material-symbols-outlined text-muted">notes</span>
            <span>{{ order.notes }}</span>
          </div>
        </div>
        
        <div class="details-section mt-4">
          <h4>Ordered Items</h4>
          <div class="order-items-list">
            <div class="order-item" *ngFor="let item of order.items">
              <img [src]="getProductImage(item.productId)" alt="Product">
              <div class="item-info">
                <strong>{{ getProductName(item.productId) }}</strong>
                <span class="text-muted text-sm">Qty: {{ item.quantity }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="drawer-actions mt-4" *ngIf="order.status === 'pending'">
          <button type="button" class="btn btn-primary w-100 generate-btn" 
                  [disabled]="isGenerating()"
                  (click)="generateBill(order.id)">
            <span *ngIf="!isGenerating()">
              <span class="material-symbols-outlined">receipt_long</span> Generate Bill & Update Stock
            </span>
            <span *ngIf="isGenerating()" class="loader"></span>
          </button>
        </div>
        
        <div class="success-message mt-4" *ngIf="showSuccessAnim()">
          <span class="material-symbols-outlined text-success" style="font-size: 3rem;">check_circle</span>
          <h4>Bill Generated Successfully</h4>
          <p class="text-muted">Inventory has been updated automatically.</p>
        </div>
      </div>
    </app-side-drawer>
  `,
  styles: [`
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      
      h2 { margin: 0; }
      p { margin: 0; }
    }
    
    .p-0 { padding: 0 !important; overflow: hidden; }
    
    .table {
      width: 100%;
      border-collapse: collapse;
      
      th, td {
        padding: 1rem 1.5rem;
        text-align: left;
        border-bottom: 1px solid rgba(0,0,0,0.05);
        vertical-align: middle;
      }
      
      th {
        background: #f8f9fa;
        color: var(--text-muted);
        font-weight: 600;
        text-transform: uppercase;
        font-size: 0.8rem;
        letter-spacing: 0.5px;
      }
      
      tbody tr.clickable-row {
        cursor: pointer;
        transition: var(--transition);
      }
      tbody tr:last-child td { border-bottom: none; }
      tbody tr.clickable-row:hover { background: rgba(0,0,0,0.02); }
    }
    
    .customer-info {
      display: flex;
      flex-direction: column;
      
      strong { font-size: 0.95rem; }
    }
    
    .status-banner {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.5rem;
      border-radius: var(--border-radius-md);
      
      span.material-symbols-outlined {
        font-size: 2rem;
      }
      
      .status-text {
        display: flex;
        flex-direction: column;
        
        strong { font-size: 1.1rem; }
        span { font-size: 0.85rem; color: var(--text-muted); }
      }
    }
    
    .bg-warning-light { background: rgba(255, 193, 7, 0.1); }
    .bg-success-light { background: rgba(40, 167, 69, 0.1); }
    .text-warning { color: #b38600; }
    
    .details-section {
      background: #f8f9fa;
      padding: 1.5rem;
      border-radius: var(--border-radius-md);
      
      h4 {
        margin-top: 0;
        margin-bottom: 1rem;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid rgba(0,0,0,0.05);
      }
      
      .detail-row {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        margin-bottom: 0.75rem;
        
        span.material-symbols-outlined {
          font-size: 1.25rem;
        }
        
        &:last-child { margin-bottom: 0; }
      }
    }
    
    .order-items-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    
    .order-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem;
      background: var(--surface);
      border: 1px solid rgba(0,0,0,0.05);
      border-radius: var(--border-radius-sm);
      
      img {
        width: 48px;
        height: 48px;
        border-radius: var(--border-radius-sm);
        object-fit: cover;
      }
      
      .item-info {
        display: flex;
        flex-direction: column;
      }
    }
    
    .w-100 { width: 100%; }
    .generate-btn {
      padding: 1rem;
      font-size: 1.1rem;
    }
    
    .loader {
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255,255,255,0.3);
      border-radius: 50%;
      border-top-color: #fff;
      animation: spin 1s ease-in-out infinite;
    }
    
    .success-message {
      text-align: center;
      padding: 2rem;
      animation: slideUp 0.3s ease-out;
      
      h4 { margin: 1rem 0 0.5rem; }
      p { margin: 0; }
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .mt-4 { margin-top: 1.5rem; }
    .text-sm { font-size: 0.8rem; }
    .py-4 { padding-top: 1.5rem; padding-bottom: 1.5rem; }
    .text-center { text-align: center; }
  `]
})
export class AdminOrdersComponent {
  dataService = inject(DataService);
  invoiceService = inject(InvoiceService);
  orders = this.dataService.orders;
  products = this.dataService.products;
  
  isDrawerOpen = signal(false);
  selectedOrder = signal<Order | null>(null);
  
  isGenerating = signal(false);
  showSuccessAnim = signal(false);

  getTotalItems(order: Order): number {
    return order.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  getProductName(productId: string): string {
    const prod = this.products().find(p => p.id === productId);
    return prod ? prod.name : 'Unknown Product';
  }
  
  getProductImage(productId: string): string {
    const prod = this.products().find(p => p.id === productId);
    return prod && prod.images.length ? prod.images[0] : '';
  }

  openOrderDetails(order: Order) {
    this.selectedOrder.set(order);
    this.isDrawerOpen.set(true);
    this.showSuccessAnim.set(false);
  }

  closeDrawer() {
    this.isDrawerOpen.set(false);
    setTimeout(() => {
      this.selectedOrder.set(null);
      this.showSuccessAnim.set(false);
    }, 300);
  }
  
  generateBill(orderId: string) {
    this.isGenerating.set(true);
    
    // Simulate API call and animation
    setTimeout(() => {
      this.dataService.generateBill(orderId);
      this.isGenerating.set(false);
      this.showSuccessAnim.set(true);
      
      // Update selected order reference to reflect completed status
      const updatedOrder = this.orders().find(o => o.id === orderId);
      if (updatedOrder) {
        this.selectedOrder.set(updatedOrder);
        // Generate PDF Invoice
        this.invoiceService.generateInvoice(updatedOrder, this.products());
      }
      
    }, 1500);
  }
}
