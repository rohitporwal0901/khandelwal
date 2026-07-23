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
import { adminGuard } from './core/guards/admin.guard';

// User
import { UserLayoutComponent } from './user/user-layout/user-layout.component';
import { UserHomeComponent } from './user/user-home/user-home.component';
import { UserProductDetailsComponent } from './user/user-product-details/user-product-details.component';
import { UserCartComponent } from './user/user-cart/user-cart.component';

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
      { path: 'customers', component: AdminDashboardComponent }, // Placeholder
      { path: 'notifications', component: AdminDashboardComponent }, // Placeholder
      { path: 'settings', component: AdminDashboardComponent } // Placeholder
    ]
  },
  
  // User App Routes
  {
    path: 'shop',
    component: UserLayoutComponent,
    children: [
      { path: '', component: UserHomeComponent },
      { path: 'product/:id', component: UserProductDetailsComponent },
      { path: 'cart', component: UserCartComponent }
    ]
  },

  { path: '**', redirectTo: '' }
];
