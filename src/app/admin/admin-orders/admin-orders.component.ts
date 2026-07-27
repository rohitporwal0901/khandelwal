import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService, Order, StockCheckResult, OrderItem } from '../../core/services/data.service';
import { InvoiceService } from '../../core/services/invoice.service';
import { SideDrawerComponent } from '../../shared/side-drawer/side-drawer.component';

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CommonModule, SideDrawerComponent],
  templateUrl: './admin-orders.component.html',
  styleUrls: ['./admin-orders.component.css']
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
