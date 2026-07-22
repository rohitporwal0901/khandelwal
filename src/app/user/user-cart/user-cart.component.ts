import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DataService, Order } from '../../core/services/data.service';
import { BottomSheetComponent } from '../../shared/bottom-sheet/bottom-sheet.component';

@Component({
  selector: 'app-user-cart',
  standalone: true,
  imports: [CommonModule, FormsModule, BottomSheetComponent],
  template: `
    <div class="cart-container">
      <div class="page-header">
        <h2>Your Cart</h2>
      </div>
      
      <div class="empty-cart" *ngIf="cartItems().length === 0 && !orderSuccess()">
        <span class="material-symbols-outlined">shopping_bag</span>
        <h3>Cart is Empty</h3>
        <p class="text-muted">Looks like you haven't added any products yet.</p>
        <button class="btn btn-primary mt-4" (click)="continueShopping()">
          Start Shopping
        </button>
      </div>
      
      <div class="cart-content" *ngIf="cartItems().length > 0 && !orderSuccess()">
        <div class="cart-items-list">
          <div class="cart-item" *ngFor="let item of cartItems()">
            <img [src]="getProductImage(item.productId)" alt="Product">
            <div class="item-details">
              <h4>{{ getProductName(item.productId) }}</h4>
              <p class="text-muted">Quantity: <strong>{{ item.quantity }}</strong></p>
            </div>
            <button class="btn-icon remove-btn" (click)="removeItem(item.productId)">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        </div>
        
        <div class="fixed-bottom-cta">
          <button class="btn btn-primary w-100 place-order-btn" (click)="openCheckout()">
            Place Order Request
          </button>
        </div>
      </div>
      
      <div class="order-success" *ngIf="orderSuccess()">
        <div class="success-icon">
          <span class="material-symbols-outlined">check_circle</span>
        </div>
        <h3>Request Submitted!</h3>
        <p class="text-muted text-center">Your order request has been sent to the admin. We will contact you shortly.</p>
        
        <div class="success-details card mt-4">
          <p><strong>Order ID:</strong> {{ lastOrderId }}</p>
          <p><strong>Status:</strong> Pending Admin Approval</p>
        </div>
        
        <button class="btn btn-primary w-100 mt-4" (click)="continueShopping()">
          Return to Home
        </button>
      </div>
    </div>
    
    <!-- Checkout / Place Order Popup -->
    <app-bottom-sheet 
      [isOpen]="isCheckoutOpen()" 
      title="Contact Details" 
      (close)="closeCheckout()">
      
      <form (ngSubmit)="submitOrder()" #checkoutForm="ngForm" class="checkout-form">
        <p class="text-muted mb-4">Please provide your details so we can process your order request.</p>
        
        <div class="form-group">
          <label class="form-label">Full Name</label>
          <input type="text" class="form-control" [(ngModel)]="customerDetails.customerName" name="customerName" required>
        </div>
        
        <div class="form-group">
          <label class="form-label">Phone Number</label>
          <input type="tel" class="form-control" [(ngModel)]="customerDetails.phone" name="phone" required>
        </div>
        
        <div class="form-group">
          <label class="form-label">Email Address</label>
          <input type="email" class="form-control" [(ngModel)]="customerDetails.email" name="email" required>
        </div>
        
        <div class="form-group">
          <label class="form-label">Delivery Address</label>
          <textarea class="form-control" rows="3" [(ngModel)]="customerDetails.address" name="address" required></textarea>
        </div>
        
        <div class="form-group">
          <label class="form-label">Additional Notes (Optional)</label>
          <textarea class="form-control" rows="2" [(ngModel)]="customerDetails.notes" name="notes"></textarea>
        </div>
        
        <div class="sheet-actions mt-4">
          <button type="button" class="btn btn-outline" (click)="closeCheckout()">Cancel</button>
          <button type="submit" class="btn btn-primary" [disabled]="!checkoutForm.valid || isSubmitting()">
            <span *ngIf="!isSubmitting()">Confirm Order</span>
            <span *ngIf="isSubmitting()" class="loader"></span>
          </button>
        </div>
      </form>
    </app-bottom-sheet>
  `,
  styles: [`
    .cart-container {
      padding: 1.5rem;
      padding-bottom: 90px; /* Space for CTA */
    }
    
    .page-header {
      margin-bottom: 1.5rem;
      h2 { margin: 0; }
    }
    
    .empty-cart {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem 1rem;
      text-align: center;
      
      span.material-symbols-outlined {
        font-size: 4rem;
        color: var(--text-muted);
        opacity: 0.5;
        margin-bottom: 1rem;
      }
      
      h3 { margin-bottom: 0.5rem; }
    }
    
    .cart-items-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    
    .cart-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      background: var(--surface);
      padding: 1rem;
      border-radius: var(--border-radius-md);
      box-shadow: var(--shadow-sm);
      position: relative;
      
      img {
        width: 64px;
        height: 64px;
        border-radius: var(--border-radius-sm);
        object-fit: cover;
      }
      
      .item-details {
        flex: 1;
        
        h4 {
          margin: 0 0 0.25rem 0;
          font-size: 1rem;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        p {
          margin: 0;
          font-size: 0.85rem;
        }
      }
      
      .remove-btn {
        color: var(--error);
        background: rgba(220, 53, 69, 0.1);
        
        &:hover {
          background: var(--error);
          color: white;
        }
      }
    }
    
    .fixed-bottom-cta {
      position: fixed;
      bottom: 70px;
      left: 0;
      width: 100%;
      padding: 1rem 1.5rem;
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(10px);
      border-top: 1px solid rgba(0,0,0,0.05);
      z-index: 90;
      max-width: 480px;
      left: 50%;
      transform: translateX(-50%);
    }
    
    .place-order-btn {
      padding: 1rem;
      font-size: 1.1rem;
      border-radius: var(--border-radius-lg);
    }
    
    .checkout-form {
      padding-bottom: 1rem;
    }
    
    .sheet-actions {
      display: flex;
      gap: 1rem;
      
      button { flex: 1; }
    }
    
    .order-success {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2rem 1rem;
      animation: fadeIn 0.5s ease-out;
      
      .success-icon {
        color: var(--success);
        margin-bottom: 1rem;
        
        span { font-size: 5rem; }
      }
      
      h3 { margin-bottom: 0.5rem; }
      
      .success-details {
        width: 100%;
        text-align: left;
        
        p {
          margin: 0.5rem 0;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid rgba(0,0,0,0.05);
          
          &:last-child {
            border-bottom: none;
            padding-bottom: 0;
          }
        }
      }
    }
    
    .loader {
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255,255,255,0.3);
      border-radius: 50%;
      border-top-color: #fff;
      animation: spin 1s ease-in-out infinite;
    }
    
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    
    .mt-4 { margin-top: 1.5rem; }
    .mb-4 { margin-bottom: 1.5rem; }
    .w-100 { width: 100%; }
    .text-center { text-align: center; }
  `]
})
export class UserCartComponent {
  dataService = inject(DataService);
  router = inject(Router);
  
