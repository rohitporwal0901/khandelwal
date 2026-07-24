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
    <div class="cart-page">

      <!-- ─── Header ─────────────────────── -->
      <div class="cart-header">
        <h2 class="cart-title">
          Your Cart
          <span class="count-badge" *ngIf="cartItems().length > 0">
            {{ cartItems().length }} {{ cartItems().length === 1 ? 'item' : 'items' }}
          </span>
        </h2>
      </div>

      <!-- ─── Empty State ─────────────────── -->
      <div class="empty-cart" *ngIf="cartItems().length === 0 && !orderSuccess()">
        <div class="empty-icon">
          <span class="material-symbols-outlined">shopping_bag</span>
        </div>
        <h3>Your bag is empty</h3>
        <p>Discover our premium printing cards and add them to your bag.</p>
        <button class="shop-btn" (click)="continueShopping()">
          <span class="material-symbols-outlined">storefront</span>
          Browse Products
        </button>
      </div>

      <!-- ─── Cart Items ───────────────────── -->
      <div class="cart-content" *ngIf="cartItems().length > 0 && !orderSuccess()">
        <div class="items-list">
          <div class="cart-item" *ngFor="let item of cartItems()">
            <div class="item-img-wrap">
              <img [src]="getProductImage(item.productId)" [alt]="getProductName(item.productId)">
            </div>

            <div class="item-info">
              <span class="item-cat">{{ getProductCategory(item.productId) }}</span>
              <h4 class="item-name">{{ getProductName(item.productId) }}</h4>
              <p class="item-sku">SKU: {{ getProductSku(item.productId) }}</p>
              <div class="item-qty-row">
                <span class="qty-chip">Qty: {{ item.quantity }}</span>
              </div>
            </div>

            <div class="item-actions">
              <button class="del-btn" (click)="removeItem(item.productId)"
                      [class.confirming]="productToRemove() === item.productId"
                      [attr.aria-label]="'Remove ' + getProductName(item.productId)">
                <span class="material-symbols-outlined">delete</span>
              </button>
              <div class="confirm-popup" [class.show]="productToRemove() === item.productId">
                <button class="cf-yes" (click)="confirmRemove()">Remove</button>
                <button class="cf-no" (click)="cancelRemove()">Keep</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Order Summary -->
        <div class="order-summary">
          <div class="summary-row">
            <span>Total Products</span>
            <span class="val">{{ cartItems().length }}</span>
          </div>
          <div class="summary-row">
            <span>Total Quantity</span>
            <span class="val">{{ totalQuantity() }}</span>
          </div>
          <div class="summary-note">
            <span class="material-symbols-outlined">info</span>
            Final pricing will be confirmed by our team after order review.
          </div>
        </div>

        <!-- CTA -->
        <div class="cta-wrap">
          <button class="place-btn" (click)="openCheckout()">
            <span class="material-symbols-outlined">local_shipping</span>
            Place Order Request
          </button>
        </div>
      </div>

      <!-- ─── Success ───────────────────────── -->
      <div class="success-screen" *ngIf="orderSuccess()">
        <div class="success-anim">
          <div class="success-circle">
            <span class="material-symbols-outlined">check</span>
          </div>
        </div>
        <h3>Order Submitted!</h3>
        <p>Your request has been sent. Our team will contact you shortly to confirm your order.</p>
        <div class="order-id-card">
          <span class="oid-label">Order Reference</span>
          <span class="oid-val">{{ lastOrderId }}</span>
        </div>
        <button class="shop-btn" (click)="continueShopping()">
          <span class="material-symbols-outlined">home</span>
          Back to Home
        </button>
      </div>
    </div>

    <!-- ─── Checkout Sheet ──────────────────── -->
    <app-bottom-sheet [isOpen]="isCheckoutOpen()" title="Contact Details" (close)="closeCheckout()">
      <form (ngSubmit)="checkoutForm.valid && submitOrder()" #checkoutForm="ngForm" class="checkout-form">
        <p class="form-hint">We'll use these details to process your order request.</p>

        <div class="form-group" [class.has-error]="nameField.invalid && (nameField.touched || checkoutForm.submitted)">
          <label class="form-label">Full Name <span class="req">*</span></label>
          <input type="text" class="form-control" [(ngModel)]="customerDetails.customerName"
                 name="customerName" required #nameField="ngModel" placeholder="e.g. Rahul Sharma">
          <div class="field-error" *ngIf="nameField.invalid && (nameField.touched || checkoutForm.submitted)">
            <span class="material-symbols-outlined">error</span> Please enter your full name
          </div>
        </div>

        <div class="form-group" [class.has-error]="phoneField.invalid && (phoneField.touched || checkoutForm.submitted)">
          <label class="form-label">Phone Number <span class="req">*</span></label>
          <input type="tel" class="form-control" [(ngModel)]="customerDetails.phone"
                 name="phone" required #phoneField="ngModel" placeholder="+91 98765 43210">
          <div class="field-error" *ngIf="phoneField.invalid && (phoneField.touched || checkoutForm.submitted)">
            <span class="material-symbols-outlined">error</span> Phone number is required
          </div>
        </div>

        <div class="form-group" [class.has-error]="emailField.invalid && (emailField.touched || checkoutForm.submitted)">
          <label class="form-label">Email Address <span class="req">*</span></label>
          <input type="email" class="form-control" [(ngModel)]="customerDetails.email"
                 name="email" required #emailField="ngModel" placeholder="you@email.com">
          <div class="field-error" *ngIf="emailField.invalid && (emailField.touched || checkoutForm.submitted)">
            <span class="material-symbols-outlined">error</span> Valid email is required
          </div>
        </div>

        <div class="form-group" [class.has-error]="addressField.invalid && (addressField.touched || checkoutForm.submitted)">
          <label class="form-label">Delivery Address <span class="req">*</span></label>
          <textarea class="form-control" rows="3" [(ngModel)]="customerDetails.address"
                    name="address" required #addressField="ngModel" placeholder="Complete delivery address..."></textarea>
          <div class="field-error" *ngIf="addressField.invalid && (addressField.touched || checkoutForm.submitted)">
            <span class="material-symbols-outlined">error</span> Address is required
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Notes <span class="optional">(Optional)</span></label>
          <textarea class="form-control" rows="2" [(ngModel)]="customerDetails.notes"
                    name="notes" placeholder="Special instructions..."></textarea>
        </div>

        <div class="sheet-actions">
          <button type="button" class="sheet-btn cancel-btn" (click)="closeCheckout()">Cancel</button>
          <button type="submit" class="sheet-btn confirm-btn" [disabled]="isSubmitting()">
            <ng-container *ngIf="!isSubmitting()">Confirm Order</ng-container>
            <div class="dots-loader" *ngIf="isSubmitting()">
              <span></span><span></span><span></span>
            </div>
          </button>
        </div>
      </form>
    </app-bottom-sheet>
  `,
  styles: [`
    .cart-page {
      padding: var(--space-base);
      padding-bottom: 2rem;
      min-height: 100%;
      background: var(--background);
    }

    /* ─── Header ──────────────────────── */
    .cart-header { margin-bottom: 20px; }
    .cart-title {
      font-size: 1.35rem;
      font-weight: 800;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 10px;
      color: var(--text-main);
    }
    .count-badge {
      font-size: 0.72rem;
      font-weight: 600;
      background: var(--primary);
      color: white;
      padding: 4px 10px;
      border-radius: 999px;
      box-shadow: 0 2px 8px rgba(139,0,0,0.2);
    }

    /* ─── Empty ───────────────────────── */
    .empty-cart {
      display: flex; flex-direction: column;
      align-items: center; text-align: center;
      padding: 3rem 1rem; gap: 10px;

      .empty-icon {
        width: 80px; height: 80px;
        background: rgba(139,0,0,0.06);
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        margin-bottom: 8px;
        .material-symbols-outlined { font-size: 2.5rem; color: var(--primary); opacity: 0.6; }
      }
      h3 { font-size: 1.15rem; margin: 0; color: var(--text-main); }
      p { font-size: 0.85rem; color: var(--text-muted); max-width: 220px; margin: 0; line-height: 1.5; }
    }

    /* ─── Items List ──────────────────── */
    .items-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }

    .cart-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      background: var(--surface);
      padding: 14px;
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-card);
      border: 1px solid rgba(0,0,0,0.04);
      position: relative;
    }

    .item-img-wrap {
      width: 76px;
      height: 76px;
      border-radius: var(--radius-md);
      overflow: hidden;
      flex-shrink: 0;
      background: var(--background);

      img {
        width: 100%; height: 100%;
        object-fit: cover;
        transition: transform 0.3s ease;
      }
    }

    .item-info { flex: 1; min-width: 0; }
    .item-cat { font-size: 0.6rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); }
    .item-name {
      font-size: 0.9rem; font-weight: 700; margin: 2px 0 3px;
      color: var(--text-main);
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }
    .item-sku { font-size: 0.72rem; color: var(--text-muted); margin: 0 0 6px; font-weight: 500; }
    .item-qty-row { display: flex; align-items: center; gap: 8px; }
    .qty-chip {
      display: inline-flex;
      padding: 3px 10px;
      background: rgba(139,0,0,0.07);
      color: var(--primary);
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 700;
      border: 1px solid rgba(139,0,0,0.12);
    }

    .item-actions {
      display: flex; flex-direction: column; align-items: flex-end; position: relative;
    }
    .del-btn {
      width: 34px; height: 34px;
      border: none; background: var(--surface-muted);
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; color: var(--text-muted);
      transition: var(--transition);
      .material-symbols-outlined { font-size: 1.15rem; }
      &:hover, &.confirming { background: rgba(220,38,38,0.1); color: var(--error); }
    }
    .confirm-popup {
      position: absolute;
      top: 38px;
      right: 0;
      background: var(--surface);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      display: flex;
      flex-direction: column;
      gap: 5px;
      padding: 8px;
      border: 1px solid rgba(0,0,0,0.06);
      opacity: 0; visibility: hidden;
      transform: translateY(-8px) scale(0.95);
      transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
      z-index: 20;
      min-width: 90px;
      &.show { opacity: 1; visibility: visible; transform: translateY(0) scale(1); }
    }
    .cf-yes, .cf-no {
      padding: 6px 10px;
      border-radius: 7px;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
      font-family: inherit;
      width: 100%;
      transition: background 0.15s;
    }
    .cf-yes { background: rgba(220,38,38,0.1); color: var(--error);
      &:hover { background: var(--error); color: white; }
    }
    .cf-no { background: var(--surface-muted); color: var(--text-secondary);
      &:hover { background: #e9ecef; }
    }

    /* ─── Order Summary ───────────────── */
    .order-summary {
      background: var(--surface);
      border-radius: var(--radius-lg);
      padding: 16px;
      margin-bottom: 20px;
      border: 1px solid rgba(0,0,0,0.04);
      box-shadow: var(--shadow-xs);
    }
    .summary-row {
      display: flex; justify-content: space-between;
      font-size: 0.85rem; color: var(--text-secondary);
      padding: 6px 0;
      border-bottom: 1px solid rgba(0,0,0,0.05);
      &:last-of-type { border-bottom: none; }
      .val { font-weight: 700; color: var(--text-main); }
    }
    .summary-note {
      display: flex; align-items: flex-start; gap: 6px;
      margin-top: 10px;
      font-size: 0.75rem;
      color: var(--text-muted);
      line-height: 1.5;
      .material-symbols-outlined { font-size: 0.95rem; flex-shrink: 0; margin-top: 1px; }
    }

    /* ─── CTA ─────────────────────────── */
    .cta-wrap { padding: 0; }
    .place-btn {
      display: flex; align-items: center; justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 16px;
      background: var(--primary);
      color: white;
      border: none;
      border-radius: var(--radius-xl);
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      font-family: inherit;
      box-shadow: var(--shadow-primary);
      transition: var(--transition);
      letter-spacing: 0.2px;
      .material-symbols-outlined { font-size: 1.2rem; }
      &:hover { background: var(--primary-dark); }
      &:active { transform: scale(0.98); }
    }
    .shop-btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 7px;
      background: rgba(139,0,0,0.08); color: var(--primary);
      border: none; padding: 12px 24px; border-radius: 999px;
      font-size: 0.9rem; font-weight: 700; cursor: pointer;
      font-family: inherit; transition: var(--transition);
      .material-symbols-outlined { font-size: 1rem; }
      &:hover { background: rgba(139,0,0,0.14); }
    }

    /* ─── Success ─────────────────────── */
    .success-screen {
      display: flex; flex-direction: column;
      align-items: center; text-align: center;
      padding: 2rem 1rem; gap: 12px;
      animation: fadeUp 0.5s ease-out;
    }
    .success-anim { margin-bottom: 4px; }
    .success-circle {
      width: 80px; height: 80px;
      border-radius: 50%;
      background: linear-gradient(135deg, #16a34a, #15803d);
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 8px 28px rgba(22,163,74,0.35);
      animation: scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
      .material-symbols-outlined { font-size: 2.5rem; color: white; font-variation-settings: 'FILL' 1; }
    }
    @keyframes scaleIn { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
    .success-screen h3 { font-size: 1.3rem; font-weight: 800; margin: 0; }
    .success-screen p { font-size: 0.85rem; color: var(--text-muted); max-width: 250px; line-height: 1.55; margin: 0; }
    .order-id-card {
      display: flex; flex-direction: column; gap: 4px;
      background: var(--surface); padding: 14px 20px;
      border-radius: var(--radius-lg); width: 100%;
      text-align: left; border: 1px solid rgba(0,0,0,0.05);
      box-shadow: var(--shadow-xs);
      .oid-label { font-size: 0.72rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
      .oid-val { font-size: 0.85rem; font-weight: 700; color: var(--text-main); word-break: break-all; }
    }

    /* ─── Checkout Form ───────────────── */
    .checkout-form { padding-bottom: 0.5rem; }
    .form-hint { font-size: 0.83rem; color: var(--text-muted); margin-bottom: 16px; }
    .form-group { margin-bottom: 14px; }
    .req { color: var(--error); }
    .optional { font-size: 0.78rem; color: var(--text-muted); font-weight: 400; }
    .field-error {
      display: flex; align-items: center; gap: 4px;
      color: var(--error); font-size: 0.75rem; margin-top: 4px;
      animation: slideIn 0.2s ease-out;
      .material-symbols-outlined { font-size: 0.9rem; }
    }
    .form-group.has-error .form-control {
      border-color: var(--error);
      box-shadow: 0 0 0 3px rgba(220,38,38,0.12);
    }
    @keyframes slideIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }

    .sheet-actions { display: flex; gap: 10px; margin-top: 4px; }
    .sheet-btn {
      flex: 1; padding: 13px; border-radius: var(--radius-lg);
      font-weight: 700; font-size: 0.9rem; cursor: pointer; font-family: inherit;
    }
    .cancel-btn { background: var(--surface-muted); border: 1.5px solid rgba(0,0,0,0.08); color: var(--text-secondary); }
    .confirm-btn {
      background: var(--primary); color: white; border: none;
      box-shadow: var(--shadow-primary);
      transition: var(--transition);
      &:hover:not(:disabled) { background: var(--primary-dark); }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }
    .dots-loader {
      display: flex; align-items: center; justify-content: center; gap: 5px; height: 20px;
      span {
        width: 7px; height: 7px; background: white; border-radius: 50%;
        animation: bounce 1.2s infinite ease-in-out both;
        &:nth-child(1) { animation-delay: -0.32s; }
        &:nth-child(2) { animation-delay: -0.16s; }
      }
    }
    @keyframes bounce {
      0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
      40% { transform: scale(1); opacity: 1; }
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
    customerName: '', phone: '', email: '', address: '', notes: ''
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
  openCheckout() { this.isCheckoutOpen.set(true); }
  closeCheckout() { this.isCheckoutOpen.set(false); }

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
