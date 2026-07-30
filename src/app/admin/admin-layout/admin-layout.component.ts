import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmationModalComponent } from '../../shared/confirmation-modal/confirmation-modal.component';
import { DataService } from '../../core/services/data.service';
import { NetworkService } from '../../core/services/network.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, ConfirmationModalComponent],
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.css']
})
export class AdminLayoutComponent implements OnInit {
  authService = inject(AuthService);
  router = inject(Router);
  dataService = inject(DataService);
  networkService = inject(NetworkService); // Track network status

  currentDate = new Date();
  isLogoutModalOpen = false;

  ngOnInit() {
    // ✅ Bug #2 Fix: Register DataService at layout level (wraps ALL admin pages)
    // Previously this was only done in AdminBillingComponent, meaning auto-sync
    // would silently skip if internet returned while user was on any OTHER page.
    // Now it's registered once globally when admin layout boots up.
    this.networkService.registerDataService(this.dataService);
  }

  // Computed: count of app orders pending admin review (no bill number yet)
  pendingOrdersCount = computed(() =>
    this.dataService.orders().filter(o => o.status === 'pending' && !o.billNumber).length
  );

  isBillingMenuOpen = signal(true);

  toggleBillingMenu() {
    this.isBillingMenuOpen.update(v => !v);
  }

  isBillingRoute(): boolean {
    const url = this.router.url;
    return url.includes('/admin/billing') || url.includes('/admin/receipts') || url.includes('/admin/old-bills');
  }

  isBillingNetRoute(): boolean {
    const url = this.router.url;
    return url.includes('/admin/billing');
  }

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