  cartItems = this.dataService.cart;
  products = this.dataService.products;
  
  isCheckoutOpen = signal(false);
  isSubmitting = signal(false);
  orderSuccess = signal(false);
  lastOrderId = '';
  
  customerDetails: Omit<Order, 'id' | 'items' | 'status' | 'date'> = {
    customerName: '',
    phone: '',
    email: '',
    address: '',
    notes: ''
  };

  getProductName(productId: string): string {
    const prod = this.products().find(p => p.id === productId);
    return prod ? prod.name : 'Unknown Product';
  }
  
  getProductImage(productId: string): string {
    const prod = this.products().find(p => p.id === productId);
    return prod && prod.images.length ? prod.images[0] : '';
  }

  removeItem(productId: string) {
    this.dataService.removeFromCart(productId);
  }

  continueShopping() {
    this.orderSuccess.set(false);
    this.router.navigate(['/shop']);
  }
  
  openCheckout() {
    this.isCheckoutOpen.set(true);
  }
  
  closeCheckout() {
    this.isCheckoutOpen.set(false);
  }
  
  submitOrder() {
    this.isSubmitting.set(true);
    
    // Simulate API delay
    setTimeout(() => {
      const newOrder = this.dataService.placeOrder(this.customerDetails);
      this.lastOrderId = newOrder.id;
      this.isSubmitting.set(false);
      this.closeCheckout();
      this.orderSuccess.set(true);
    }, 1500);
  }
}
