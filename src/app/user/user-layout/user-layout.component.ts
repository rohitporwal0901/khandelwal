import { Component, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-user-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="mobile-app-container" [class.auth-mode]="!canShowNav()">
      <header class="app-header" [class.scrolled]="isScrolled()" *ngIf="canShowNav() && !isOrdersPage()">
        <div class="logo" routerLink="/shop">
          <div class="logo-mark">
            <img src="assets/images/card1.png" alt="Logo" class="logo-img">
          </div>
          <div class="logo-text">
            <h1>Khandelwal Cards</h1>
            <span class="logo-tagline">Premium Printing</span>
          </div>
        </div>
        <div class="header-actions">
          <a routerLink="/shop/cart" class="cart-btn" [class.has-items]="cartCount() > 0">
            <span class="material-symbols-outlined">shopping_cart</span>
            <span class="badge" *ngIf="cartCount() > 0">{{ cartCount() }}</span>
          </a>
        </div>
      </header>
      
      <main class="app-content" [class.no-nav]="!canShowNav()" (scroll)="onContentScroll($event)">
        <router-outlet></router-outlet>
      </main>
      
      <nav class="bottom-nav" *ngIf="canShowNav()">
        <a routerLink="/shop" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="nav-item" id="nav-home">
          <div class="nav-icon-wrap">
            <span class="material-symbols-outlined">home</span>
          </div>
          <span class="nav-label">Home</span>
        </a>
        <a routerLink="/shop/cart" routerLinkActive="active" class="nav-item" id="nav-cart">
          <div class="nav-icon-wrap">
            <span class="material-symbols-outlined">shopping_cart</span>
            <span class="nav-badge" *ngIf="cartCount() > 0">{{ cartCount() }}</span>
          </div>
          <span class="nav-label">Cart</span>
        </a>
        <a [routerLink]="authService.isAuthenticated() ? '/shop/account' : '/shop/login'"
           routerLinkActive="active" class="nav-item" id="nav-account">
          <div class="nav-icon-wrap">
            <span class="material-symbols-outlined">person</span>
          </div>
          <span class="nav-label">Account</span>
        </a>
      </nav>
    </div>
  `,
  styles: [`
    .mobile-app-container {
      display: flex;
      flex-direction: column;
      height: 100dvh;
      max-width: 480px;
      margin: 0 auto;
      background: var(--background);
      position: relative;
      box-shadow: 0 0 60px rgba(0,0,0,0.10);
      &.auth-mode {
        background: var(--surface) !important;
      }
    }

    /* ─── Header ──────────────────────────────── */
    .app-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 var(--space-base);
      height: 58px;
      background: var(--surface);
      border-bottom: 1px solid rgba(0,0,0,0.06);
      z-index: 100;
      position: sticky;
      top: 0;
      transition: box-shadow 0.3s ease;
      flex-shrink: 0;
      
      &.scrolled {
        box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        background: rgba(255,255,255,0.96);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
      }
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      cursor: pointer;
    }

    .logo-mark {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(139, 0, 0, 0.2);
      flex-shrink: 0;

      .logo-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    .logo-text {
      display: flex;
      flex-direction: column;
      gap: 1px;

      h1 {
        margin: 0;
        font-size: 1.05rem;
        font-weight: 800;
        line-height: 1.2;
        background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        letter-spacing: -0.3px;
      }

      .logo-tagline {
        font-size: 0.58rem;
        color: var(--text-muted);
        font-weight: 500;
        letter-spacing: 0.5px;
        text-transform: uppercase;
      }
    }

    .cart-btn {
      position: relative;
      color: var(--text-secondary);
      text-decoration: none;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      transition: var(--transition);
      background: var(--surface-muted);

      &:active { transform: scale(0.9); }

      &.has-items {
        background: rgba(139, 0, 0, 0.06);
        color: var(--primary);
      }

      .material-symbols-outlined { font-size: 1.4rem; }

      .badge {
        position: absolute;
        top: -4px;
        right: -4px;
        background: var(--primary);
        color: white;
        border-radius: 999px;
        min-width: 18px;
        height: 18px;
        padding: 0 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.65rem;
        font-weight: 700;
        border: 2px solid var(--surface);
      }
    }

    /* ─── Main Content ────────────────────────── */
    .app-content {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      -webkit-overflow-scrolling: touch;
      scroll-behavior: smooth;
      padding-bottom: 68px;
      &.no-nav {
        padding-bottom: 0 !important;
        background: var(--surface) !important;
        display: flex;
        flex-direction: column;
      }
    }

    /* ─── Bottom Nav ──────────────────────────── */
    .bottom-nav {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 68px;
      background: var(--surface);
      border-top: 1px solid rgba(0,0,0,0.07);
      display: flex;
      justify-content: space-around;
      align-items: center;
      z-index: 100;
    }

    .nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      color: var(--text-muted);
      text-decoration: none;
      gap: 3px;
      flex: 1;
      padding: 6px 0;
      transition: color 0.2s ease;

      &.active {
        color: var(--primary);

        .nav-icon-wrap {
          background: rgba(139, 0, 0, 0.09);
          transform: translateY(-1px);

          .material-symbols-outlined {
            font-variation-settings: 'FILL' 1;
          }
        }

        .nav-label {
          font-weight: 600;
          color: var(--primary);
        }
      }
    }

    .nav-icon-wrap {
      position: relative;
      width: 46px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);

      .material-symbols-outlined {
        font-size: 1.4rem;
        transition: font-variation-settings 0.2s ease;
      }
    }

    .nav-badge {
      position: absolute;
      top: -5px;
      right: -3px;
      background: var(--primary);
      color: white;
      border-radius: 999px;
      min-width: 16px;
      height: 16px;
      padding: 0 3px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.6rem;
      font-weight: 700;
      border: 1.5px solid var(--surface);
    }

    .nav-label {
      font-size: 0.65rem;
      font-weight: 500;
      letter-spacing: 0.2px;
      transition: color 0.2s ease;
    }
  `]
})
export class UserLayoutComponent {
  dataService = inject(DataService);
  authService = inject(AuthService);
  router = inject(Router);
  isScrolled = signal(false);

  cartCount = () => this.dataService.cart().length;

  isOrdersPage(): boolean {
    return this.router.url.includes('/orders');
  }

  canShowNav(): boolean {
    if (this.router.url.includes('/login')) return false;
    if (!this.authService.isAuthenticated()) return false;
    const profile = this.authService.currentUserProfile();
    if (!profile) return false;
    if (profile && (profile.status === 'pending' || profile.status === 'rejected')) return false;
    return true;
  }

  onContentScroll(event: Event) {
    const el = event.target as HTMLElement;
    this.isScrolled.set(el.scrollTop > 8);
  }
}
