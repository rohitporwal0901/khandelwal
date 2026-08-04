import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService, Order, OrderItem, Product } from '../../core/services/data.service';

interface CustomerSalesSummary {
  customerName: string;
  customerUid?: string;
  billsCount: number;
  totalQty: number;
  totalAmount: number;
  bills: { id: string, date: string }[];
}

@Component({
  selector: 'app-admin-item-sales-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-item-sales-report.component.html',
  styleUrls: ['./admin-item-sales-report.component.css']
})
export class AdminItemSalesReportComponent implements OnInit {
  dataService = inject(DataService);

  // Filters State
  dateFilter = signal<string>('today');
  fromDate = signal<string>('');
  toDate = signal<string>('');
  
  // Item Selection
  showItemDropdown = signal(false);
  itemSearchTerm = signal<string>('');
  selectedItem = signal<Product | null>(null);

  // Customer Selection
  showCustomerDropdown = signal(false);
  customerSearchTerm = signal<string>('');
  selectedCustomerUid = signal<string>('');

  isLoading = signal<boolean>(true);

  // Filtered Products for Dropdown
  filteredProducts = computed(() => {
    const products = this.dataService.products();
    const search = this.itemSearchTerm().toLowerCase();
    if (!search) return products.slice(0, 50); // Show first 50
    return products.filter(p => 
      p.name.toLowerCase().includes(search) || 
      p.sku.toLowerCase().includes(search)
    ).slice(0, 50);
  });

  // Filtered Customers for Dropdown
  filteredCustomers = computed(() => {
    const orders = this.dataService.orders();
    // Get unique customers from orders (simplified logic)
    const custMap = new Map<string, {name: string, uid?: string, phone: string}>();
    orders.forEach(o => {
      const key = o.uid || o.customerName; // fallback to name if no uid
      if (!custMap.has(key)) {
        custMap.set(key, { name: o.customerName, uid: o.uid, phone: o.phone });
      }
    });
    
    const customers = Array.from(custMap.values());
    const search = this.customerSearchTerm().toLowerCase();
    
    if (!search) return customers;
    return customers.filter(c => c.name.toLowerCase().includes(search) || c.phone.includes(search));
  });

  // Main Report Computation
  reportData = computed(() => {
    const orders = this.dataService.orders();
    const item = this.selectedItem();
    const custUid = this.selectedCustomerUid();
    
    if (!item) {
      return {
        hasData: false,
        totalQty: 0,
        totalAmount: 0,
        totalCustomers: 0,
        customerBreakdown: [] as CustomerSalesSummary[]
      };
    }

    // 1. Filter by Date
    let filteredOrders = orders.filter(o => o.status === 'completed');
    const df = this.dateFilter();
    
    if (df !== 'all') {
      const now = new Date();
      if (df === 'today') {
        const todayStr = now.toISOString().split('T')[0];
        filteredOrders = filteredOrders.filter(o => o.date.startsWith(todayStr));
      } else if (df === 'yesterday') {
        const yest = new Date(now);
        yest.setDate(yest.getDate() - 1);
        const yestStr = yest.toISOString().split('T')[0];
        filteredOrders = filteredOrders.filter(o => o.date.startsWith(yestStr));
      } else if (df === 'this_week') {
        const firstDay = new Date(now.setDate(now.getDate() - now.getDay()));
        firstDay.setHours(0,0,0,0);
        filteredOrders = filteredOrders.filter(o => new Date(o.date) >= firstDay);
      } else if (df === 'this_month') {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        filteredOrders = filteredOrders.filter(o => new Date(o.date) >= monthStart);
      } else if (df === 'custom' && this.fromDate() && this.toDate()) {
        const start = new Date(this.fromDate());
        start.setHours(0,0,0,0);
        const end = new Date(this.toDate());
        end.setHours(23,59,59,999);
        filteredOrders = filteredOrders.filter(o => {
          const d = new Date(o.date);
          return d >= start && d <= end;
        });
      }
    }

    // 2. Filter by Customer if selected
    if (custUid) {
      filteredOrders = filteredOrders.filter(o => o.uid === custUid || o.customerName === custUid); // fallback matching
    }

    // 3. Aggregate Item Sales
    let totalQty = 0;
    let totalAmount = 0;
    const custSummaryMap = new Map<string, CustomerSalesSummary>();

    filteredOrders.forEach(order => {
      // check if order has this item
      const orderItem = order.items.find(i => i.productId === item.id);
      if (orderItem) {
        totalQty += orderItem.quantity;
        totalAmount += (orderItem.total || (orderItem.quantity * (orderItem.sellingRate || 0)));

        const custKey = order.uid || order.customerName;
        if (!custSummaryMap.has(custKey)) {
          custSummaryMap.set(custKey, {
            customerName: order.customerName,
            customerUid: order.uid,
            billsCount: 0,
            totalQty: 0,
            totalAmount: 0,
            bills: []
          });
        }
        const s = custSummaryMap.get(custKey)!;
        s.billsCount++;
        s.totalQty += orderItem.quantity;
        s.totalAmount += (orderItem.total || (orderItem.quantity * (orderItem.sellingRate || 0)));
        s.bills.push({ id: order.billNumber || order.id.substring(0, 8), date: order.date });
      }
    });

    const customerBreakdown = Array.from(custSummaryMap.values())
      .sort((a, b) => b.totalAmount - a.totalAmount);

    return {
      hasData: true,
      totalQty,
      totalAmount,
      totalCustomers: customerBreakdown.length,
      customerBreakdown
    };
  });

  ngOnInit() {
    // Initial fetch handled by DataService listeners
    setTimeout(() => {
      this.isLoading.set(false);
    }, 800);
  }

  // Actions
  setDateFilter(filter: string) {
    this.dateFilter.set(filter);
    if (filter !== 'custom') {
      this.fromDate.set('');
      this.toDate.set('');
    }
  }

  selectItem(product: Product | null) {
    this.selectedItem.set(product);
    this.showItemDropdown.set(false);
    if (product) {
      this.itemSearchTerm.set(`${product.name} - ${product.sku}`);
    } else {
      this.itemSearchTerm.set('');
      // Automatically clear customer filter when item is cleared
      this.selectCustomer('', '');
    }
  }

  selectCustomer(uidOrName: string, name?: string, phone?: string) {
    this.selectedCustomerUid.set(uidOrName);
    this.showCustomerDropdown.set(false);
    if (uidOrName) {
      let displayName = name || uidOrName;
      if (phone) displayName += ` - ${phone}`;
      this.customerSearchTerm.set(displayName);
    } else {
      this.customerSearchTerm.set('');
    }
  }

  resetFilters() {
    this.setDateFilter('today');
    this.selectItem(null);
    this.selectCustomer('', '');
  }

  formatDisplayDate(val: string): string {
    if (val === 'all') return 'All Time';
    return val.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }
}
