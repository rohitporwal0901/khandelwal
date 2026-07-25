import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmationModalComponent } from '../../shared/confirmation-modal/confirmation-modal.component';
import { DataService } from '../../core/services/data.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, ConfirmationModalComponent],
  template: `
    <div class="admin-container">
      <aside class="sidebar">
        <div class="logo">
          <img src="favicon.ico" alt="Logo" class="sidebar-logo">
          <div class="logo-text">
            <h2>Khandelwal Cards</h2>
            <span class="badge badge-warning">Admin Panel</span>
          </div>
        </div>
        
        <nav class="nav-menu">
          <a routerLink="/admin/dashboard" routerLinkActive="active" class="nav-item">
            <span class="material-symbols-outlined">dashboard</span> Dashboard
          </a>
          <a routerLink="/admin/categories" routerLinkActive="active" class="nav-item">
            <span class="material-symbols-outlined">category</span> Categories
          </a>
          <a routerLink="/admin/products" routerLinkActive="active" class="nav-item">
            <span class="material-symbols-outlined">inventory_2</span> Products
          </a>
          <a routerLink="/admin/orders" routerLinkActive="active" class="nav-item">
            <span class="material-symbols-outlined">shopping_cart</span> Orders
          </a>

          <a routerLink="/admin/customers" routerLinkActive="active" class="nav-item">
            <span class="material-symbols-outlined">group</span> Customers
          </a>

          <a routerLink="/admin/settings" routerLinkActive="active" class="nav-item">
            <span class="material-symbols-outlined">settings</span> Settings
          </a>
        </nav>
        
        <div class="sidebar-footer">
          <button class="btn btn-outline" (click)="promptLogout()" style="width: 100%">
            <span class="material-symbols-outlined">logout</span> Logout
          </button>
        </div>
      </aside>
      
      <main class="main-content">
        <header class="topbar">
          <div class="topbar-actions">
            <span class="date">{{ currentDate | date:'mediumDate' }}</span>
            <button class="btn-icon" routerLink="/admin/orders">
              <span class="material-symbols-outlined">notifications</span>
              <span class="notification-badge" *ngIf="pendingOrdersCount() > 0">{{ pendingOrdersCount() }}</span>
            </button>
            <div class="admin-profile">
              <img src="https://ui-avatars.com/api/?name=Admin&background=800000&color=fff" alt="Admin">
              <div class="profile-info">
                <strong>Admin User</strong>
                <span>Administrator</span>
              </div>
            </div>
          </div>
        </header>
        
        <div class="content-area">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
    
    <app-confirmation-modal
      [isOpen]="isLogoutModalOpen"
      title="Confirm Logout"
      message="Are you sure you want to log out of the admin panel?"
      confirmText="Logout"
      (confirm)="confirmLogout()"
      (cancel)="cancelLogout()">
    </app-confirmation-modal>
  `,
  styles: [`
    .admin-container {
      display: flex;
      height: 100vh;
      overflow: hidden;
      background: var(--background);
    }
    
    .sidebar {
      width: 260px;
      background: var(--surface);
      border-right: 1px solid rgba(0,0,0,0.05);
      display: flex;
      flex-direction: column;
      z-index: 10;
    }
    
    .logo {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid rgba(0,0,0,0.05);
      display: flex;
      align-items: center;
      gap: 10px;
      
      .sidebar-logo {
        width: 36px;
        height: 36px;
        object-fit: contain;
      }
      
      .logo-text {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
      }
      
      h2 {
        color: var(--primary);
        margin: 0 0 0.15rem 0;
        font-size: 1.05rem;
        font-weight: 800;
        line-height: 1.1;
      }
      
      .badge {
        font-size: 0.65rem;
        padding: 2px 6px;
      }
    }
    
    .nav-menu {
      flex: 1;
      padding: 1rem 0;
      overflow-y: auto;
    }
    
    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1.5rem;
      color: var(--text-muted);
      text-decoration: none;
      font-weight: 500;
      transition: var(--transition);
      border-left: 3px solid transparent;
      
      &:hover {
        background: rgba(128, 0, 0, 0.05);
        color: var(--primary);
      }
      
      &.active {
        background: rgba(128, 0, 0, 0.05);
        color: var(--primary);
        border-left-color: var(--primary);
      }
      
      span {
        font-size: 1.25rem;
      }
    }
    
    .sidebar-footer {
      padding: 1rem;
      border-top: 1px solid rgba(0,0,0,0.05);
    }
    
    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    
    .topbar {
      height: 70px;
      background: var(--surface);
      border-bottom: 1px solid rgba(0,0,0,0.05);
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding: 0 2rem;
    }
    
    .topbar-actions {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }
    
    .date {
      color: var(--text-muted);
      font-weight: 500;
    }
    
    .btn-icon {
      position: relative;
      background: var(--background);
      border-radius: 50%;
      
      .notification-badge {
        position: absolute;
        top: -4px;
        right: -4px;
        min-width: 18px;
        height: 18px;
        background: var(--error);
        color: white;
        border-radius: 9px;
        font-size: 0.7rem;
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 4px;
        border: 2px solid var(--surface);
      }
    }
    
    .admin-profile {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      
      img {
        width: 40px;
        height: 40px;
        border-radius: 50%;
      }
      
      .profile-info {
        display: flex;
        flex-direction: column;
        
        strong {
          font-size: 0.9rem;
        }
        
        span {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
      }
    }
    
    .content-area {
      flex: 1;
      padding: 2rem;
      overflow-y: auto;
    }
  `]
})
export class AdminLayoutComponent {
  authService = inject(AuthService);
  router = inject(Router);
  dataService = inject(DataService);
  
  currentDate = new Date();
  isLogoutModalOpen = false;

  pendingOrdersCount = computed(() => 
    this.dataService.orders().filter(o => o.status === 'pending').length
  );

  promptLogout() {
    this.isLogoutModalOpen = true;
  }

  confirmLogout() {
    this.isLogoutModalOpen = false;
    this.authService.logout();
    this.router.navigate(['/admin/login']);
  }

  cancelLogout() {
    this.isLogoutModalOpen = false;
  }
}
