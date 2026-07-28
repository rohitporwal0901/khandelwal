import { Routes } from '@angular/router';

// Presentation Board
import { PresentationBoardComponent } from './presentation-board/presentation-board.component';

// Admin
import { AdminLayoutComponent } from './admin/admin-layout/admin-layout.component';
import { AdminLoginComponent } from './admin/admin-login/admin-login.component';
import { AdminDashboardComponent } from './admin/admin-dashboard/admin-dashboard.component';
import { AdminCategoriesComponent } from './admin/admin-categories/admin-categories.component';
import { AdminProductsComponent } from './admin/admin-products/admin-products.component';
import { AdminOrdersComponent } from './admin/admin-orders/admin-orders.component';
import { AdminCustomersComponent } from './admin/admin-customers/admin-customers.component';
import { AdminBillingComponent } from './admin/admin-billing/admin-billing.component';
import { AdminReceiptsComponent } from './admin/admin-receipts/admin-receipts.component';
import { AdminSettingsComponent } from './admin/admin-settings/admin-settings.component';
import { AdminOldBillsComponent } from './admin/admin-old-bills/admin-old-bills.component';
import { adminGuard } from './core/guards/admin.guard';

// User
import { UserLayoutComponent } from './user/user-layout/user-layout.component';
import { UserHomeComponent } from './user/user-home/user-home.component';
import { UserProductDetailsComponent } from './user/user-product-details/user-product-details.component';
import { UserCartComponent } from './user/user-cart/user-cart.component';
import { UserAuthComponent } from './user/user-auth/user-auth.component';
import { UserAccountComponent } from './user/user-account/user-account.component';
import { UserOrdersComponent } from './user/user-orders/user-orders.component';
import { UserLedgerComponent } from './user/user-ledger/user-ledger.component';
import { userGuard } from './core/guards/user.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'shop', pathMatch: 'full' },
  { path: 'presentation', component: PresentationBoardComponent },
  
  // Admin Routes
  { path: 'admin/login', component: AdminLoginComponent },
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [adminGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: AdminDashboardComponent },
      { path: 'categories', component: AdminCategoriesComponent },
      { path: 'products', component: AdminProductsComponent },
      { path: 'orders', component: AdminOrdersComponent },
      { path: 'billing', component: AdminBillingComponent },
      { path: 'receipts', component: AdminReceiptsComponent },
      { path: 'old-bills', component: AdminOldBillsComponent },
      { path: 'customers', component: AdminCustomersComponent },
      { path: 'settings', component: AdminSettingsComponent }
    ]
  },
  
  // User App Routes
  {
    path: 'shop',
    component: UserLayoutComponent,
    children: [
      { path: '', component: UserHomeComponent, canActivate: [userGuard] },
      { path: 'product/:id', component: UserProductDetailsComponent, canActivate: [userGuard] },
      { path: 'cart', component: UserCartComponent, canActivate: [userGuard] },
      { path: 'login', component: UserAuthComponent },
      { path: 'account', component: UserAccountComponent, canActivate: [userGuard] },
      { path: 'orders', component: UserOrdersComponent, canActivate: [userGuard] },
      { path: 'ledger', component: UserLedgerComponent, canActivate: [userGuard] }
    ]
  },

  { path: '**', redirectTo: '' }
];
