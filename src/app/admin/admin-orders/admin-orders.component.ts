import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService, Order, StockCheckResult, OrderItem, Product } from '../../core/services/data.service';
import { InvoiceService } from '../../core/services/invoice.service';
import { AuthService } from '../../core/services/auth.service';
import { SideDrawerComponent } from '../../shared/side-drawer/side-drawer.component';

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, SideDrawerComponent],
  templateUrl: './admin-orders.component.html',
  styleUrls: ['./admin-orders.component.css']
})
export class AdminOrdersComponent implements OnInit {
  dataService = inject(DataService);
  invoiceService = inject(InvoiceService);
  authService = inject(AuthService);
  orders = computed(() => this.dataService.orders().filter(o => o.billType !== 'admin_pos' && o.status === 'pending'));
  products = this.dataService.products;

  isDrawerOpen = signal(false);
  selectedOrder = signal<Order | null>(null);

  isGenerating = signal(false);
  showSuccessAnim = signal(false);
  showStockWarning = signal(false);
  stockIssues = signal<StockCheckResult['issues']>([]);
  isCancelling = signal(false);
  pendingBillOrderId = signal<string | null>(null);

  itemToRemove = signal<{ order: Order, item: OrderItem } | null>(null);
  isRemovingItem = signal(false);

  // Billing States
  editableItems = signal<OrderItem[]>([]);
  badha = signal(0);
  customerBalance = signal(0);

  // Computed Billing Totals
  subTotal = computed(() => {
    return this.editableItems().reduce((sum, item) => sum + (item.quantity * (item.sellingRate || 0)), 0);
  });
  totalAmount = computed(() => this.subTotal() + this.badha());
  netPayable = computed(() => this.customerBalance() + this.totalAmount());

  // Product Search State
  productSearchTerm = signal('');
  showProductDropdown = signal(false);

  filteredProducts = computed(() => {
    const term = this.productSearchTerm().toLowerCase().trim();
    if (!term) return [];
    return this.products().filter(p =>
      p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term)
    ).slice(0, 8); // Show up to 8 matching products
  });

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
    const sorted = [...this.orders()].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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

  getProductCost(productId: string): number {
    const prod = this.products().find(p => p.id === productId);
    return prod ? (prod.purchaseRate || 0) : 0;
  }

  async openOrderDetails(order: Order) {
    this.selectedOrder.set(order);
    this.isDrawerOpen.set(true);
    this.showSuccessAnim.set(false);

    // Initialize Editable Items with proper default selling and purchase rates
    this.editableItems.set(order.items.map(item => {
      const p = this.products().find(prod => prod.id === item.productId);
      return {
        ...item,
        sellingRate: item.sellingRate || (p ? p.sellingRate : 0),
        purchaseRate: item.purchaseRate || (p ? p.purchaseRate : 0)
      };
    }));
    this.badha.set(0);

    // Fetch Customer Balance
    if (order.uid) {
      try {
        const users = await this.authService.getAllUsers();
        const user = users.find(u => u.uid === order.uid);
        this.customerBalance.set(user?.balance || 0);
      } catch (e) {
        console.error('Error fetching balance:', e);
        this.customerBalance.set(0);
      }
    } else {
      this.customerBalance.set(0);
    }
  }

  closeDrawer() {
    this.isDrawerOpen.set(false);
    setTimeout(() => {
      this.selectedOrder.set(null);
      this.showSuccessAnim.set(false);
    }, 300);
  }

  getProductStock(productId: string): number {
    const product = this.products().find(p => p.id === productId);
    return product ? product.stock : 0;
  }

  updateItemQty(index: number, newQty: number) {
    this.editableItems.update(items => {
      items[index].quantity = newQty;
      return [...items];
    });
  }

  updateItemRate(index: number, newRate: number) {
    this.editableItems.update(items => {
      items[index].sellingRate = newRate;
      return [...items];
    });
  }

  hasInvalidItems(): boolean {
    if (this.selectedOrder()?.status !== 'pending') return false;
    return this.editableItems().some(item =>
      !item.quantity ||
      item.quantity <= 0 ||
      !item.sellingRate ||
      item.sellingRate < 0 ||
      item.quantity > this.getProductStock(item.productId)
    );
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
    this.itemToRemove.set({ order, item });
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
      const newSelectedOrder = { ...data.order, items: updatedItems };
      this.selectedOrder.set(newSelectedOrder);
      this.editableItems.set(updatedItems.map(item => {
        const p = this.products().find(prod => prod.id === item.productId);
        return {
          ...item,
          sellingRate: item.sellingRate || (p ? p.sellingRate : 0),
          purchaseRate: item.purchaseRate || (p ? p.purchaseRate : 0)
        };
      }));
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

      const newSelectedOrder = { ...order, status: 'cancelled' as const, cancellationReason: reason };
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

  addProductToBill(product: Product) {
    if (this.selectedOrder()?.status !== 'pending') return;

    const items = [...this.editableItems()];
    const existing = items.find(i => i.productId === product.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      items.unshift({
        productId: product.id,
        quantity: 1,
        sellingRate: product.sellingRate || 0,
        purchaseRate: product.purchaseRate || 0
      });
    }
    this.editableItems.set(items);
    this.productSearchTerm.set(product.name);
    this.showProductDropdown.set(false);
  }

  async generateBill(orderId: string) {
    this.isGenerating.set(true);

    try {
      // Calculate totals for items
      const updatedItems = this.editableItems().map(item => ({
        ...item,
        total: item.quantity * (item.sellingRate || 0)
      }));

      const billingSummary = {
        subTotal: this.subTotal(),
        badha: this.badha(),
        totalAmount: this.totalAmount(),
        previousBalance: this.customerBalance(),
        netPayable: this.netPayable()
      };

      const completedOrder = await this.dataService.generateBill(orderId, updatedItems, billingSummary);

      this.isGenerating.set(false);
      this.showSuccessAnim.set(true);

      // Update selected order reference and generate PDF Invoice
      if (completedOrder) {
        this.selectedOrder.set(completedOrder);
        this.invoiceService.generateInvoice(completedOrder, this.products());
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
