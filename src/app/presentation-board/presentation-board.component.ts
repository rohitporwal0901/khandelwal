import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-presentation-board',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="presentation-wrapper">
      <header class="presentation-header">
        <div class="logo">
          <img src="assets/images/card1.png" alt="Logo" class="logo-img">
          <h1>Khandelwal Cards</h1>
        </div>
        <p class="subtitle">Premium Printing Products Ordering System</p>
      </header>
      
      <main class="presentation-main">
        <div class="presentation-grid">
          
          <!-- Admin Panel Section -->
          <div class="section-card admin-section">
            <div class="section-header">
              <span class="material-symbols-outlined icon">admin_panel_settings</span>
              <h2>Admin Dashboard</h2>
              <span class="badge badge-warning ml-auto">Web App</span>
            </div>
            <p class="text-muted">Complete backend management for categories, products, inventory and orders.</p>
            
            <div class="links-list">
              <a routerLink="/admin/login" class="nav-link">
                <span class="material-symbols-outlined">login</span>
                <div>
                  <strong>Admin Login</strong>
                  <span>Secure authentication</span>
                </div>
                <span class="material-symbols-outlined arrow">arrow_forward_ios</span>
              </a>
              <a routerLink="/admin/dashboard" class="nav-link">
                <span class="material-symbols-outlined">dashboard</span>
                <div>
                  <strong>Dashboard Overview</strong>
                  <span>Key metrics and recent activity</span>
                </div>
                <span class="material-symbols-outlined arrow">arrow_forward_ios</span>
              </a>
              <a routerLink="/admin/categories" class="nav-link">
                <span class="material-symbols-outlined">category</span>
                <div>
                  <strong>Category Management</strong>
                  <span>Right drawer CRUD operations</span>
                </div>
                <span class="material-symbols-outlined arrow">arrow_forward_ios</span>
              </a>
              <a routerLink="/admin/products" class="nav-link">
                <span class="material-symbols-outlined">inventory_2</span>
                <div>
                  <strong>Product Management</strong>
                  <span>Multi-image upload & stock</span>
                </div>
                <span class="material-symbols-outlined arrow">arrow_forward_ios</span>
              </a>
              <a routerLink="/admin/orders" class="nav-link">
                <span class="material-symbols-outlined">shopping_cart</span>
                <div>
                  <strong>Order Management</strong>
                  <span>Generate bill & update inventory</span>
                </div>
                <span class="material-symbols-outlined arrow">arrow_forward_ios</span>
              </a>
            </div>
          </div>
          
          <!-- User App Section -->
          <div class="section-card user-section">
            <div class="section-header">
              <span class="material-symbols-outlined icon text-primary">smartphone</span>
              <h2 class="text-primary">User Application</h2>
              <span class="badge badge-success ml-auto">Mobile First</span>
            </div>
            <p class="text-muted">Premium mobile-first ordering experience for customers.</p>
            
            <div class="links-list">
              <a routerLink="/shop" class="nav-link">
                <span class="material-symbols-outlined">home</span>
                <div>
                  <strong>Home & Categories</strong>
                  <span>Filter and browse products (No Prices)</span>
                </div>
                <span class="material-symbols-outlined arrow">arrow_forward_ios</span>
              </a>
              <a routerLink="/shop/product/p1" class="nav-link">
                <span class="material-symbols-outlined">web_stories</span>
                <div>
                  <strong>Product Details</strong>
                  <span>Image gallery & bottom sheet quantity</span>
                </div>
                <span class="material-symbols-outlined arrow">arrow_forward_ios</span>
              </a>
              <a routerLink="/shop/cart" class="nav-link">
                <span class="material-symbols-outlined">shopping_bag</span>
                <div>
                  <strong>Cart & Checkout</strong>
                  <span>Place enquiry order form</span>
                </div>
                <span class="material-symbols-outlined arrow">arrow_forward_ios</span>
              </a>
            </div>
            
            <div class="mobile-preview-hint mt-4">
              <span class="material-symbols-outlined">info</span>
              <p>For the best experience, view the User App links using your browser's mobile developer tools.</p>
            </div>
          </div>
          
        </div>
      </main>
      
      <footer class="presentation-footer">
        <p>Built with Angular + Fake Firebase Mock Services</p>
      </footer>
    </div>
  `,
  styles: [`
    .presentation-wrapper {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: linear-gradient(135deg, var(--background) 0%, #e9ecef 100%);
    }
    
    .presentation-header {
      text-align: center;
      padding: 4rem 2rem 2rem;
      
      .logo {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        margin-bottom: 0.5rem;
        
        .logo-img {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          object-fit: cover;
          box-shadow: var(--shadow-sm);
        }
        
        h1 {
          font-size: 2.5rem;
          color: var(--primary);
          margin: 0;
        }
      }
      
      .subtitle {
        font-size: 1.25rem;
        color: var(--text-muted);
      }
    }
    
    .presentation-main {
      flex: 1;
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
      width: 100%;
    }
    
    .presentation-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
      gap: 2rem;
    }
    
    .section-card {
      background: var(--surface);
      border-radius: var(--border-radius-xl);
      padding: 2rem;
      box-shadow: var(--shadow-md);
      transition: var(--transition);
      border-top: 4px solid var(--text-muted);
      
      &:hover {
        transform: translateY(-5px);
        box-shadow: var(--shadow-lg);
      }
      
      &.admin-section { border-top-color: var(--warning); }
      &.user-section { border-top-color: var(--primary); }
    }
    
    .section-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
      
      .icon { font-size: 2rem; }
      h2 { margin: 0; font-size: 1.5rem; }
    }
    
    .ml-auto { margin-left: auto; }
    
    .links-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-top: 2rem;
    }
    
    .nav-link {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.25rem;
      background: var(--background);
      border-radius: var(--border-radius-md);
      text-decoration: none;
      color: var(--text-main);
      transition: var(--transition);
      border: 1px solid transparent;
      
      &:hover {
        background: white;
        border-color: var(--primary);
        box-shadow: var(--shadow-sm);
        transform: translateX(5px);
        
        .arrow { color: var(--primary); }
      }
      
      span.material-symbols-outlined:first-child {
        font-size: 2rem;
        color: var(--text-muted);
      }
      
      div {
        flex: 1;
        display: flex;
        flex-direction: column;
        
        strong { font-size: 1.1rem; margin-bottom: 0.25rem; }
        span { font-size: 0.85rem; color: var(--text-muted); }
      }
      
      .arrow {
        font-size: 1.25rem;
        color: var(--text-muted);
      }
    }
    
    .mobile-preview-hint {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem;
      background: rgba(128, 0, 0, 0.05);
      border-radius: var(--border-radius-sm);
      color: var(--primary);
      
      p { margin: 0; font-size: 0.9rem; }
    }
    
    .mt-4 { margin-top: 1.5rem; }
    
    .presentation-footer {
      text-align: center;
      padding: 2rem;
      color: var(--text-muted);
      border-top: 1px solid rgba(0,0,0,0.05);
    }
  `]
})
export class PresentationBoardComponent {
}
