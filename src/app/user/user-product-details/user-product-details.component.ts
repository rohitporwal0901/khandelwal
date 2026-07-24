import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DataService, Product } from '../../core/services/data.service';
import { ImageGalleryComponent } from '../../shared/image-gallery/image-gallery.component';
import { BottomSheetComponent } from '../../shared/bottom-sheet/bottom-sheet.component';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-user-product-details',
  standalone: true,
  imports: [CommonModule, ImageGalleryComponent, BottomSheetComponent, FormsModule],
  template: `
    <!-- Loading -->
    <div class="initial-loader" *ngIf="!dataService.isProductsLoaded()">
      <div class="spinner-large"></div>
      <p class="loader-text">Loading...</p>
    </div>

    <!-- Not Found -->
    <div class="not-found" *ngIf="dataService.isProductsLoaded() && !product()">
      <span class="material-symbols-outlined">inventory_2</span>
      <h3>Product not found</h3>
      <button class="action-btn outline-btn" (click)="goBack()">Go Back</button>
    </div>

    <!-- Product -->
    <div class="pd-container" *ngIf="product() as prod">

      <!-- Back -->
      <button class="back-btn" (click)="goBack()" aria-label="Go back">
        <span class="material-symbols-outlined">arrow_back</span>
      </button>

      <!-- Gallery -->
      <div class="gallery-wrap">
        <app-image-gallery [images]="prod.images"></app-image-gallery>
      </div>

      <!-- Info Card -->
      <div class="info-card">
        <!-- Category chip -->
        <span class="category-chip">{{ getCategoryName(prod.categoryId) }}</span>

        <h2 class="prod-title">{{ prod.name }}</h2>

        <div class="sku-row">
          <span class="material-symbols-outlined sku-icon">tag</span>
          <span class="sku-val">{{ prod.sku }}</span>
        </div>

        <!-- Stock pill -->
        <div class="stock-row" *ngIf="prod.stock > 0">
          <span class="stock-pill in-stock">
            <span class="stock-dot"></span>
            {{ prod.stock }} in stock
          </span>
        </div>
        <div class="stock-row" *ngIf="prod.stock === 0">
          <span class="stock-pill out-stock">Out of Stock</span>
        </div>

        <!-- Divider -->
        <div class="divider"></div>

        <!-- Description -->
        <p class="prod-desc" *ngIf="prod.description">{{ prod.description }}</p>

        <!-- Action Buttons -->
        <div class="actions-wrap">
          <button class="action-btn outline-btn" (click)="openQtySheet()"
                  [disabled]="prod.stock === 0" [class.disabled]="prod.stock === 0">
            <span class="material-symbols-outlined">shopping_bag</span>
            {{ prod.stock === 0 ? 'Out of Stock' : 'Add to Bag' }}
          </button>
          <button class="action-btn primary-btn" (click)="openQtySheet()" *ngIf="prod.stock > 0">
            <span class="material-symbols-outlined">flash_on</span>
            Buy Now
          </button>
        </div>
      </div>
    </div>

    <!-- Qty Bottom Sheet -->
    <app-bottom-sheet [isOpen]="isQtySheetOpen()" title="Select Quantity" (close)="closeQtySheet()">
      <div class="qty-selector" *ngIf="product() as prod">
        <p class="qty-hint">Choose preset or enter custom quantity</p>

        <div class="preset-grid">
          <button class="preset-btn"
                  *ngFor="let qty of [100, 200, 300, 500, 1000]"
                  [class.active]="selectedQty() === qty"
                  (click)="selectedQty.set(qty)">
            {{ qty }}
          </button>
        </div>

        <div class="custom-qty-wrap">
          <label class="field-label">Custom Quantity</label>
          <input type="number" class="qty-input form-control"
                 [ngModel]="selectedQty() || null" (ngModelChange)="selectedQty.set(+$event)"
                 placeholder="Enter quantity" min="1" [max]="prod.stock">
        </div>

        <div class="stock-info" [class.error]="selectedQty() > prod.stock">
          <span class="material-symbols-outlined">inventory_2</span>
          Available: {{ prod.stock }}
        </div>

        <div class="error-block" *ngIf="selectedQty() > prod.stock">
          <span class="material-symbols-outlined">error</span>
          <div class="error-text">
            <span class="error-title">Quantity exceeds stock</span>
            <span class="error-sub">Only {{ prod.stock }} items available</span>
          </div>
        </div>

        <div class="sheet-actions">
          <button class="sheet-btn cancel-btn" (click)="closeQtySheet()">Cancel</button>
          <button class="sheet-btn confirm-btn"
                  [disabled]="selectedQty() < 1 || selectedQty() > prod.stock"
                  (click)="addToCart()">
            Apply & Add to Cart
          </button>
        </div>
      </div>
    </app-bottom-sheet>

    <!-- Toast -->
    <div class="toast-wrap" *ngIf="product() as prod">
      <div class="toast" [class.show]="isQtySheetOpen() && selectedQty() > prod.stock && !cartStockError()?.show">
        <span class="material-symbols-outlined">warning</span>
        Stock limit: only {{ prod.stock }} left
      </div>
      <div class="toast error-toast" [class.show]="cartStockError()?.show">
        <span class="material-symbols-outlined">error</span>
        <div>
          <strong>Stock Limit Reached</strong>
          <span *ngIf="cartStockError()">
            {{ cartStockError()?.cartQty }} in cart. {{ cartStockError()?.maxAllowed }} more available.
          </span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* ─── Loader / Not Found ──────────────── */
    .initial-loader {
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      padding: 5rem 2rem; gap: 1.25rem;
    }
    .spinner-large {
      width: 36px; height: 36px;
      border: 3px solid rgba(139,0,0,0.12);
      border-radius: 50%;
      border-top-color: var(--primary);
      animation: spin 0.9s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .loader-text { color: var(--text-muted); font-size: 0.9rem; font-weight: 500; }

    .not-found {
      display: flex; flex-direction: column; align-items: center;
      padding: 4rem 2rem; text-align: center; gap: 1rem;
      .material-symbols-outlined { font-size: 3rem; color: var(--text-muted); opacity: 0.4; }
    }

    /* ─── Container ───────────────────────── */
    .pd-container {
      position: relative;
      background: var(--background);
      min-height: 100%;
      padding-bottom: 1rem;
    }

    /* ─── Back Button ─────────────────────── */
    .back-btn {
      position: absolute;
      top: 14px;
      left: 14px;
      z-index: 50;
      width: 38px; height: 38px;
      border-radius: 50%;
      background: rgba(255,255,255,0.9);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(0,0,0,0.08);
      display: flex; align-items: center; justify-content: center;
      color: var(--text-main);
      box-shadow: 0 2px 12px rgba(0,0,0,0.12);
      cursor: pointer;
      transition: var(--transition);
      .material-symbols-outlined { font-size: 1.2rem; }
      &:active { transform: scale(0.92); }
    }

    /* ─── Gallery ─────────────────────────── */
    .gallery-wrap {
      width: 100%;
      position: relative;
      z-index: 1;
    }

    /* ─── Info Card ───────────────────────── */
    .info-card {
      background: var(--surface);
      border-radius: var(--radius-2xl) var(--radius-2xl) 0 0;
      margin-top: 0;
      position: relative;
      z-index: 1;
      padding: 22px var(--space-base) var(--space-2xl);
      box-shadow: 0 -6px 24px rgba(0,0,0,0.07);
    }

    .category-chip {
      display: inline-block;
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.7px;
      color: var(--primary);
      background: rgba(139,0,0,0.07);
      padding: 3px 10px;
      border-radius: 999px;
      margin-bottom: 8px;
    }

    .prod-title {
      font-size: 1.45rem;
      font-weight: 800;
      line-height: 1.25;
      letter-spacing: -0.4px;
      color: var(--text-main);
      margin: 0 0 10px;
    }

    .sku-row {
      display: flex; align-items: center; gap: 5px;
      margin-bottom: 12px;
      .sku-icon { font-size: 1rem; color: var(--text-muted); }
      .sku-val { font-size: 0.8rem; font-weight: 600; color: var(--text-muted); }
    }

    .stock-row { margin-bottom: 14px; }
    .stock-pill {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 5px 12px;
      border-radius: 999px;
      font-size: 0.78rem;
      font-weight: 600;
      .stock-dot { width: 7px; height: 7px; border-radius: 50%; }
      &.in-stock {
        background: var(--success-light);
        color: var(--success);
        .stock-dot { background: var(--success); }
      }
      &.out-stock {
        background: rgba(220,38,38,0.08);
        color: var(--error);
      }
    }

    .divider { height: 1px; background: rgba(0,0,0,0.06); margin: 14px 0; }

    .prod-desc {
      font-size: 0.88rem;
      line-height: 1.65;
      color: var(--text-muted);
      margin-bottom: 20px;
    }

    /* ─── Actions ─────────────────────────── */
    .actions-wrap {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .action-btn {
      display: flex; align-items: center; justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 14px;
      border-radius: var(--radius-xl);
      font-size: 0.95rem;
      font-weight: 700;
      letter-spacing: 0.3px;
      cursor: pointer;
      transition: var(--transition);
      font-family: inherit;
      .material-symbols-outlined { font-size: 1.2rem; }
      &:active { transform: scale(0.98); }
    }
    .outline-btn {
      background: var(--surface);
      border: 1.5px solid rgba(0,0,0,0.15);
      color: var(--text-main);
      &:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); }
      &.disabled { opacity: 0.5; cursor: not-allowed; }
    }
    .primary-btn {
      background: var(--primary);
      border: none;
      color: white;
      box-shadow: var(--shadow-primary);
      &:hover { background: var(--primary-dark); }
    }

    /* ─── Qty Sheet ───────────────────────── */
    .qty-selector { padding-bottom: 0.5rem; }
    .qty-hint { font-size: 0.85rem; color: var(--text-muted); text-align: center; margin-bottom: 16px; }

    .preset-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-bottom: 16px;
    }
    .preset-btn {
      background: var(--surface-muted);
      border: 1.5px solid rgba(0,0,0,0.08);
      padding: 12px;
      border-radius: var(--radius-md);
      font-weight: 700;
      font-size: 0.95rem;
      cursor: pointer;
      transition: var(--transition);
      font-family: inherit;
      color: var(--text-main);
      &:hover { border-color: var(--primary); color: var(--primary); }
      &.active { background: var(--primary); color: white; border-color: var(--primary); }
    }

    .custom-qty-wrap { margin-bottom: 12px; }
    .field-label { display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; }
    .qty-input { font-size: 1.05rem; font-weight: 700; }

    .stock-info {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 0.82rem; font-weight: 600;
      padding: 6px 12px;
      background: var(--surface-muted);
      border-radius: 999px;
      color: var(--text-secondary);
      margin-bottom: 10px;
      border: 1px solid rgba(0,0,0,0.06);
      .material-symbols-outlined { font-size: 1rem; color: var(--primary); }
      &.error { background: rgba(220,38,38,0.07); color: var(--error); border-color: rgba(220,38,38,0.2);
        .material-symbols-outlined { color: var(--error); }
      }
    }

    .error-block {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 14px;
      background: #fff5f5;
      border-radius: var(--radius-md);
      color: #b91c1c;
      font-size: 0.82rem;
      font-weight: 600;
      margin-bottom: 12px;
      border: 1.5px solid rgba(220,38,38,0.2);
      animation: shakeIn 0.4s ease-out;

      .material-symbols-outlined {
        font-size: 1.1rem;
        color: #dc2626;
        flex-shrink: 0;
        margin-top: 1px;
      }

      .error-text {
        display: flex;
        flex-direction: column;
        gap: 2px;

        .error-title {
          font-size: 0.83rem;
          font-weight: 700;
          color: #991b1b;
        }

        .error-sub {
          font-size: 0.77rem;
          font-weight: 400;
          color: #b91c1c;
          opacity: 0.85;
        }
      }
    }
    @keyframes shakeIn {
      0%   { opacity: 0; transform: translateX(-6px); }
      40%  { transform: translateX(4px); }
      70%  { transform: translateX(-2px); }
      100% { opacity: 1; transform: translateX(0); }
    }

    .sheet-actions { display: flex; gap: 10px; margin-top: 4px; }
    .sheet-btn {
      flex: 1; padding: 13px; border-radius: var(--radius-lg);
      font-weight: 700; font-size: 0.9rem; cursor: pointer; font-family: inherit;
      transition: var(--transition);
    }
    .cancel-btn { background: var(--surface-muted); border: 1.5px solid rgba(0,0,0,0.08); color: var(--text-secondary);
      &:hover { border-color: var(--text-muted); }
    }
    .confirm-btn {
      background: var(--primary); color: white; border: none;
      box-shadow: var(--shadow-primary);
      &:hover:not(:disabled) { background: var(--primary-dark); }
      &:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }
    }

    /* ─── Toast ───────────────────────────── */
    .toast-wrap {
      position: fixed;
      top: 14px;
      left: 16px;
      right: 16px;
      z-index: 9999;
      pointer-events: none;
      display: flex;
      flex-direction: column;
      gap: 8px;
      align-items: center;
    }
    .toast {
      background: white;
      color: #7f1d1d;
      padding: 12px 16px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.85rem;
      font-weight: 600;
      box-shadow: 0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(220,38,38,0.15);
      border: 1.5px solid rgba(220,38,38,0.18);
      opacity: 0;
      transform: translateY(-20px) scale(0.95);
      transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      max-width: 400px;
      width: 100%;

      .material-symbols-outlined {
        font-size: 1.2rem;
        flex-shrink: 0;
        color: #dc2626;
        background: rgba(220,38,38,0.1);
        border-radius: 50%;
        padding: 4px;
      }

      &.show {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    .error-toast {
      align-items: flex-start;
      gap: 12px;

      div {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      strong {
        font-size: 0.88rem;
        color: #7f1d1d;
      }

      span {
        font-size: 0.78rem;
        color: #b91c1c;
        font-weight: 400;
      }
    }
  `]
})
export class UserProductDetailsComponent {
  route = inject(ActivatedRoute);
  router = inject(Router);
  dataService = inject(DataService);

