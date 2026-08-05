import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService, Order, OrderItem, Product } from '../../core/services/data.service';
import { InvoiceService } from '../../core/services/invoice.service';
import { AuthService, UserProfile } from '../../core/services/auth.service';
import { SideDrawerComponent } from '../../shared/side-drawer/side-drawer.component';

@Component({
  selector: 'app-admin-old-bills',
  standalone: true,
  imports: [CommonModule, FormsModule, SideDrawerComponent],
  templateUrl: './admin-old-bills.component.html',
  styleUrls: ['./admin-old-bills.component.css']
})
export class AdminOldBillsComponent implements OnInit {
  dataService = inject(DataService);
  invoiceService = inject(InvoiceService);
  authService = inject(AuthService);

  Math = Math;

  // Filters
  dateFilter = signal<'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_month' | 'custom'>('today');
  fromDate = signal<string>('');
  toDate = signal<string>('');
  selectedCustomerUid = signal<string>('');
  customerSearchTerm = signal<string>('');
  showCustomerDropdown = signal<boolean>(false);
  searchBillNo = signal<string>('');

  customers = signal<UserProfile[]>([]);
  isLoading = signal(true);
  isFetchingData = signal(true);

  // Edit Bill Drawer States
  isDrawerOpen = signal(false);
  isGenerating = signal(false);
  showSuccessAnim = signal(false);

  editableItems = signal<OrderItem[]>([]);
  badha = signal(0);
  originalPreviousBalance = signal(0);

  // Discount signals
  applyDiscount   = signal<boolean>(false);
  billDiscountPct = signal<number>(0);

  currentCustomerBalance = computed(() => {
    const order = this.selectedOrder();
    if (!order || !order.uid) return 0;
    const cust = this.customers().find(c => c.uid === order.uid);
    return cust?.balance || 0;
  });

  subTotal = computed(() => {
    return this.editableItems().reduce((sum, item) => sum + (item.quantity * (item.sellingRate || 0)), 0);
  });

  discountableSubtotal = computed(() => {
    return this.editableItems().reduce((sum, item) => {
      const prod = this.dataService.products().find(p => p.id === item.productId);
      if (prod?.noDiscount) return sum;
      return sum + (item.quantity * (item.sellingRate || 0));
    }, 0);
  });

  discountAmount = computed(() => {
    if (!this.applyDiscount()) return 0;
    const pct = Math.min(100, Math.max(0, Number(this.billDiscountPct()) || 0));
    return Math.round((this.discountableSubtotal() * pct) / 100 * 100) / 100;
  });

  totalBillAmount = computed(() => this.subTotal() - this.discountAmount() + this.badha());
  netPayable = computed(() => this.originalPreviousBalance() + this.totalBillAmount());

  productSearchTerm = signal('');
  showProductDropdownDrawer = signal(false);

