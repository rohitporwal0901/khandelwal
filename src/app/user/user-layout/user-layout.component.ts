import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DataService } from '../../core/services/data.service';

@Component({
  selector: 'app-user-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="mobile-app-container">
      <header class="app-header">
        <div class="logo" routerLink="/shop">
          <img src="assets/images/card1.png" alt="Logo" class="logo-img">
          <h1>Khandelwal Cards</h1>
        </div>
        <div class="header-actions">
          <a routerLink="/shop/cart" class="cart-btn">
            <span class="material-symbols-outlined">shopping_cart</span>
            <span class="badge" *ngIf="cartCount() > 0">{{ cartCount() }}</span>
          </a>
        </div>
      </header>
      
      <main class="app-content">
        <router-outlet></router-outlet>
      </main>
      
      <nav class="bottom-nav">
        <a routerLink="/shop" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="nav-item">
          <span class="material-symbols-outlined">home</span>
          <span>Home</span>
        </a>
        <a routerLink="/shop/cart" routerLinkActive="active" class="nav-item">
          <div class="icon-wrapper">
            <span class="material-symbols-outlined">shopping_cart</span>
            <span class="badge" *ngIf="cartCount() > 0">{{ cartCount() }}</span>
          </div>
          <span>Cart</span>
        </a>
        <a class="nav-item">
          <span class="material-symbols-outlined">person</span>
          <span>Profile</span>
        </a>
      </nav>
    </div>
  `,
  styles: [`
    .mobile-app-container {
      display: flex;
      flex-direction: column;
      height: 100vh;
      max-width: 1200px;
      margin: 0 auto;
      background: var(--background);
      position: relative;
      box-shadow: var(--shadow-lg);
      border-left: 1px solid rgba(0,0,0,0.05);
      border-right: 1px solid rgba(0,0,0,0.05);
    }
    
    .app-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      background: var(--surface);
      border-bottom: 1px solid rgba(0,0,0,0.05);
      z-index: 10;
      
      .logo {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        text-decoration: none;
        
        .logo-img {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          object-fit: cover;
        }
        
        h1 {
          margin: 0;
          font-size: 1.2rem;
          color: var(--primary);
        }
      }
    }
    
    .cart-btn {
      position: relative;
      color: var(--text-main);
      text-decoration: none;
      
      .badge {
        position: absolute;
        top: -8px;
        right: -8px;
        background: var(--primary);
        color: white;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.75rem;
      }
    }
    
    .app-content {
      flex: 1;
      overflow-y: auto;
      padding-bottom: 70px; /* Space for bottom nav */
    }
    
    .bottom-nav {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 70px;
      background: var(--surface);
      border-top: 1px solid rgba(0,0,0,0.05);
      display: flex;
      justify-content: space-around;
      align-items: center;
      z-index: 10;
    }
    
    .nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      color: var(--text-muted);
      text-decoration: none;
      gap: 0.25rem;
      
      span.material-symbols-outlined {
        font-size: 1.5rem;
      }
      
      span:last-child {
        font-size: 0.75rem;
      }
      
      &.active {
        color: var(--primary);
        font-weight: 500;
        
        span.material-symbols-outlined {
          font-variation-settings: 'FILL' 1;
        }
      }
      
      .icon-wrapper {
        position: relative;
        
        .badge {
          position: absolute;
          top: -4px;
          right: -8px;
          background: var(--primary);
          color: white;
          border-radius: 50%;
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
        }
      }
    }
  `]
})
export class UserLayoutComponent {
  dataService = inject(DataService);
  
  cartCount = () => {
    return this.dataService.cart().reduce((sum, item) => sum + item.quantity, 0);
  };
}
