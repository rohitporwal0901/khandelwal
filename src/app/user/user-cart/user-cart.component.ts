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
        <h2>Your Cart <span class="cart-count-badge" *ngIf="cartItems().length > 0">{{ cartItems().length }} Product{{ cartItems().length > 1 ? 's' : '' }}</span></h2>
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
              <p class="sku-text">SKU: {{ getProductSku(item.productId) }}</p>
              <div class="qty-badge">Qty: {{ item.quantity }}</div>
            </div>
            <div class="remove-action-container">
              <button class="btn-icon remove-btn" (click)="removeItem(item.productId)" [class.active-delete]="productToRemove() === item.productId">
                <span class="material-symbols-outlined">delete</span>
              </button>
              
              <div class="inline-confirm" [class.show]="productToRemove() === item.productId">
                <button class="btn-yes" (click)="confirmRemove()">Yes</button>
                <button class="btn-no" (click)="cancelRemove()">No</button>
              </div>
            </div>
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
      
      <form (ngSubmit)="checkoutForm.valid && submitOrder()" #checkoutForm="ngForm" class="checkout-form">
        <p class="text-muted mb-4">Please provide your details so we can process your order request.</p>
        
        <div class="form-group" [class.has-error]="nameField.invalid && (nameField.touched || checkoutForm.submitted)">
          <label class="form-label">Full Name <span class="text-error">*</span></label>
          <input type="text" class="form-control" [(ngModel)]="customerDetails.customerName" name="customerName" required #nameField="ngModel" placeholder="e.g. John Doe">
          <div class="error-msg" *ngIf="nameField.invalid && (nameField.touched || checkoutForm.submitted)">
            <span class="material-symbols-outlined">error</span> Please enter your full name
          </div>
        </div>
        
        <div class="form-group" [class.has-error]="phoneField.invalid && (phoneField.touched || checkoutForm.submitted)">
          <label class="form-label">Phone Number <span class="text-error">*</span></label>
          <input type="tel" class="form-control" [(ngModel)]="customerDetails.phone" name="phone" required #phoneField="ngModel" placeholder="e.g. +91 9876543210">
          <div class="error-msg" *ngIf="phoneField.invalid && (phoneField.touched || checkoutForm.submitted)">
            <span class="material-symbols-outlined">error</span> Please enter your phone number
          </div>
        </div>
        
        <div class="form-group" [class.has-error]="emailField.invalid && (emailField.touched || checkoutForm.submitted)">
          <label class="form-label">Email Address <span class="text-error">*</span></label>
          <input type="email" class="form-control" [(ngModel)]="customerDetails.email" name="email" required #emailField="ngModel" placeholder="e.g. john@example.com">
          <div class="error-msg" *ngIf="emailField.invalid && (emailField.touched || checkoutForm.submitted)">
            <span class="material-symbols-outlined">error</span> Please enter a valid email address
          </div>
        </div>
        
        <div class="form-group" [class.has-error]="addressField.invalid && (addressField.touched || checkoutForm.submitted)">
          <label class="form-label">Delivery Address <span class="text-error">*</span></label>
          <textarea class="form-control" rows="3" [(ngModel)]="customerDetails.address" name="address" required #addressField="ngModel" placeholder="Enter complete delivery address..."></textarea>
          <div class="error-msg" *ngIf="addressField.invalid && (addressField.touched || checkoutForm.submitted)">
            <span class="material-symbols-outlined">error</span> Delivery address is required
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">Additional Notes <span class="text-muted text-sm">(Optional)</span></label>
          <textarea class="form-control" rows="2" [(ngModel)]="customerDetails.notes" name="notes" placeholder="Any special instructions..."></textarea>
        </div>
        
        <div class="sheet-actions mt-4">
          <button type="button" class="btn btn-outline" (click)="closeCheckout()">Cancel</button>
          <button type="submit" class="btn btn-primary premium-submit-btn" [disabled]="isSubmitting()">
            <span *ngIf="!isSubmitting()">Confirm Order</span>
            <div *ngIf="isSubmitting()" class="premium-loader">
              <div class="dot"></div>
              <div class="dot"></div>
              <div class="dot"></div>
            </div>
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
      h2 { 
        margin: 0; 
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .cart-count-badge {
        font-size: 0.8rem;
        background: var(--primary);
        color: white;
        padding: 4px 12px;
        border-radius: 20px;
        font-weight: 500;
        vertical-align: middle;
        box-shadow: 0 2px 8px rgba(158, 27, 34, 0.2);
      }
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
        
        .sku-text {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin-bottom: 0.25rem;
          font-weight: 500;
        }
        
        .qty-badge {
          display: inline-block;
          background: rgba(158, 27, 34, 0.05); /* Romantic subtle red/pink */
          color: var(--primary);
          padding: 4px 12px;
          border-radius: 16px;
          font-size: 0.8rem;
          font-weight: 600;
          margin-top: 0.5rem;
          border: 1px solid rgba(158, 27, 34, 0.15);
        }
      }
      
      .remove-btn {
        color: var(--text-muted);
        background: transparent;
        border: none;
        padding: 8px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        
        &:hover, &.active-delete {
          background: rgba(220, 53, 69, 0.1);
          color: var(--error, #dc3545);
        }
        
        span {
          font-size: 1.3rem;
        }
      }
      
      .remove-action-container {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      
      .inline-confirm {
        position: absolute;
        top: 100%;
        right: 0;
        margin-top: 5px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.15);
        display: flex;
        gap: 6px;
        padding: 6px;
        opacity: 0;
        visibility: hidden;
        transform: translateY(-10px) scale(0.95);
        transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        z-index: 20;
        border: 1px solid rgba(0,0,0,0.05);
        
        &.show {
          opacity: 1;
          visibility: visible;
          transform: translateY(0) scale(1);
        }
        
        button {
          padding: 6px 14px;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: background 0.2s, color 0.2s;
        }
        
        .btn-yes {
          background: rgba(220, 53, 69, 0.1);
          color: #dc3545;
          
          &:hover {
            background: #dc3545;
            color: white;
          }
        }
        
        .btn-no {
          background: #f8f9fa;
          color: #495057;
          
          &:hover {
            background: #e9ecef;
          }
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
    
    .premium-submit-btn {
      position: relative;
      overflow: hidden;
      transition: all 0.3s ease;
      
      &:disabled {
        background: var(--primary-dark);
        opacity: 0.8;
      }
    }
    
    .premium-loader {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      height: 24px;
      
      .dot {
        width: 8px;
        height: 8px;
        background-color: white;
        border-radius: 50%;
        animation: premiumBounce 1.4s infinite ease-in-out both;
      }
      
      .dot:nth-child(1) { animation-delay: -0.32s; }
      .dot:nth-child(2) { animation-delay: -0.16s; }
    }
    
    @keyframes premiumBounce {
      0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
      40% { transform: scale(1); opacity: 1; }
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
    
    .form-group.has-error input, .form-group.has-error textarea {
      border-color: var(--error);
      box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.15);
      animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
    }
    
    .error-msg {
      color: #dc3545;
      font-size: 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.25rem;
      margin-top: 0.3rem;
      animation: slideDownFade 0.3s ease-out forwards;
      
      span {
        font-size: 0.9rem;
      }
    }
    
    .text-error { color: #dc3545; }
    .text-sm { font-size: 0.85rem; }
    
    @keyframes slideDownFade {
      from { opacity: 0; transform: translateY(-5px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes shake {
      10%, 90% { transform: translate3d(-1px, 0, 0); }
      20%, 80% { transform: translate3d(2px, 0, 0); }
      30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
      40%, 60% { transform: translate3d(4px, 0, 0); }
    }
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
  productToRemove = signal<string | null>(null);
  
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
  
  getProductSku(productId: string): string {
    const prod = this.products().find(p => p.id === productId);
    return prod ? prod.sku : '';
  }
  
  getProductImage(productId: string): string {
    const prod = this.products().find(p => p.id === productId);
    return prod && prod.images.length ? prod.images[0] : '';
  }

  removeItem(productId: string) {
    this.productToRemove.set(productId);
  }
  
  confirmRemove() {
    const id = this.productToRemove();
    if (id) {
      this.dataService.removeFromCart(id);
    }
    this.productToRemove.set(null);
  }
  
  cancelRemove() {
    this.productToRemove.set(null);
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
  
  async submitOrder() {
    this.isSubmitting.set(true);
    
    try {
      const newOrder = await this.dataService.placeOrder(this.customerDetails);
      this.lastOrderId = newOrder.id;
      this.isSubmitting.set(false);
      this.closeCheckout();
      this.orderSuccess.set(true);
    } catch (error) {
      console.error(error);
      this.isSubmitting.set(false);
    }
  }
}
