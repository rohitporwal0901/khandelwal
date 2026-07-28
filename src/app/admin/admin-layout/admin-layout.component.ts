import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmationModalComponent } from '../../shared/confirmation-modal/confirmation-modal.component';
import { DataService } from '../../core/services/data.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, ConfirmationModalComponent],
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.css']
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

  isBillingMenuOpen = signal(true);

  toggleBillingMenu() {
    this.isBillingMenuOpen.update(v => !v);
  }

  isBillingRoute(): boolean {
    const url = this.router.url;
    return url.includes('/admin/billing') || url.includes('/admin/receipts') || url.includes('/admin/old-bills');
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
