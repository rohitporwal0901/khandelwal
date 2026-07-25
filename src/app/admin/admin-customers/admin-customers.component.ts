import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../core/services/data.service';

@Component({
  selector: 'app-admin-customers',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-header">
      <div>
        <h2>Customers</h2>
        <p class="text-muted">Manage your store customers (derived from orders)</p>
      </div>
    </div>

    <div class="glass-panel" style="padding: 0;">
      <table class="table w-100">
        <thead>
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>Email</th>
            <th>Total Orders</th>
            <th>Last Order Date</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let customer of uniqueCustomers()">
            <td>
              <div class="customer-info">
                <div class="avatar">{{ customer.name.charAt(0).toUpperCase() }}</div>
                <strong>{{ customer.name }}</strong>
              </div>
            </td>
            <td>{{ customer.phone }}</td>
            <td>{{ customer.email || 'N/A' }}</td>
            <td><span class="badge badge-primary">{{ customer.totalOrders }}</span></td>
            <td>{{ customer.lastOrderDate | date:'mediumDate' }}</td>
          </tr>
          <tr *ngIf="uniqueCustomers().length === 0">
            <td colspan="5" class="text-center" style="padding: 2rem;">
              <span class="text-muted">No customers found.</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .page-header {
      margin-bottom: 2rem;
      h2 { margin: 0; }
      p { margin: 0; }
    }
    
    .table {
      width: 100%;
      border-collapse: collapse;
      
      th, td {
        padding: 1rem 1.5rem;
        text-align: left;
        border-bottom: 1px solid rgba(0,0,0,0.05);
      }
      
      th {
        font-weight: 600;
        color: var(--text-muted);
        font-size: 0.85rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        background: rgba(0,0,0,0.02);
      }
      
      tbody tr {
        transition: var(--transition);
        
        &:hover {
          background: rgba(0,0,0,0.01);
        }
      }
    }
    
    .customer-info {
      display: flex;
      align-items: center;
      gap: 1rem;
      
      .avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: var(--primary);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 1.1rem;
      }
    }
  `]
})
export class AdminCustomersComponent {
  dataService = inject(DataService);

  uniqueCustomers = computed(() => {
    const orders = this.dataService.orders();
    const customerMap = new Map<string, any>();

    orders.forEach(order => {
      // Create a unique key using phone since phone numbers are usually unique identifiers
      const key = order.phone || order.customerName;
      if (!customerMap.has(key)) {
        customerMap.set(key, {
          name: order.customerName,
          phone: order.phone,
          email: order.email,
          totalOrders: 1,
          lastOrderDate: order.date
        });
      } else {
        const existing = customerMap.get(key);
        existing.totalOrders += 1;
        // Keep the most recent date (orders are already sorted desc by date, so first seen is newest usually, but we check to be safe)
        if (new Date(order.date) > new Date(existing.lastOrderDate)) {
          existing.lastOrderDate = order.date;
        }
      }
    });

    return Array.from(customerMap.values()).sort((a, b) => 
      new Date(b.lastOrderDate).getTime() - new Date(a.lastOrderDate).getTime()
    );
  });
}
