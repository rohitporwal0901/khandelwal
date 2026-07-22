import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../core/services/data.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-header">
      <h2>Dashboard Overview</h2>
      <button class="btn btn-primary">
        <span class="material-symbols-outlined">download</span> Export Report
      </button>
    </div>
    
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon bg-primary-light">
          <span class="material-symbols-outlined text-primary">inventory_2</span>
        </div>
        <div class="stat-info">
          <h3>{{ totalProducts() }}</h3>
          <p>Total Products</p>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon bg-secondary-light">
          <span class="material-symbols-outlined text-secondary">category</span>
        </div>
        <div class="stat-info">
          <h3>{{ totalCategories() }}</h3>
          <p>Categories</p>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon bg-warning-light">
          <span class="material-symbols-outlined text-warning" style="color: #b38600">pending_actions</span>
        </div>
        <div class="stat-info">
          <h3>{{ pendingOrders() }}</h3>
          <p>Pending Orders</p>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon bg-success-light">
          <span class="material-symbols-outlined text-success">check_circle</span>
        </div>
        <div class="stat-info">
          <h3>{{ completedOrders() }}</h3>
          <p>Completed Orders</p>
        </div>
      </div>
    </div>
    
    <div class="dashboard-widgets">
      <div class="widget card">
        <div class="widget-header">
          <h3>Recent Orders</h3>
          <a href="/admin/orders" class="text-primary">View All</a>
        </div>
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let order of recentOrders()">
                <td><strong>{{ order.id }}</strong></td>
                <td>{{ order.customerName }}</td>
                <td>{{ order.date | date:'shortDate' }}</td>
                <td>
                  <span class="badge" [ngClass]="order.status === 'pending' ? 'badge-warning' : 'badge-success'">
                    {{ order.status | titlecase }}
                  </span>
                </td>
              </tr>
              <tr *ngIf="recentOrders().length === 0">
                <td colspan="4" class="text-center text-muted py-4">No recent orders</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <div class="widget card">
        <div class="widget-header">
          <h3>Low Stock Alert</h3>
        </div>
        <div class="low-stock-list">
          <div class="stock-item" *ngFor="let product of lowStockProducts()">
            <img [src]="product.images[0]" alt="{{ product.name }}">
            <div class="stock-details">
              <strong>{{ product.name }}</strong>
              <span class="text-muted text-sm">SKU: {{ product.sku }}</span>
            </div>
            <div class="stock-badge badge-error">
              {{ product.stock }} left
            </div>
          </div>
          <div class="text-center text-muted py-4" *ngIf="lowStockProducts().length === 0">
            All products are well stocked.
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    
    .stat-card {
      background: var(--surface);
      padding: 1.5rem;
      border-radius: var(--border-radius-lg);
      box-shadow: var(--shadow-sm);
      display: flex;
      align-items: center;
      gap: 1.5rem;
      transition: var(--transition);
      
      &:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
      }
    }
    
    .stat-icon {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      
      span {
        font-size: 2rem;
      }
    }
    
    .bg-primary-light { background: rgba(128, 0, 0, 0.1); }
    .bg-secondary-light { background: rgba(212, 175, 55, 0.1); }
    .bg-warning-light { background: rgba(255, 193, 7, 0.1); }
    .bg-success-light { background: rgba(40, 167, 69, 0.1); }
    
    .stat-info {
      h3 {
        font-size: 1.75rem;
        margin: 0;
      }
      p {
        color: var(--text-muted);
        margin: 0;
        font-size: 0.9rem;
      }
    }
    
    .dashboard-widgets {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 1.5rem;
    }
    
    .widget-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      
      h3 {
        margin: 0;
        font-size: 1.25rem;
      }
      a {
        text-decoration: none;
        font-weight: 500;
      }
    }
    
    .table {
      width: 100%;
      border-collapse: collapse;
      
      th, td {
        padding: 1rem;
        text-align: left;
        border-bottom: 1px solid rgba(0,0,0,0.05);
      }
      
      th {
        color: var(--text-muted);
        font-weight: 500;
        font-size: 0.9rem;
      }
      
      tbody tr:hover {
        background: rgba(0,0,0,0.01);
      }
    }
    
    .low-stock-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    
    .stock-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem;
      border: 1px solid rgba(0,0,0,0.05);
      border-radius: var(--border-radius-md);
      
      img {
        width: 48px;
        height: 48px;
        border-radius: var(--border-radius-sm);
        object-fit: cover;
      }
      
      .stock-details {
        flex: 1;
        display: flex;
        flex-direction: column;
        
        strong {
          font-size: 0.95rem;
        }
      }
      
      .stock-badge {
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.8rem;
        font-weight: 600;
      }
    }
    
    .text-sm { font-size: 0.8rem; }
    .py-4 { padding-top: 1.5rem; padding-bottom: 1.5rem; }
    .text-center { text-align: center; }
  `]
})
export class AdminDashboardComponent {
  dataService = inject(DataService);
  
  totalProducts = computed(() => this.dataService.products().length);
  totalCategories = computed(() => this.dataService.categories().length);
  
  pendingOrders = computed(() => 
    this.dataService.orders().filter(o => o.status === 'pending').length
  );
  
  completedOrders = computed(() => 
    this.dataService.orders().filter(o => o.status === 'completed').length
  );
  
  recentOrders = computed(() => {
    return [...this.dataService.orders()].sort((a,b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    ).slice(0, 5);
  });
  
  lowStockProducts = computed(() => 
    this.dataService.products().filter(p => p.stock < 1500)
  );
}
