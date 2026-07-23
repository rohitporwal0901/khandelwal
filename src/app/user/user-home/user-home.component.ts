import { Component, inject, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../core/services/data.service';

@Component({
  selector: 'app-user-home',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="home-container">
      <div class="hero-section">
        <h2>Find Your Perfect Match</h2>
        <p>Premium printing products for your special occasions.</p>
        
        <div class="search-box">
          <span class="material-symbols-outlined">search</span>
          <input type="text" placeholder="Search by  SKU..." [ngModel]="searchQuery()" (ngModelChange)="onSearch($event)">
        </div>
      </div>
      
      <div class="categories-section">
        <h3>Categories</h3>
        <div class="category-scroll">
          <div class="category-pill" 
               [class.active]="selectedCategory() === null"
               (click)="selectCategory(null)">
            All
          </div>
          <div class="category-pill" 
               *ngFor="let cat of categories()"
               [class.active]="selectedCategory() === cat.id"
               (click)="selectCategory(cat.id)">
            {{ cat.name }}
          </div>
        </div>
      </div>
      
      <div class="products-section">
        <h3 *ngIf="selectedCategory()">
          {{ getCategoryName(selectedCategory()!) }}
        </h3>
        <h3 *ngIf="!selectedCategory()">All Products</h3>
        
        <div class="products-grid skeleton-grid" *ngIf="!dataService.isProductsLoaded() || isFiltering()">
          <div class="product-card" *ngFor="let i of [1,2,3,4,5,6,7,8,9,10]">
            <div class="img-wrapper skeleton-text" style="border-radius: 0;"></div>
            <div class="product-info">
              <div class="skeleton-text" style="height: 10px; width: 40%; margin-bottom: 8px;"></div>
              <div class="skeleton-text" style="height: 18px; width: 80%;"></div>
            </div>
          </div>
        </div>
        
        <div class="products-grid" *ngIf="dataService.isProductsLoaded() && !isFiltering()">
          <div class="product-card" *ngFor="let prod of filteredProducts()" [routerLink]="['/shop/product', prod.id]">
            <div class="img-wrapper">
              <div class="skeleton-text" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; border-radius: 0; z-index: 1;" *ngIf="!loadedImages()[prod.id]"></div>
              <img [src]="prod.images[0]" [alt]="prod.name" [class.grayscale]="prod.stock === 0"
                   [class.loaded]="loadedImages()[prod.id]" (load)="onImageLoad(prod.id)">
              <div class="sku-badge">{{ prod.sku }}</div>
              <div class="out-of-stock-overlay" *ngIf="prod.stock === 0">
                OUT OF STOCK
              </div>
            </div>
            <div class="product-info">
              <span class="category-label">{{ getCategoryName(prod.categoryId) }}</span>
              <h4>{{ prod.name }}</h4>
              <div class="stock-label" *ngIf="prod.stock > 0">
                <span class="material-symbols-outlined">inventory_2</span> {{ prod.stock }} Available
              </div>
            </div>
          </div>
        </div>
        
        <div class="empty-state" *ngIf="dataService.isProductsLoaded() && !isFiltering() && filteredProducts().length === 0">
          <span class="material-symbols-outlined">inventory_2</span>
          <p>No products found in this category.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .home-container {
      padding-bottom: 2rem;
    }
    
    .hero-section {
      padding: 2rem 1.5rem;
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
      color: white;
      border-radius: 0 0 1.5rem 1.5rem;
      
      h2 {
        font-size: 1.75rem;
        margin-bottom: 0.5rem;
        color: white;
      }
      
      p {
        opacity: 0.9;
        margin-bottom: 1.5rem;
      }
    }
    
    .search-box {
      display: flex;
      align-items: center;
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: var(--border-radius-lg);
      padding: 0.75rem 1rem;
      
      span {
        color: white;
        margin-right: 0.5rem;
      }
      
      input {
        background: transparent;
        border: none;
        outline: none;
        color: white;
        width: 100%;
        font-size: 1rem;
        
        &::placeholder {
          color: rgba(255, 255, 255, 0.7);
        }
      }
    }
    
    .categories-section {
      padding: 1.5rem 0 0;
      
      h3 {
        padding: 0 1.5rem;
        margin-bottom: 1rem;
      }
    }
    
    .category-scroll {
      display: flex;
      gap: 0.75rem;
      overflow-x: auto;
      padding: 0 1.5rem 0.5rem;
      
      /* Hide scrollbar for cleaner look on mobile */
      &::-webkit-scrollbar { display: none; }
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
    
    .category-pill {
      padding: 0.5rem 1rem;
      background: var(--surface);
      border: 1px solid rgba(0,0,0,0.05);
      border-radius: 20px;
      white-space: nowrap;
      font-weight: 500;
      cursor: pointer;
      box-shadow: var(--shadow-sm);
      transition: var(--transition);
      
      &.active {
        background: var(--primary);
        color: white;
        border-color: var(--primary);
      }
    }
    
    .products-section {
      padding: 1.5rem;
      
      h3 { margin-bottom: 1rem; }
    }
    
    .products-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
    }
    
    .product-card {
      background: var(--surface);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(0,0,0,0.06);
      border: 1px solid rgba(0,0,0,0.02);
      text-decoration: none;
      color: inherit;
      display: flex;
      flex-direction: column;
      transition: transform 0.25s ease, box-shadow 0.25s ease;
      
      &:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 24px rgba(0,0,0,0.1);
      }
      
      .img-wrapper {
        position: relative;
        width: 100%;
        height: 180px;
        background: var(--background);
        overflow: hidden;
        
        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.4s ease, filter 0.3s ease, opacity 0.3s ease;
          opacity: 0;
          z-index: 2;
          position: relative;
          
          &.loaded {
            opacity: 1;
          }
          
          &.grayscale {
            filter: grayscale(100%) opacity(0.7);
          }
        }
        
        .out-of-stock-overlay {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(0,0,0,0.7);
          color: white;
          font-weight: 700;
          font-size: 0.85rem;
          padding: 8px 16px;
          border-radius: 4px;
          letter-spacing: 1px;
          white-space: nowrap;
          z-index: 2;
        }
        
        .sku-badge {
          position: absolute;
          bottom: 10px;
          left: 10px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(4px);
          color: var(--primary-dark);
          font-size: 0.65rem;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: 6px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.08);
          letter-spacing: 0.5px;
          z-index: 10;
        }
      }
      
      &:hover .img-wrapper img {
        transform: scale(1.06);
      }
      
      .product-info {
        padding: 0.85rem;
        
        .category-label {
          font-size: 0.65rem;
          color: var(--text-muted);
          font-weight: 600;
          text-transform: uppercase;
          margin-bottom: 0.3rem;
          display: block;
          letter-spacing: 0.5px;
        }
        
        h4 {
          margin: 0;
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-main);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          line-height: 1.3;
        }
        
        .stock-label {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 0.5rem;
          
          span {
            font-size: 0.9rem;
          }
        }
      }
    }
    
    .empty-state {
      text-align: center;
      padding: 3rem 1rem;
      color: var(--text-muted);
      
      span {
        font-size: 3rem;
        opacity: 0.5;
        margin-bottom: 1rem;
      }
    }
    
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
    
    .loader-text {
      font-weight: 600;
      color: var(--primary-dark);
      letter-spacing: 0.5px;
      margin-top: 1.5rem;
      animation: pulse-text 2s infinite ease-in-out;
    }
    
    @keyframes pulse-text {
      0%, 100% { opacity: 0.7; }
      50% { opacity: 1; }
    }
    
    /* Skeleton Loading Styles */
    .skeleton-text {
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%) !important;
      background-size: 200% 100% !important;
      animation: skeletonLoading 1.5s infinite;
      border-radius: 4px;
    }
    @keyframes skeletonLoading {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    
    .spinner-small {
      width: 24px;
      height: 24px;
      border: 3px solid rgba(128, 0, 0, 0.1);
      border-radius: 50%;
      border-top-color: var(--primary);
      animation: spin 1s ease-in-out infinite;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class UserHomeComponent {
  dataService = inject(DataService);

  categories = this.dataService.categories;
  products = this.dataService.products;

  selectedCategory = signal<string | null>(null);
  searchQuery = signal<string>('');
  loadedImages = signal<Record<string, boolean>>({});
  isFiltering = signal<boolean>(false);
  filterTimeout: any;

  triggerLoading() {
    this.isFiltering.set(true);
    if (this.filterTimeout) {
      clearTimeout(this.filterTimeout);
    }
    this.filterTimeout = setTimeout(() => {
      this.isFiltering.set(false);
    }, 1500); // 1.5 seconds feels more natural than a strict 2s
  }

  onImageLoad(id: string) {
    this.loadedImages.update(current => ({ ...current, [id]: true }));
  }

  filteredProducts = computed(() => {
    const cat = this.selectedCategory();
    const query = this.searchQuery().toLowerCase().trim();

    let activeProducts = this.products().filter(p => p.status === 'active');

    if (cat) {
      activeProducts = activeProducts.filter(p => p.categoryId === cat);
    }

    if (query) {
      activeProducts = activeProducts.filter(p =>
        p.name.toLowerCase().includes(query) ||
        (p.sku && p.sku.toLowerCase().includes(query))
      );
    }

    return activeProducts;
  });

  selectCategory(id: string | null) {
    if (this.selectedCategory() !== id) {
      this.selectedCategory.set(id);
      this.triggerLoading();
    }
  }

  onSearch(val: string) {
    this.searchQuery.set(val);
    this.triggerLoading();
  }

  getCategoryName(id: string): string {
    const cat = this.categories().find(c => c.id === id);
    return cat ? cat.name : '';
  }
}
