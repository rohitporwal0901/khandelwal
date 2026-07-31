import { Component, inject, signal, effect, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { AuthService } from '../../core/services/auth.service';
import { NetworkService } from '../../core/services/network.service';

@Component({
  selector: 'app-user-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './user-layout.component.html',
  styleUrls: ['./user-layout.component.css']
})
export class UserLayoutComponent {
  dataService = inject(DataService);
  authService = inject(AuthService);
  router = inject(Router);
  networkService = inject(NetworkService);
  isScrolled = signal(false);

  constructor() {
    // Automatically redirect if admin changes status to pending/rejected while user is active
    effect(() => {
      const profile = this.authService.currentUserProfile();
      if (profile && (profile.status === 'pending' || profile.status === 'rejected')) {
        if (!this.router.url.includes('/shop/login')) {
          this.router.navigate(['/shop/login'], { queryParams: { returnUrl: this.router.url, status: profile.status } });
        }
      }
    });
  }

  cartCount = () => this.dataService.cart().length;
  wishlistCount = () => this.dataService.wishlist().length;

  isFullPage(): boolean {
    return this.router.url.includes('/orders') || this.router.url.includes('/ledger');
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
