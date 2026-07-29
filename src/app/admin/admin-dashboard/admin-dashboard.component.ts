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

  ngOnInit() {
    setTimeout(() => {
      this.isLoading.set(false);
    }, 2000);
  }

  totalProducts = computed(() => this.dataService.products().length);
  totalCategories = computed(() => this.dataService.categories().length);

  pendingOrders = computed(() =>
    this.dataService.orders().filter(o => o.status === 'pending' && !o.billNumber).length
  );

  completedOrders = computed(() =>
    this.dataService.orders().filter(o => o.status === 'completed').length
  );

  recentOrders = computed(() => {
    return [...this.dataService.orders()]
      .filter(o => o.status === 'pending' && !o.billNumber)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });

  lowStockProducts = computed(() => {
    let products = this.dataService.products().filter(p => p.stock < 1500);
    const term = this.skuSearchTerm().trim().toLowerCase();
    if (term) {
      products = products.filter(p => p.sku.toLowerCase().includes(term));
    }
    return products;
  });
}
