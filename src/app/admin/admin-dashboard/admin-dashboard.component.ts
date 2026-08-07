import { Component, inject, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../core/services/data.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  dataService = inject(DataService);

  isLoading = signal(true);
  skuSearchTerm = signal('');

  // ── Revenue Date Filter ───────────────────────────────────────
  revenueDateFilter = signal<string>('all'); // 'today', 'yesterday', 'this_week', 'this_month', 'all', 'custom'
  revenueFromDate   = signal<string>('');
  revenueToDate     = signal<string>('');

  // ── Revenue PIN Lock ──────────────────────────────────────────
  revenueUnlocked = signal(false);
  showPinModal    = signal(false);
  pinDigits       = signal<string[]>([]);
  pinError        = signal(false);
  pinSuccess      = signal(false);
  private readonly CORRECT_PIN = '1234';

  // ── Inline Stock Edit ─────────────────────────────────────────
  editingProductId  = signal<string | null>(null);
  editingStockValue = signal<any>(0);
  isSavingStock     = signal<string | null>(null);
  stockInputError   = signal<string>('');

  ngOnInit() {
    setTimeout(() => this.isLoading.set(false), 2000);
  }

  // ── Core Stats ────────────────────────────────────────────────
  totalProducts   = computed(() => this.dataService.products().length);
  totalCategories = computed(() => this.dataService.categories().length);

  pendingOrders = computed(() =>
    this.dataService.orders().filter(o => o.status === 'pending' && !o.billNumber).length
  );

  completedOrders = computed(() =>
    this.dataService.orders().filter(o => o.status === 'completed').length
  );

  // Billed orders = completed OR has billNumber (real sales)
  billedOrders = computed(() =>
    this.dataService.orders().filter(o => o.status === 'completed' || !!o.billNumber)
  );

  // Filtered billed orders for Revenue card based on date
  filteredRevenueOrders = computed(() => {
    let orders = this.billedOrders();
    const filter = this.revenueDateFilter();
    
    if (filter === 'all') return orders;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    if (filter === 'today') {
      orders = orders.filter(o => new Date(o.date).getTime() >= today.getTime());
    } else if (filter === 'yesterday') {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      orders = orders.filter(o => {
        const d = new Date(o.date).getTime();
        return d >= yesterday.getTime() && d < today.getTime();
      });
    } else if (filter === 'this_week') {
      orders = orders.filter(o => new Date(o.date).getTime() >= startOfWeek.getTime());
    } else if (filter === 'this_month') {
      orders = orders.filter(o => new Date(o.date).getTime() >= startOfMonth.getTime());
    } else if (filter === 'custom') {
      const from = this.revenueFromDate();
      const to = this.revenueToDate();
      if (from) {
        const fromTime = new Date(from).getTime();
        orders = orders.filter(o => new Date(o.date).getTime() >= fromTime);
      }
      if (to) {
        const toTime = new Date(to);
        toTime.setHours(23, 59, 59, 999);
        orders = orders.filter(o => new Date(o.date).getTime() <= toTime.getTime());
      }
    }
    
    return orders;
  });

  // Total revenue from filtered real billed orders
  totalRevenue = computed(() =>
    this.filteredRevenueOrders().reduce((sum, o) => sum + (o.totalAmount ?? o.subTotal ?? 0), 0)
  );

  // Recent Billed Orders (for the bottom right widget - not used currently but kept for potential future use)
  recentBilledOrders = computed(() => {
    return [...this.billedOrders()]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  });

  // Recent Pending Orders (for the bottom right widget)
  recentPendingOrders = computed(() => {
    return [...this.dataService.orders()]
      .filter(o => o.status === 'pending' && !o.billNumber)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  });

  // Low stock products
  lowStockProducts = computed(() => {
    let products = this.dataService.products().filter(p => p.stock < 1500);
    const term = this.skuSearchTerm().trim().toLowerCase();
    if (term) products = products.filter(p => p.sku.toLowerCase().includes(term));
    return products;
  });

  // ── Top Selling Items (name + qty only, no amount shown) ──────
  topSellingItems = computed(() => {
    const orders   = this.billedOrders();
    const products = this.dataService.products();
    const map = new Map<string, { totalSold: number; totalRevenue: number }>();
    for (const o of orders)
      for (const i of o.items) {
        const ex = map.get(i.productId) ?? { totalSold: 0, totalRevenue: 0 };
        map.set(i.productId, {
          totalSold:    ex.totalSold + (i.quantity || 0),
          totalRevenue: ex.totalRevenue + (i.total || i.quantity * (i.sellingRate || 0))
        });
      }
    return [...map.entries()]
      .map(([id, s]) => { const p = products.find(x => x.id === id); return p ? { ...p, ...s } : null; })
      .filter((p): p is NonNullable<typeof p> => !!p)
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, 5);
  });

  // ── Top 5 Customers (name + bill count only) ──────────────────
  topBuyers = computed(() => {
    const orders = this.billedOrders();
    const map = new Map<string, { name: string; phone: string; totalSpent: number; totalBills: number }>();
    for (const o of orders) {
      const key = o.uid || `${o.customerName}__${o.phone}`;
      const ex  = map.get(key) ?? { name: o.customerName, phone: o.phone, totalSpent: 0, totalBills: 0 };
      map.set(key, { ...ex, name: o.customerName, phone: o.phone,
        totalSpent: ex.totalSpent + (o.totalAmount ?? o.subTotal ?? 0),
        totalBills: ex.totalBills + 1 });
    }
    return [...map.values()].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5);
  });

  // ── PIN Methods ───────────────────────────────────────────────
  openPinModal() {
    this.pinDigits.set([]);
    this.pinError.set(false);
    this.pinSuccess.set(false);
    this.showPinModal.set(true);
  }

  closePinModal() {
    this.showPinModal.set(false);
    this.pinDigits.set([]);
    this.pinError.set(false);
  }

  pressPin(digit: string) {
    if (this.pinDigits().length >= 4) return;
    const next = [...this.pinDigits(), digit];
    this.pinDigits.set(next);
    this.pinError.set(false);
    if (next.length === 4) setTimeout(() => this.verifyPin(), 100);
  }

  backspacePin() {
    this.pinDigits.update(d => d.slice(0, -1));
    this.pinError.set(false);
  }

  verifyPin() {
    if (this.pinDigits().join('') === this.CORRECT_PIN) {
      this.pinSuccess.set(true);
      this.revenueUnlocked.set(true);
      setTimeout(() => this.closePinModal(), 600);
    } else {
      this.pinError.set(true);
      setTimeout(() => { this.pinDigits.set([]); this.pinError.set(false); }, 900);
    }
  }

  lockRevenue() { 
    this.revenueUnlocked.set(false); 
    this.setRevenueFilter('all');
  }

  // ── Revenue Filter Handlers ───────────────────────────────────
  setRevenueFilter(filter: string) {
    this.revenueDateFilter.set(filter);
    if (filter !== 'custom') {
      this.revenueFromDate.set('');
      this.revenueToDate.set('');
    }
  }

  // Current formatted date range for the UI
  currentRevenueDateRange = computed(() => {
    const filter = this.revenueDateFilter();
    if (filter === 'all') return 'All Time';
    
    const today = new Date();
    
    if (filter === 'today') {
      return today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    if (filter === 'yesterday') {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    if (filter === 'this_week') {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    if (filter === 'this_month') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return `${startOfMonth.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    if (filter === 'custom') {
      const from = this.revenueFromDate();
      const to = this.revenueToDate();
      if (!from && !to) return 'Custom Range';
      
      const fromStr = from ? new Date(from).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Start';
      const toStr = to ? new Date(to).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'End';
      return `${fromStr} - ${toStr}`;
    }
    return '';
  });

  // ── Stock Edit Methods ────────────────────────────────────────
  openStockEdit(productId: string, currentStock: number) {
    this.editingProductId.set(productId);
    this.editingStockValue.set(currentStock);
    this.stockInputError.set('');
  }

  cancelStockEdit() {
    this.editingProductId.set(null);
    this.editingStockValue.set(0);
    this.stockInputError.set('');
  }

  onStockValueChange(val: any) {
    const str = String(val ?? '').trim();
    if (!str) { this.editingStockValue.set('' as any); this.stockInputError.set('Value cannot be empty'); return; }
    const num = Number(str);
    if (isNaN(num)) { this.stockInputError.set('Enter a valid number'); return; }
    if (num < 0)    { this.editingStockValue.set('' as any); this.stockInputError.set('Value cannot be negative'); return; }
    if (!Number.isInteger(num)) { this.stockInputError.set('Only whole numbers allowed'); return; }
    this.editingStockValue.set(num);
    this.stockInputError.set('');
  }

  preventInvalidStockKey(event: KeyboardEvent) {
    if (['-', '+', 'e', 'E', ' ', '.'].includes(event.key)) event.preventDefault();
  }

  get isStockInputValid(): boolean {
    const v = this.editingStockValue();
    if (v === '' || v == null) return false;
    const n = Number(v);
    return !isNaN(n) && n >= 0 && Number.isInteger(n);
  }

  async saveStock(productId: string) {
    if (!this.isStockInputValid) return;
    this.isSavingStock.set(productId);
    try {
      await this.dataService.updateProduct(productId, { stock: Number(this.editingStockValue()) });
      this.editingProductId.set(null);
      this.stockInputError.set('');
    } catch (e) {
      this.stockInputError.set('Save failed. Try again.');
    } finally {
      this.isSavingStock.set(null);
    }
  }

  onStockInputKeydown(event: KeyboardEvent, productId: string) {
    if (event.key === 'Enter' && this.isStockInputValid) this.saveStock(productId);
    else if (event.key === 'Escape') this.cancelStockEdit();
  }
}
