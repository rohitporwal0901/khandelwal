import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DataService, Order } from '../../core/services/data.service';
import { AuthService } from '../../core/services/auth.service';
import { BottomSheetComponent } from '../../shared/bottom-sheet/bottom-sheet.component';
import { SnackbarService } from '../../core/services/snackbar.service';

@Component({
  selector: 'app-user-cart',
  standalone: true,
  imports: [CommonModule, FormsModule, BottomSheetComponent],
  templateUrl: './user-cart.component.html',
  styleUrls: ['./user-cart.component.css']
})
export class UserCartComponent {
  dataService = inject(DataService);
  authService = inject(AuthService);
  router = inject(Router);
  snackbar = inject(SnackbarService);

  cartItems = this.dataService.cart;
  products = this.dataService.products;

  isCheckoutOpen = signal(false);
  isSubmitting = signal(false);
  orderSuccess = signal(false);
  lastOrderId = '';
  productToRemove = signal<string | null>(null);

  customerDetails: Omit<Order, 'id' | 'items' | 'status' | 'date'> = {
    customerName: '', phone: '', email: '', address: '', notes: '', city: '', pincode: ''
  };

  totalQuantity() {
    return this.cartItems().reduce((sum, i) => sum + i.quantity, 0);
  }

  getProductName(productId: string): string {
    return this.products().find(p => p.id === productId)?.name ?? 'Unknown Product';
  }
  getProductSku(productId: string): string {
    return this.products().find(p => p.id === productId)?.sku ?? '';
  }
  getProductImage(productId: string): string {
    const prod = this.products().find(p => p.id === productId);
    return prod?.images?.length ? prod.images[0] : '';
  }
  getProductCategory(productId: string): string {
    const prod = this.products().find(p => p.id === productId);
    if (!prod) return '';
    const cat = this.dataService.categories().find(c => c.id === prod.categoryId);
    return cat?.name ?? '';
  }

  removeItem(productId: string) { this.productToRemove.set(productId); }
  confirmRemove() {
    const id = this.productToRemove();
    if (id) this.dataService.removeFromCart(id);
    this.productToRemove.set(null);
  }
  cancelRemove() { this.productToRemove.set(null); }
  continueShopping() { this.orderSuccess.set(false); this.router.navigate(['/shop']); }
  openCheckout() {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/shop/login'], { queryParams: { returnUrl: '/shop/cart' } });
      return;
    }
    const profile = this.authService.currentUserProfile();
    this.customerDetails = {
      customerName: profile?.name || '',
      phone: profile?.phone || '',
      email: profile?.email || '',
      address: profile?.address || '',
      city: '',
      pincode: '',
      notes: ''
    };
    this.isCheckoutOpen.set(true);
  }
  closeCheckout() { this.isCheckoutOpen.set(false); }

  async submitOrder() {
    this.isSubmitting.set(true);
    try {
      const user = this.authService.currentUser();
      const orderPayload = {
        ...this.customerDetails,
        uid: user?.uid
      };
      const newOrder = await this.dataService.placeOrder(orderPayload);
      
      if (user) {
        await this.authService.updateUserProfile(user.uid, {
          name: this.customerDetails.customerName,
          email: this.customerDetails.email,
          address: this.customerDetails.address
        });
      }

      this.lastOrderId = newOrder.id;
      this.isSubmitting.set(false);
      this.closeCheckout();
      this.orderSuccess.set(true);
      this.snackbar.show('Order placed successfully!', 'success');
    } catch (error) {
      console.error(error);
      this.isSubmitting.set(false);
    }
  }
}
