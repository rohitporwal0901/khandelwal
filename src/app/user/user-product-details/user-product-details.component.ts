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
    <div class="product-details-container" *ngIf="product() as prod">
      <div class="back-btn-wrapper">
        <button class="btn-icon" (click)="goBack()">
          <span class="material-symbols-outlined">arrow_back</span>
        </button>
      </div>
      
      <div class="desktop-layout">
        <div class="gallery-column">
          <app-image-gallery [images]="prod.images"></app-image-gallery>
        </div>
        
        <div class="info-column">
          <h2 class="product-title">{{ prod.name }}</h2>
          <p class="sku-text">SKU: {{ prod.sku }}</p>
          
          <div class="action-buttons myntra-actions">
            <button class="btn-myntra btn-outline-myntra" (click)="openQtySheet()" [disabled]="prod.stock === 0" [class.disabled-btn]="prod.stock === 0">
              <span class="material-symbols-outlined" *ngIf="prod.stock > 0">shopping_bag</span>
              <span class="material-symbols-outlined" *ngIf="prod.stock === 0">block</span>
              {{ prod.stock === 0 ? 'OUT OF STOCK' : 'ADD TO BAG' }}
            </button>
            <button class="btn-myntra btn-primary-myntra" (click)="openQtySheet()" *ngIf="prod.stock > 0">
              <span class="material-symbols-outlined">flash_on</span>
              BUY IT NOW
            </button>
          </div>
          
          <div class="description-section">
            <p>{{ prod.description }}</p>
          </div>
          

        </div>
      </div>
    </div>
    
    <!-- Bulk Quantity Popup -->
    <app-bottom-sheet 
      [isOpen]="isQtySheetOpen()" 
      title="Select Quantity" 
      (close)="closeQtySheet()">
      
      <div class="qty-selector">
        <p class="text-muted text-center mb-4">Choose a preset quantity or enter custom amount for enquiry.</p>
        
        <div class="preset-grid">
          <button class="preset-btn" 
                  *ngFor="let qty of [100, 200, 300, 500, 1000]"
                  [class.active]="selectedQty() === qty"
                  (click)="selectedQty.set(qty)">
            {{ qty }}
          </button>
        </div>
        
        <div class="custom-qty mt-4" *ngIf="product() as prod">
          <label class="form-label">Custom Quantity</label>
          <input type="number" class="form-control" [ngModel]="selectedQty()" (ngModelChange)="selectedQty.set($event)" min="1" [max]="prod.stock">
          
          <!-- Stock Info -->
          <div class="stock-info mt-3" [class.has-error]="selectedQty() > prod.stock">
            <div class="stock-badge">
              <span class="material-symbols-outlined">inventory_2</span>
              Available Stock: {{ prod.stock }}
            </div>
            
            <div class="error-message" *ngIf="selectedQty() > prod.stock">
              <span class="material-symbols-outlined">error</span>
              Cannot select more than available stock ({{ prod.stock }} items).
            </div>
          </div>
        </div>
        
        <div class="sheet-actions mt-4" *ngIf="product() as prod">
          <button class="btn btn-outline" (click)="closeQtySheet()">Cancel</button>
          <button class="btn btn-primary" [disabled]="selectedQty() < 1 || selectedQty() > prod.stock" (click)="addToCart()">
            Apply & Add to Cart
          </button>
        </div>
      </div>
    </app-bottom-sheet>
    
    <div class="initial-loader" *ngIf="!dataService.isProductsLoaded()">
      <span class="spinner-large"></span>
      <p class="loader-text">Loading details...</p>
    </div>
    
    <div class="not-found" *ngIf="dataService.isProductsLoaded() && !product()">
      <h3>Product not found</h3>
      <button class="btn btn-primary mt-3" (click)="goBack()">Go Back</button>
    </div>
  `,
  styles: [`
    .product-details-container {
      position: relative;
      padding-bottom: 80px; /* Space for fixed bottom CTA */
      background: white;
      min-height: 100vh;
    }
    
    .back-btn-wrapper {
      position: absolute;
      top: 1.5rem;
      left: 1.5rem;
      z-index: 100;
      
      .btn-icon {
        background: rgba(255, 255, 255, 0.85);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        border: 1px solid rgba(255,255,255,0.5);
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--primary-dark);
        transition: all 0.3s ease;
        
        &:hover {
          background: white;
          transform: translateY(-2px);
        }
      }
    }
    
    .desktop-layout {
      display: flex;
      flex-direction: column;
    }
    
    .gallery-column {
      width: 100%;
    }
    
    .info-column {
      padding: 1.5rem 1.25rem;
      background: white;
      margin-top: 0;
      position: relative;
      z-index: 10;
    }
    
    .product-title {
      font-size: 1.7rem;
      font-weight: 800;
      margin-bottom: 0.5rem;
      line-height: 1.25;
      color: var(--text-main);
      letter-spacing: -0.5px;
    }
    
    .sku-text {
      color: var(--primary);
      font-size: 0.85rem;
      font-weight: 600;
      margin-bottom: 1.5rem;
      display: inline-block;
      padding: 4px 10px;
      background: rgba(158, 27, 34, 0.05);
      border-radius: 12px;
      border: 1px solid rgba(158, 27, 34, 0.1);
    }
    
    .action-buttons {
      margin-bottom: 2rem;
      
      .btn {
        padding: 1rem;
        font-size: 1.1rem;
        border-radius: 4px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .btn-outline {
        border-color: #000;
        color: #000;
        
        &:hover {
          background: #f8f9fa;
        }
      }
      
      .btn-primary {
        background: #212529;
        border-color: #212529;
        
        &:hover {
          background: #343a40;
        }
      }
    }
    
    .description-section {
      p {
        color: var(--text-muted);
        line-height: 1.6;
        font-size: 0.95rem;
      }
    }
    
    .myntra-actions {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin: 1.5rem 0;
      
      @media (min-width: 768px) {
        flex-direction: row;
      }
    }
    
    .btn-myntra {
      flex: 1;
      padding: 0.85rem 1rem;
      font-size: 0.95rem;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      width: 100%;
      
      span {
        font-size: 1.2rem;
      }
      
      &:active {
        transform: scale(0.98);
      }
    }
    
    .btn-outline-myntra {
      background: white;
      color: #282c3f;
      border: 1px solid #d4d5d9;
      
      &:hover:not(:disabled) {
        border-color: #282c3f;
      }
    }
    
    .disabled-btn {
      opacity: 0.6;
      cursor: not-allowed;
      background: #f5f5f6 !important;
      color: #7e818c !important;
      border-color: #d4d5d9 !important;
      
      &:active {
        transform: none !important;
      }
    }
    
    .btn-primary-myntra {
      background: var(--primary);
      color: white;
      border: 1px solid var(--primary);
      
      &:hover {
        background: var(--primary-dark);
      }
    }
    
    @media (min-width: 768px) {
      .desktop-layout {
        flex-direction: row;
        padding: 2rem;
        gap: 3rem;
        max-width: 1200px;
        margin: 0 auto;
      }
      
      .gallery-column {
        flex: 1;
        max-width: 600px;
      }
      
      .info-column {
        flex: 1;
        padding: 0;
        background: transparent;
      }
      
      .product-details-container {
        padding-bottom: 2rem;
      }
      
      .back-btn-wrapper {
        position: relative;
        top: 0;
        left: 0;
        margin-bottom: 1rem;
        padding: 1rem 2rem 0;
        
        .btn-icon { background: transparent; box-shadow: none; }
      }
    }
    
    .select-qty-btn {
      padding: 1rem;
      font-size: 1.1rem;
      border-radius: var(--border-radius-lg);
    }
    
    /* Quantity Selector Styles */
    .qty-selector {
      .preset-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.75rem;
      }
      
      .preset-btn {
        background: var(--surface);
        border: 1px solid #ced4da;
        padding: 0.75rem;
        border-radius: var(--border-radius-md);
        font-weight: 600;
        cursor: pointer;
        transition: var(--transition);
        
        &:hover {
          border-color: var(--primary);
        }
        
        &.active {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
        }
      }
    }
    
    .sheet-actions {
      display: flex;
      gap: 1rem;
      
      button { flex: 1; }
    }
    
    .mb-4 { margin-bottom: 1.5rem; }
    .mt-4 { margin-top: 1.5rem; }
    .mt-3 { margin-top: 1rem; }
    .w-100 { width: 100%; }
    .text-center { text-align: center; }
    
    .custom-qty input {
      font-size: 1.1rem;
      font-weight: 600;
      padding: 0.75rem;
    }
    
    .stock-info {
      margin-top: 1rem;
      border-radius: 8px;
    }
    
    .stock-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 6px 14px;
      background: #f8f9fa;
      color: var(--text-main);
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 600;
      border: 1px solid rgba(0,0,0,0.05);
      transition: all 0.3s ease;
      
      .material-symbols-outlined {
        font-size: 1.1rem;
        color: var(--primary);
      }
    }
    
    .stock-info.has-error .stock-badge {
      background: rgba(220, 53, 69, 0.05);
      color: #dc3545;
      border-color: rgba(220, 53, 69, 0.2);
      
      .material-symbols-outlined {
        color: #dc3545;
      }
    }
    
    .error-message {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.75rem;
      padding: 10px 12px;
      background: rgba(220, 53, 69, 0.1);
      color: #dc3545;
      font-size: 0.85rem;
      font-weight: 600;
      border-radius: 8px;
      border-left: 4px solid #dc3545;
      animation: slideInError 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      
      .material-symbols-outlined {
        font-size: 1.1rem;
      }
    }
    
    @keyframes slideInError {
      0% { opacity: 0; transform: translateY(-10px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    
    .not-found {
      padding: 3rem 1.5rem;
      text-align: center;
    }
    
    .text-error { color: var(--error, #dc3545); }
    .d-block { display: block; }
    
    .initial-loader {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 5rem 2rem;
      color: var(--primary);
    }
    
    .spinner-large {
      width: 40px;
      height: 40px;
      border: 4px solid rgba(158, 27, 34, 0.1);
      border-radius: 50%;
      border-top-color: var(--primary);
      animation: spin 1s ease-in-out infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
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
  selectedQty = signal<number>(100);

  getCategoryName(id: string): string {
    const cat = this.dataService.categories().find(c => c.id === id);
    return cat ? cat.name : '';
  }

  goBack() {
    this.router.navigate(['/shop']);
  }
  
  openQtySheet() {
    this.isQtySheetOpen.set(true);
  }
  
  closeQtySheet() {
    this.isQtySheetOpen.set(false);
  }
  
  addToCart() {
    const prod = this.product();
    if (prod && this.selectedQty() > 0 && this.selectedQty() <= prod.stock) {
      this.dataService.addToCart(prod.id, this.selectedQty());
      this.closeQtySheet();
      
      // Optional: Add a toast notification here
      setTimeout(() => {
        this.router.navigate(['/shop/cart']);
      }, 300);
    }
  }
}
