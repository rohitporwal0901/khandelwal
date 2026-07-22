import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DataService, Product } from '../../core/services/data.service';
import { ImageGalleryComponent } from '../../shared/image-gallery/image-gallery.component';
import { BottomSheetComponent } from '../../shared/bottom-sheet/bottom-sheet.component';
import { FormsModule } from '@angular/forms';

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
          
          <div class="price-placeholder">
            <span class="price-value">Enquire for Price</span>
          </div>
          
          <div class="action-buttons">
            <button class="btn btn-outline w-100 mb-3 select-qty-btn" (click)="openQtySheet()">
              Add to cart
            </button>
            <button class="btn btn-primary w-100 select-qty-btn" (click)="openQtySheet()">
              Buy it now
            </button>
          </div>
          
          <div class="description-section">
            <p>{{ prod.description }}</p>
          </div>
          
          <div class="accordions mt-4">
            <div class="accordion-item">
              <div class="accordion-header">
                <span class="material-symbols-outlined icon">local_shipping</span>
                <span>Shipping</span>
                <span class="material-symbols-outlined arrow">expand_more</span>
              </div>
            </div>
            <div class="accordion-item">
              <div class="accordion-header">
                <span class="material-symbols-outlined icon">straighten</span>
                <span>Sizing</span>
                <span class="material-symbols-outlined arrow">expand_more</span>
              </div>
            </div>
            <div class="accordion-item">
              <div class="accordion-header">
                <span class="material-symbols-outlined icon">favorite</span>
                <span>Care Instructions</span>
                <span class="material-symbols-outlined arrow">expand_more</span>
              </div>
            </div>
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
        
        <div class="custom-qty mt-4">
          <label class="form-label">Custom Quantity</label>
          <input type="number" class="form-control" [ngModel]="selectedQty()" (ngModelChange)="selectedQty.set($event)" min="1">
        </div>
        
        <div class="sheet-actions mt-4">
          <button class="btn btn-outline" (click)="closeQtySheet()">Cancel</button>
          <button class="btn btn-primary" [disabled]="selectedQty() < 1" (click)="addToCart()">
            Apply & Add to Cart
          </button>
        </div>
      </div>
    </app-bottom-sheet>
    
    <div class="not-found" *ngIf="!product() && !isLoading()">
      <h3>Product not found</h3>
      <button class="btn btn-primary mt-3" (click)="goBack()">Go Back</button>
    </div>
  `,
  styles: [`
    .product-details-container {
      padding-bottom: 80px; /* Space for fixed bottom CTA */
    }
    
    .back-btn-wrapper {
      position: absolute;
      top: 1rem;
      left: 1rem;
      z-index: 100;
      
      .btn-icon {
        background: rgba(255, 255, 255, 0.9);
        box-shadow: var(--shadow-md);
        border: none;
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
      padding: 1.5rem;
      background: var(--surface);
    }
    
    .product-title {
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      line-height: 1.2;
    }
    
    .sku-text {
      color: var(--text-muted);
      font-size: 0.9rem;
      margin-bottom: 1rem;
    }
    
    .price-placeholder {
      margin-bottom: 1.5rem;
      .price-value {
        font-size: 1.25rem;
        font-weight: 600;
      }
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
    
    .accordion-item {
      border-top: 1px solid rgba(0,0,0,0.1);
      
      &:last-child {
        border-bottom: 1px solid rgba(0,0,0,0.1);
      }
    }
    
    .accordion-header {
      display: flex;
      align-items: center;
      padding: 1rem 0;
      cursor: pointer;
      
      .icon {
        margin-right: 0.75rem;
        font-size: 1.25rem;
        color: #000;
      }
      
      span:not(.icon):not(.arrow) {
        flex: 1;
        font-weight: 600;
        font-size: 0.95rem;
      }
      
      .arrow {
        color: var(--text-muted);
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
    
    .not-found {
      padding: 3rem 1.5rem;
      text-align: center;
    }
  `]
})
export class UserProductDetailsComponent implements OnInit {
  route = inject(ActivatedRoute);
  router = inject(Router);
  dataService = inject(DataService);
  
  product = signal<Product | null>(null);
  isLoading = signal(true);
  
  isQtySheetOpen = signal(false);
  selectedQty = signal<number>(100);

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        const prod = this.dataService.products().find(p => p.id === id);
        if (prod) {
          this.product.set(prod);
        }
      }
      this.isLoading.set(false);
    });
  }

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
    if (prod && this.selectedQty() > 0) {
      this.dataService.addToCart(prod.id, this.selectedQty());
      this.closeQtySheet();
      
      // Optional: Add a toast notification here
      setTimeout(() => {
        this.router.navigate(['/shop/cart']);
      }, 300);
    }
  }
}
