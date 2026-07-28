import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DataService, Order } from '../../core/services/data.service';
import { InvoiceService } from '../../core/services/invoice.service';

@Component({
  selector: 'app-user-orders',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-orders.component.html',
  styleUrls: ['./user-orders.component.css']
})
export class UserOrdersComponent implements OnInit {
  router = inject(Router);
  private authService = inject(AuthService);
  private dataService = inject(DataService);
  private invoiceService = inject(InvoiceService);

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

  downloadBill(order: Order, event: Event) {
    event.stopPropagation();
    const products = this.dataService.products();
    this.invoiceService.generateInvoice(order, products, true);
  }
}