  filteredProductsDrawer = computed(() => {
    const term = this.productSearchTerm().toLowerCase().trim();
    if (!term) return [];
    return this.dataService.products().filter(p =>
      p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term)
    ).slice(0, 8);
  });
  // Selection state
  selectedDateStr = signal<string>('');
  selectedOrder = signal<Order | null>(null);

  async ngOnInit() {
    this.setDefaultDates('today');
    await this.fetchCustomers();
    this.applyFilters();
    // Auto-select first date and order if available
    setTimeout(() => {
      const dates = this.allDatesInFilter();
      if (dates.length > 0) {
        this.selectedDateStr.set(dates[0].dateStr);
        const bills = this.billsForSelectedDate();
        if (bills.length > 0) {
          this.selectedOrder.set(bills[0]);
        }
      }
    }, 500);

    // Full page loader for 2 seconds on navigation
    setTimeout(() => {
      this.isLoading.set(false);
    }, 2000);
  }

  async fetchCustomers() {
    try {
      const users = await this.authService.getAllUsers();
      // Only keep wholesale customers or those who have placed orders
      this.customers.set(users);
    } catch (e) {
      console.error('Error fetching customers:', e);
    }
  }

  setDefaultDates(filter: string) {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (filter) {
      case 'today':
        break;
      case 'yesterday':
        start.setDate(start.getDate() - 1);
        end.setDate(end.getDate() - 1);
        break;
      case 'this_week':
        start.setDate(today.getDate() - today.getDay());
        break;
      case 'this_month':
        start.setDate(1);
        break;
      case 'last_month':
        start.setMonth(today.getMonth() - 1);
        start.setDate(1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
    }

    if (filter !== 'custom') {
      this.fromDate.set(start.toISOString().split('T')[0]);
      this.toDate.set(end.toISOString().split('T')[0]);
    }
  }

  setDateFilter(filter: 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_month' | 'custom') {
    this.dateFilter.set(filter);
    if (filter !== 'custom') {
      this.setDefaultDates(filter);
      this.applyFilters();
    }
  }

  applyFilters() {
    this.isFetchingData.set(true);
    // Simulate loading for UI responsiveness
    setTimeout(() => {
      this.isFetchingData.set(false);

      // Auto-select the first available date and bill when filters change
      const dates = this.allDatesInFilter();
      if (dates.length > 0) {
        this.selectedDateStr.set(dates[0].dateStr);
        if (dates[0].bills && dates[0].bills.length > 0) {
          this.selectedOrder.set(dates[0].bills[0]);
        } else {
          this.selectedOrder.set(null);
        }
      } else {
        this.selectedDateStr.set('');
        this.selectedOrder.set(null);
      }
    }, 400);
  }

  filteredCustomers = computed(() => {
    const term = this.customerSearchTerm().toLowerCase().trim();
    if (!term) return this.customers();
    return this.customers().filter(c =>
      c.name.toLowerCase().includes(term) ||
      c.phone.includes(term) ||
      (c.address && c.address.toLowerCase().includes(term))
    );
  });

  selectCustomer(custUid: string) {
    this.selectedCustomerUid.set(custUid);
    this.showCustomerDropdown.set(false);
    if (custUid) {
      const c = this.customers().find(x => x.uid === custUid);
      if (c) {
        this.customerSearchTerm.set(c.name);
      }
    } else {
      this.customerSearchTerm.set('');
    }
    this.applyFilters();
  }

  getSelectedCustomerName(): string {
    const uid = this.selectedCustomerUid();
    if (!uid) return 'All Customers';
    const c = this.customers().find(x => x.uid === uid);
    return c ? `${c.name} (${c.phone})` : 'All Customers';
  }

  filteredOrders = computed(() => {
    // Get all completed/billed orders
    let list = this.dataService.orders().filter(o => o.status === 'completed' || o.billNumber);

    // Date filter
    const from = new Date(this.fromDate()).getTime();
    const to = new Date(this.toDate());
    to.setHours(23, 59, 59, 999);
    const toTime = to.getTime();

    list = list.filter(o => {
      const t = new Date(o.date).getTime();
      return t >= from && t <= toTime;
    });

    // Customer filter
    const custUid = this.selectedCustomerUid();
    if (custUid) {
      list = list.filter(o => o.uid === custUid);
    }

    // Search filter
    const search = this.searchBillNo().trim().toLowerCase();
    if (search) {
      list = list.filter(o => (o.billNumber || '').toLowerCase().includes(search));
    }

    // Sort descending by date
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return list;
  });

  // Generate all dates in the selected range (descending)
  allDatesInFilter = computed(() => {
    const list = this.filteredOrders();
    const from = new Date(this.fromDate());
    from.setHours(0, 0, 0, 0);
    const to = new Date(this.toDate());
    to.setHours(23, 59, 59, 999);

    // Create a map of dateStr -> bills
    const billsByDate = new Map<string, Order[]>();
    list.forEach(order => {
      const d = new Date(order.date);
      const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
      if (!billsByDate.has(dateStr)) {
        billsByDate.set(dateStr, []);
      }
      billsByDate.get(dateStr)!.push(order);
    });

    const dates = [];
    // Generate dates from 'to' down to 'from'
    let current = new Date(to);
    while (current >= from) {
      const dateStr = current.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
      dates.push({
        dateStr,
        bills: billsByDate.get(dateStr) || [],
        count: billsByDate.has(dateStr) ? billsByDate.get(dateStr)!.length : 0
      });
      current.setDate(current.getDate() - 1);
    }
    return dates;
  });

  billsForSelectedDate = computed(() => {
    const selDate = this.selectedDateStr();
    if (!selDate) return [];
    const dateObj = this.allDatesInFilter().find(d => d.dateStr === selDate);
    return dateObj ? dateObj.bills : [];
  });

  selectDate(dateStr: string) {
    this.selectedDateStr.set(dateStr);
    const bills = this.billsForSelectedDate();
    if (bills.length > 0) {
      this.selectedOrder.set(bills[0]);
    } else {
      this.selectedOrder.set(null);
    }
  }

  // Summaries
  totalBills = computed(() => this.filteredOrders().length);
  totalAmount = computed(() => {
    return this.filteredOrders().reduce((sum, o) => {
      return sum + (o.totalAmount !== undefined ? o.totalAmount : ((o.subTotal || 0) + (o.badha || 0)));
    }, 0);
  });

  openBillDetails(order: Order) {
    this.selectedOrder.set(order);
  }

  getProductName(productId: string): string {
    const prod = this.dataService.products().find(p => p.id === productId);
    return prod ? prod.name : 'Product';
  }

  getProductSku(productId: string): string {
    const prod = this.dataService.products().find(p => p.id === productId);
    return prod ? prod.sku : '';
  }

  getTotalItems(order: Order): number {
    return order.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  printBill(order: Order, event: Event) {
    event.stopPropagation();
    const products = this.dataService.products();
    this.invoiceService.generateInvoice(order, products, false); // false = autoPrint mode
  }

  downloadPdf(order: Order, event: Event) {
    event.stopPropagation();
    const products = this.dataService.products();
    this.invoiceService.generateInvoice(order, products, true); // true = direct download
  }

  // --- Edit Bill Drawer Methods ---

  openEditDrawer(order: Order) {
    this.isDrawerOpen.set(true);
    this.showSuccessAnim.set(false);
    
    // Copy order state
    this.editableItems.set(order.items.map(i => ({...i})));
    this.badha.set(order.badha || 0);
    this.originalPreviousBalance.set(order.previousBalance || 0);

    // Apply old discount values if they exist on the bill
    if (order.discountPercent && order.discountPercent > 0) {
      this.applyDiscount.set(true);
      this.billDiscountPct.set(order.discountPercent);
    } else {
      this.applyDiscount.set(false);
      this.billDiscountPct.set(0);
    }
  }

  closeDrawer() {
    this.isDrawerOpen.set(false);
    setTimeout(() => {
      this.showSuccessAnim.set(false);
      this.editableItems.set([]);
    }, 300);
  }

  getProductStock(productId: string): number {
    const product = this.dataService.products().find(p => p.id === productId);
    return product ? product.stock : 0;
  }

  getAvailableStockForEdit(productId: string): number {
    const currentStock = this.getProductStock(productId);
    
    const order = this.selectedOrder();
    let originalQty = 0;
    if (order && order.items) {
      const originalItem = order.items.find(i => i.productId === productId);
      if (originalItem) {
        originalQty = originalItem.quantity;
      }
    }
    
    return currentStock + originalQty;
  }
  
  hasInvalidItems(): boolean {
    if (!this.selectedOrder()) return false;
    if (this.editableItems().length === 0) return true;
    return this.editableItems().some(item =>
      !item.quantity ||
      item.quantity <= 0 ||
      item.sellingRate === undefined ||
      item.sellingRate === null ||
      item.sellingRate < 0 ||
      item.quantity > this.getAvailableStockForEdit(item.productId)
    );
  }
  
  getProductCost(productId: string): number {
    const prod = this.dataService.products().find(p => p.id === productId);
    return prod ? (prod.purchaseRate || 0) : 0;
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

  removeItem(index: number) {
    this.editableItems.update(items => items.filter((_, i) => i !== index));
  }

  addProductToBill(product: Product) {
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
    this.showProductDropdownDrawer.set(false);
  }

  async updateBill() {
    const order = this.selectedOrder();
    if (!order) return;
    
    this.isGenerating.set(true);

    try {
      const updatedItems = this.editableItems().map(item => ({
        ...item,
        total: item.quantity * (item.sellingRate || 0)
      }));

      const billingSummary = {
        subTotal: this.subTotal(),
        badha: this.badha(),
        totalAmount: this.totalBillAmount(),
        previousBalance: this.originalPreviousBalance(),
        netPayable: this.netPayable(),
        discountPercent: this.applyDiscount() ? (Number(this.billDiscountPct()) || 0) : 0,
        discountAmount: this.discountAmount()
      };

      const updatedOrder = await this.dataService.updateGeneratedBill(order.id, updatedItems, billingSummary);
      
      this.isGenerating.set(false);
      this.showSuccessAnim.set(true);

      if (updatedOrder) {
        this.selectedOrder.set(updatedOrder);
      }

      setTimeout(() => {
        this.closeDrawer();
      }, 1500);

    } catch (error) {
      console.error(error);
      this.isGenerating.set(false);
    }
  }
}
