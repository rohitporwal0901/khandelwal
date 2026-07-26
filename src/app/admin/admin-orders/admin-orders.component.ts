import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService, Order, StockCheckResult, OrderItem } from '../../core/services/data.service';
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
        <tbody *ngIf="isLoading()">
          <tr *ngFor="let i of [1,2,3,4,5,6,7,8,9,10]">
            <td><div class="skeleton-text" style="width: 80px; height: 16px;"></div></td>
            <td>
              <div class="skeleton-text" style="width: 120px; height: 16px; margin-bottom: 4px;"></div>
              <div class="skeleton-text" style="width: 80px; height: 12px;"></div>
            </td>
            <td><div class="skeleton-text" style="width: 60px; height: 16px;"></div></td>
            <td><div class="skeleton-text" style="width: 80px; height: 16px;"></div></td>
            <td><div class="skeleton-text" style="width: 80px; height: 24px; border-radius: 12px;"></div></td>
          </tr>
        </tbody>
        <tbody *ngIf="!isLoading()">
          <tr *ngFor="let order of paginatedOrders()" (click)="openOrderDetails(order)" class="clickable-row">
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
              <span class="badge" 
                [ngClass]="order.status === 'pending' ? 'badge-warning' : order.status === 'cancelled' ? 'badge-error' : 'badge-success'">
                {{ order.status | titlecase }}
              </span>
            </td>
          </tr>
          <tr *ngIf="orders().length === 0">
            <td colspan="5" class="text-center text-muted py-4">No orders found.</td>
          </tr>
        </tbody>
      </table>
      
      <!-- Pagination Footer -->
      <div class="pagination-footer" *ngIf="!isLoading() && totalPages() > 1">
        <button class="btn btn-outline" (click)="prevPage()" [disabled]="currentPage() === 1">Previous</button>
        <span class="page-info">Page {{ currentPage() }} of {{ totalPages() }}</span>
        <button class="btn btn-outline" (click)="nextPage()" [disabled]="currentPage() === totalPages()">Next</button>
      </div>
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
        
        <div class="id-card-wrapper mt-4">
          <div class="id-card">
            <div class="id-card-header">
              <span class="material-symbols-outlined">badge</span>
              <h5>Customer Identity</h5>
            </div>
            <div class="id-card-body">
              <div class="id-card-photo">
                <div class="avatar">{{ order.customerName.charAt(0) | uppercase }}</div>
              </div>
              <div class="id-card-details">
                <div class="id-field">
                  <small>FULL NAME</small>
                  <strong>{{ order.customerName }}</strong>
                </div>
                <div class="id-field-group">
                  <div class="id-field">
                    <small>PHONE NUMBER</small>
                    <strong>{{ order.phone }}</strong>
                  </div>
                  <div class="id-field" *ngIf="order.email">
                    <small>EMAIL ADDRESS</small>
                    <strong>{{ order.email }}</strong>
                  </div>
                </div>
                <div class="id-field">
                  <small>DELIVERY ADDRESS</small>
                  <strong>{{ order.address }}</strong>
                </div>
                <div class="id-field" *ngIf="order.notes">
                  <small>ADDITIONAL NOTES</small>
                  <strong>{{ order.notes }}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="details-section mt-4">
          <h4>Ordered Items</h4>
          <div class="order-items-list">
            <div class="order-item" *ngFor="let item of order.items">
              <img [src]="getProductImage(item.productId)" alt="Product">
              <div class="item-info">
                <strong>{{ getProductName(item.productId) }}</strong>
                <span class="text-muted text-sm d-block mt-1">Code: <strong>{{ getProductSku(item.productId) }}</strong></span>
              </div>
              <div class="item-actions">
                <span class="badge badge-warning">Qty: {{ item.quantity }}</span>
                <button class="btn-delete" *ngIf="order.status === 'pending'" (click)="initRemoveItem(order, item)" title="Remove Item">
                  <span class="material-symbols-outlined">delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div class="drawer-actions mt-4" *ngIf="order.status === 'pending'">
          <button type="button" class="btn btn-primary w-100 generate-btn" 
                  *ngIf="order.items.length > 0"
                  [disabled]="isGenerating()"
                  (click)="onGenerateBillClick(order)">
            <span *ngIf="!isGenerating()">
              <span class="material-symbols-outlined">receipt_long</span> Generate Bill & Update Stock
            </span>
            <span *ngIf="isGenerating()" class="loader"></span>
          </button>

          <button type="button" class="btn w-100 generate-btn" style="background: var(--error); color: white;"
                  *ngIf="order.items.length === 0"
                  [disabled]="isCancelling()"
                  (click)="confirmCancelEmptyOrder(order)">
            <span *ngIf="!isCancelling()">
              <span class="material-symbols-outlined">cancel</span> No Items Left - Cancel Order
            </span>
            <span *ngIf="isCancelling()" class="loader"></span>
          </button>
        </div>

        <div class="cancelled-banner mt-4" *ngIf="order.status === 'cancelled'">
          <span class="material-symbols-outlined" style="color: var(--error); font-size: 2rem;">cancel</span>
          <h4 style="color: var(--error);">Order Cancelled</h4>
          <p class="text-muted" *ngIf="order.cancellationReason">Reason: {{ order.cancellationReason }}</p>
        </div>
        
        <div class="success-message mt-4" *ngIf="showSuccessAnim()">
          <span class="material-symbols-outlined text-success" style="font-size: 3rem;">check_circle</span>
          <h4>Bill Generated Successfully</h4>
          <p class="text-muted">Inventory has been updated automatically.</p>
        </div>
      </div>
    </app-side-drawer>

    <!-- Stock Warning Modal -->
    <div class="modal-overlay" *ngIf="showStockWarning()" (click)="closeStockWarning()">
      <div class="stock-warning-modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <span class="material-symbols-outlined" style="color: var(--warning); font-size: 2.5rem;">warning</span>
          <h3>Insufficient Stock!</h3>
          <p class="text-muted">The following items don't have enough stock to fulfill this order:</p>
        </div>
        <div class="modal-body">
          <div class="stock-issue-row" *ngFor="let issue of stockIssues()">
            <div>
              <strong>{{ issue.productName }}</strong>
            </div>
            <div class="stock-numbers">
              <span class="badge badge-error">Ordered: {{ issue.ordered }}</span>
              <span class="badge badge-warning">Available: {{ issue.available }}</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" (click)="closeStockWarning()">Go Back</button>
          <button class="btn" style="background: var(--error); color: white;" 
                  [disabled]="isCancelling()" (click)="confirmCancelOrder()">
            <span *ngIf="!isCancelling()">Cancel This Order</span>
            <span *ngIf="isCancelling()" class="loader"></span>
          </button>
        </div>
      </div>
    </div>

    <!-- Remove Item Modal -->
    <div class="modal-overlay" *ngIf="itemToRemove()" (click)="cancelRemoveItem()">
      <div class="stock-warning-modal confirm-modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <span class="material-symbols-outlined" style="color: var(--error); font-size: 2.5rem;">delete</span>
          <h3>Remove Item?</h3>
          <p class="text-muted">Are you sure you want to remove this item from the order?</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" (click)="cancelRemoveItem()">No, Keep it</button>
          <button class="btn" style="background: var(--error); color: white;" 
                  [disabled]="isRemovingItem()" (click)="confirmRemoveItemAction()">
            <span *ngIf="!isRemovingItem()">Yes, Delete</span>
            <span *ngIf="isRemovingItem()" class="loader"></span>
          </button>
        </div>
      </div>
    </div>
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
      
      .order-item {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
        background: #fff;
        border: 1px solid rgba(0,0,0,0.08);
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.02);
        transition: all 0.2s ease;
        
        &:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          transform: translateY(-1px);
        }
        
        img {
          width: 50px;
          height: 50px;
          object-fit: cover;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          flex-shrink: 0;
        }
        
        .item-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0; /* Fixes flexbox text truncation */
          
          strong {
            font-size: 0.95rem;
            color: #1e293b;
            line-height: 1.3;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          
          .text-muted {
            font-size: 0.8rem;
            color: #64748b;
            margin-top: 0.25rem;
          }
        }

        .item-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-shrink: 0;
          
          .badge {
            font-size: 0.85rem;
            padding: 0.35rem 0.6rem;
            white-space: nowrap;
          }
          
          .btn-delete {
            color: #ef4444;
            background: rgba(239, 68, 68, 0.1);
            border: none;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s;
            
            &:hover {
              background: #ef4444;
              color: white;
              transform: scale(1.05);
            }
            
            span {
              font-size: 1.1rem;
            }
          }
        }
      }
    }
    
    .id-card-wrapper {
      margin-top: 1.5rem;
    }
    
    .id-card {
      background: linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%);
      border: 1px solid rgba(0,0,0,0.1);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(0,0,0,0.05);
    }
    
    .id-card-header {
      background: #0f172a; /* Premium Dark Slate */
      color: white;
      padding: 12px 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      
      h5 {
        margin: 0;
        font-weight: 500;
        font-size: 1.05rem;
        letter-spacing: 0.5px;
        color: white;
      }
      
      span {
        font-size: 1.3rem;
        color: white;
      }
    }
    
    .id-card-body {
      display: flex;
      padding: 20px;
      gap: 20px;
    }
    
    .id-card-photo {
      flex-shrink: 0;
      
      .avatar {
        width: 70px;
        height: 70px;
        background: #f1f5f9;
        color: #334155;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2.2rem;
        font-weight: 600;
        border-radius: 10px;
        border: 2px solid #e2e8f0;
        box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
      }
    }
    
    .id-card-details {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    
    .id-field-group {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    }
    
    .id-field {
      display: flex;
      flex-direction: column;
      
      small {
        font-size: 0.7rem;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 4px;
        font-weight: 600;
      }
      
      strong {
        font-size: 1rem;
        color: #1e293b;
        line-height: 1.4;
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
    
    /* Skeleton Loading Styles */
    .skeleton-text {
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: skeletonLoading 1.5s infinite;
      border-radius: 4px;
    }
    @keyframes skeletonLoading {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    
    .pagination-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      border-top: 1px solid rgba(0,0,0,0.05);
      background: var(--surface);
      
      .page-info {
        font-weight: 500;
        color: var(--text-muted);
        font-size: 0.9rem;
      }
    }
    .cancelled-banner {
      text-align: center;
      padding: 2rem;
      background: rgba(220, 53, 69, 0.05);
      border-radius: 12px;
      border: 1px dashed var(--error);
      
      h4 { margin: 0.5rem 0; }
      p { margin: 0; }
    }

    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.5);
      backdrop-filter: blur(4px);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      animation: fadeIn 0.2s ease;
    }

    .stock-warning-modal {
      background: white;
      border-radius: 16px;
      width: 100%;
      max-width: 480px;
      box-shadow: 0 25px 50px rgba(0,0,0,0.2);
      animation: slideUp 0.25s ease-out;
      overflow: hidden;

      .modal-header {
        padding: 2rem 2rem 1rem;
        text-align: center;
        border-bottom: 1px solid rgba(0,0,0,0.06);
        h3 { margin: 0.5rem 0 0.25rem; }
        p { margin: 0; font-size: 0.9rem; }
      }

      .modal-body {
        padding: 1.5rem 2rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .stock-issue-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem 1rem;
        background: #fef9f9;
        border: 1px solid rgba(220,53,69,0.15);
        border-radius: 8px;

        .stock-numbers {
          display: flex;
          gap: 0.5rem;
        }
      }

      .modal-footer {
        padding: 1.25rem 2rem;
        display: flex;
        gap: 1rem;
        border-top: 1px solid rgba(0,0,0,0.06);

        button { flex: 1; }
      }
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `]
})
export class AdminOrdersComponent implements OnInit {
  dataService = inject(DataService);
  invoiceService = inject(InvoiceService);
  orders = computed(() => this.dataService.orders().filter(o => o.billType !== 'admin_pos'));
  products = this.dataService.products;
  
  isDrawerOpen = signal(false);
  selectedOrder = signal<Order | null>(null);
  
  isGenerating = signal(false);
  showSuccessAnim = signal(false);
  showStockWarning = signal(false);
  stockIssues = signal<StockCheckResult['issues']>([]);
  isCancelling = signal(false);
  pendingBillOrderId = signal<string | null>(null);
  
  itemToRemove = signal<{order: Order, item: OrderItem} | null>(null);
  isRemovingItem = signal(false);
  
  isLoading = signal(true);
  currentPage = signal(1);
  itemsPerPage = signal(10);
  
  ngOnInit() {
    setTimeout(() => {
      this.isLoading.set(false);
    }, 2000);
  }
  
  paginatedOrders = computed(() => {
    // Sort orders by date descending (newest first)
    const sorted = [...this.orders()].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    return sorted.slice(start, start + this.itemsPerPage());
  });
  
  totalPages = computed(() => Math.ceil(this.orders().length / this.itemsPerPage()) || 1);
  
  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
    }
  }
  
  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  getTotalItems(order: Order): number {
    return order.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  getProductName(productId: string): string {
    const prod = this.products().find(p => p.id === productId);
    return prod ? prod.name : 'Unknown Product';
  }
  
  getProductSku(productId: string): string {
    const prod = this.products().find(p => p.id === productId);
    return prod ? prod.sku : 'N/A';
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
  
  async onGenerateBillClick(order: Order) {
    this.isGenerating.set(true);
    const result = await this.dataService.checkStockForOrder(order.id);
    this.isGenerating.set(false);

    if (!result.sufficient) {
      // Show warning modal
      this.stockIssues.set(result.issues);
      this.pendingBillOrderId.set(order.id);
      this.showStockWarning.set(true);
      return;
    }

    // Stock OK — proceed with bill
    await this.generateBill(order.id);
  }

  closeStockWarning() {
    this.showStockWarning.set(false);
    this.stockIssues.set([]);
    this.pendingBillOrderId.set(null);
  }

  async confirmCancelOrder() {
    const orderId = this.pendingBillOrderId();
    if (!orderId) return;

    this.isCancelling.set(true);
    const reason = `Insufficient stock: ${this.stockIssues().map(i => `${i.productName} (ordered ${i.ordered}, available ${i.available})`).join(', ')}`;
    await this.dataService.cancelOrder(orderId, reason);
    this.isCancelling.set(false);
    this.closeStockWarning();
    this.closeDrawer();
  }

  initRemoveItem(order: Order, item: OrderItem) {
    this.itemToRemove.set({order, item});
  }

  cancelRemoveItem() {
    this.itemToRemove.set(null);
  }

  async confirmRemoveItemAction() {
    const data = this.itemToRemove();
    if (!data) return;
    
    this.isRemovingItem.set(true);
    try {
      const updatedItems = data.order.items.filter(i => i.productId !== data.item.productId);
      await this.dataService.updateOrder(data.order.id, { items: updatedItems });
      
      // Also update selectedOrder locally to reflect change instantly in the drawer
      const newSelectedOrder = {...data.order, items: updatedItems};
      this.selectedOrder.set(newSelectedOrder);
    } catch (e) {
      console.error('Error removing item:', e);
    } finally {
      this.isRemovingItem.set(false);
      this.cancelRemoveItem();
    }
  }

  async confirmCancelEmptyOrder(order: Order) {
    this.isCancelling.set(true);
    try {
      const reason = 'All items were removed from the order before generating bill.';
      await this.dataService.cancelOrder(order.id, reason);
      
      const newSelectedOrder = {...order, status: 'cancelled' as const, cancellationReason: reason};
      this.selectedOrder.set(newSelectedOrder);
    } catch (error) {
      console.error('Error cancelling order:', error);
    } finally {
      this.isCancelling.set(false);
      setTimeout(() => {
        this.closeDrawer();
      }, 2000);
    }
  }

  async generateBill(orderId: string) {
    this.isGenerating.set(true);
    
    try {
      await this.dataService.generateBill(orderId);
      
      this.isGenerating.set(false);
      this.showSuccessAnim.set(true);
      
      // Update selected order reference to reflect completed status
      const updatedOrder = this.orders().find(o => o.id === orderId);
      if (updatedOrder) {
        this.selectedOrder.set(updatedOrder);
        // Generate PDF Invoice
        this.invoiceService.generateInvoice(updatedOrder, this.products());
      }
      
      // Auto close drawer after showing success animation
      setTimeout(() => {
        this.closeDrawer();
      }, 1500);
    } catch (error) {
      console.error(error);
      this.isGenerating.set(false);
    }
  }
}