  paramMap = toSignal(this.route.paramMap);

  product = computed(() => {
    const params = this.paramMap();
    if (!params) return null;
    const id = params.get('id');
    if (!id) return null;
    return this.dataService.products().find(p => p.id === id) || null;
  });

  isQtySheetOpen = signal(false);
  selectedQty = signal<number>(0);
  cartStockError = signal<{ show: boolean; maxAllowed: number; cartQty: number } | null>(null);

  getCategoryName(id: string): string {
    const cat = this.dataService.categories().find(c => c.id === id);
    return cat ? cat.name : '';
  }

  goBack() { this.router.navigate(['/shop']); }
  openQtySheet() { this.selectedQty.set(0); this.isQtySheetOpen.set(true); }
  closeQtySheet() { this.isQtySheetOpen.set(false); }

  addToCart() {
    const prod = this.product();
    if (prod && this.selectedQty() > 0) {
      const currentCartItem = this.dataService.cart().find(i => i.productId === prod.id);
      const currentCartQty = currentCartItem ? currentCartItem.quantity : 0;
      const totalRequested = currentCartQty + this.selectedQty();

      if (totalRequested > prod.stock) {
        const maxAllowed = Math.max(0, prod.stock - currentCartQty);
        this.cartStockError.set({ show: true, maxAllowed, cartQty: currentCartQty });
        setTimeout(() => this.cartStockError.set(null), 4000);
        return;
      }

      this.dataService.addToCart(prod.id, this.selectedQty());
      this.closeQtySheet();
      setTimeout(() => this.router.navigate(['/shop/cart']), 300);
    }
  }
}
