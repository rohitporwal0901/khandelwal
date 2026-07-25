import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../core/services/data.service';

// Slides are now fetched dynamically from DataService

@Component({
  selector: 'app-user-home',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="home-container">

      <!-- ─── Initial Loading / Placeholder Banner ─── -->
      <div class="hero-start-banner" *ngIf="slides().length === 0">
        <div class="banner-content">
          <div class="brand-badge">Premium Collection</div>
          <h2 class="brand-title">Khandelwal Cards</h2>
          <p class="brand-subtitle">Crafting Memories with Elegance</p>
          <div class="shimmer-line"></div>
        </div>
      </div>

      <!-- ─── Hero Slider (Crossfade) ──────────── -->
      <div class="hero-slider"
           *ngIf="slides().length > 0"
           (touchstart)="onTouchStart($event)"
           (touchend)="onTouchEnd($event)">

        <div class="slide"
             *ngFor="let slide of slides(); let i = index"
             [style.background]="slide.bg || '#000'"
             [class.active]="activeDotIndex() === i">
          
          <div class="skeleton-loader" *ngIf="!loadedImages()[slide.id]"></div>
          
          <img class="slide-img" 
               [src]="slide.img" 
               [alt]="slide.title" 
               loading="lazy"
               (load)="onImageLoad(slide.id)"
               [class.img-loaded]="loadedImages()[slide.id]">
               
          <div class="slide-overlay"></div>
          <div class="slide-content">
            <span class="slide-tag">{{ slide.tag }}</span>
            <h2>{{ slide.title }}</h2>
            <p>{{ slide.subtitle }}</p>
          </div>
        </div>

        <!-- Dots -->
        <div class="slider-dots">
          <button class="dot" *ngFor="let slide of slides(); let i = index"
                  [class.active]="activeDotIndex() === i"
                  (click)="goToSlide(i)" [attr.aria-label]="'Slide ' + (i+1)">
          </button>
        </div>
      </div>

      <!-- ─── Search Bar ─────────────────────── -->
      <div class="search-section">
        <div class="search-box">
          <span class="material-symbols-outlined search-icon">search</span>
          <input type="text" placeholder="Search by SKU or name..."
                 [ngModel]="searchQuery()" (ngModelChange)="onSearch($event)">
          <button class="search-clear" *ngIf="searchQuery()" (click)="onSearch('')">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>

      <!-- ─── Categories ─────────────────────── -->
      <div class="categories-section">
        <div class="category-scroll">
          <button class="category-pill" [class.active]="selectedCategory() === null"
                  (click)="selectCategory(null)">
            <span class="material-symbols-outlined pill-icon">apps</span>
            All
          </button>
          <button class="category-pill"
                  *ngFor="let cat of categories()"
                  [class.active]="selectedCategory() === cat.id"
                  (click)="selectCategory(cat.id)">
            {{ cat.name }}
          </button>
        </div>
      </div>

      <!-- ─── Products ───────────────────────── -->
      <div class="products-section">
        <div class="section-header">
          <h3 *ngIf="!selectedCategory()">All Products</h3>
          <h3 *ngIf="selectedCategory()">{{ getCategoryName(selectedCategory()!) }}</h3>
          <span class="product-count" *ngIf="dataService.isProductsLoaded() && !isFiltering()">
            {{ filteredProducts().length }} items
          </span>
        </div>

        <!-- Skeleton -->
        <div class="products-grid" *ngIf="!dataService.isProductsLoaded() || isFiltering()">
          <div class="product-card skeleton-card" *ngFor="let i of [1,2,3,4,5,6,7,8]">
            <div class="card-img-wrap">
              <div class="skeleton-pulse" style="position:absolute;inset:0;"></div>
            </div>
            <div class="card-body">
              <div class="skeleton-pulse skeleton-line" style="width:45%;height:8px;border-radius:4px;margin-bottom:6px;"></div>
              <div class="skeleton-pulse skeleton-line" style="width:90%;height:11px;border-radius:4px;margin-bottom:4px;"></div>
              <div class="skeleton-pulse skeleton-line" style="width:70%;height:11px;border-radius:4px;margin-bottom:8px;"></div>
              <div style="display:flex;align-items:center;gap:6px;margin-top:2px;">
                <div class="skeleton-pulse" style="width:8px;height:8px;border-radius:50%;flex-shrink:0;"></div>
                <div class="skeleton-pulse skeleton-line" style="width:55%;height:8px;border-radius:4px;"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Products -->
        <div class="products-grid" *ngIf="dataService.isProductsLoaded() && !isFiltering()">
          <div class="product-card"
               *ngFor="let prod of filteredProducts()"
               [routerLink]="['/shop/product', prod.id]">
            <div class="card-img-wrap" [class.out-of-stock]="prod.stock === 0">
              <div class="img-skeleton skeleton-pulse" *ngIf="!loadedImages()[prod.id]"></div>
              <img [src]="prod.images[0]" [alt]="prod.name"
                   [class.loaded]="loadedImages()[prod.id]"
                   [class.grayscale]="prod.stock === 0"
                   (load)="onImageLoad(prod.id)" loading="lazy">
              <div class="sku-chip">{{ prod.sku }}</div>
              <div class="oos-badge" *ngIf="prod.stock === 0">Out of Stock</div>
            </div>
            <div class="card-body">
              <span class="card-cat">{{ getCategoryName(prod.categoryId) }}</span>
              <h4 class="card-title">{{ prod.name }}</h4>
              <div class="card-stock" *ngIf="prod.stock > 0">
                <span class="stock-dot"></span>
                {{ prod.stock }} available
              </div>
            </div>
          </div>
        </div>

        <!-- Empty -->
        <div class="empty-state" *ngIf="dataService.isProductsLoaded() && !isFiltering() && filteredProducts().length === 0">
          <span class="material-symbols-outlined">search_off</span>
          <p>No products found</p>
          <button class="btn-reset" (click)="selectCategory(null); onSearch('')">Clear filters</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .home-container { padding-bottom: 1rem; background: var(--background); }

    /* ─── Hero Start Banner ────────────────────── */
    .hero-start-banner {
      width: 100%;
      height: 210px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #4a0000 0%, #8B0000 100%);
      position: relative;
      overflow: hidden;
    }
    
    .hero-start-banner::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at center, rgba(212, 175, 55, 0.15) 0%, transparent 70%);
      animation: pulseGlow 3s ease-in-out infinite alternate;
    }

    @keyframes pulseGlow {
      0% { opacity: 0.5; transform: scale(0.9); }
      100% { opacity: 1; transform: scale(1.1); }
    }

    .banner-content {
      position: relative;
      text-align: center;
      z-index: 2;
      padding: 0 20px;
    }

    .brand-badge {
      display: inline-block;
      color: #D4AF37;
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 8px;
      border: 1px solid rgba(212, 175, 55, 0.4);
      padding: 4px 12px;
      border-radius: 20px;
      background: rgba(0, 0, 0, 0.2);
    }

    .brand-title {
      font-size: 1.8rem;
      font-weight: 800;
      margin: 0 0 5px;
      color: #fff;
      background: linear-gradient(to right, #FFF, #D4AF37, #FFF);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-size: 200% auto;
      animation: shineText 4s linear infinite;
    }

    @keyframes shineText {
      to { background-position: 200% center; }
    }

    .brand-subtitle {
      font-size: 0.8rem;
      color: rgba(255, 255, 255, 0.85);
      margin: 0;
      font-weight: 400;
      letter-spacing: 0.5px;
    }

    .shimmer-line {
      width: 60px;
      height: 2px;
      background: linear-gradient(90deg, transparent, #D4AF37, transparent);
      margin: 12px auto 0;
      position: relative;
      overflow: hidden;
    }
    
    .shimmer-line::after {
      content: '';
      position: absolute;
      top: 0; left: -100%;
      width: 50%; height: 100%;
      background: linear-gradient(90deg, transparent, #fff, transparent);
      animation: shimmerLine 2s infinite;
    }

    @keyframes shimmerLine {
      100% { left: 200%; }
    }

    /* ─── Hero Slider ─────────────────────────── */
    .hero-slider {
      position: relative;
      width: 100%;
      height: 210px;
      overflow: hidden;
      background: #8B0000;
    }
    /* All slides stacked absolutely — only .active is visible */
    .slide {
      position: absolute;
      inset: 0;
      opacity: 0;
      transition: opacity 0.7s ease-in-out;
      pointer-events: none;
      overflow: hidden;

      &.active {
        opacity: 1;
        pointer-events: auto;
        z-index: 1;
      }
    }
    .slide-img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0;
      transition: opacity 0.5s ease;
      z-index: 2;
      
      &.img-loaded {
        opacity: 0.45;
      }
    }
    
    .skeleton-loader {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: skeletonLoading 1.5s infinite;
      z-index: 1;
    }
    
    @keyframes skeletonLoading {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    .slide-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.1) 60%);
    }
    .slide-content {
      position: absolute;
      bottom: 36px;
      left: 20px;
      right: 20px;
      color: white;
      z-index: 2;

      .slide-tag {
        display: inline-block;
        background: rgba(255,255,255,0.2);
        backdrop-filter: blur(8px);
        color: white;
        font-size: 0.65rem;
        font-weight: 700;
        letter-spacing: 0.8px;
        text-transform: uppercase;
        padding: 3px 10px;
        border-radius: 999px;
        margin-bottom: 8px;
        border: 1px solid rgba(255,255,255,0.25);
      }

      h2 {
        font-size: 1.35rem;
        font-weight: 800;
        color: white;
        margin: 0 0 4px;
        line-height: 1.25;
        letter-spacing: -0.3px;
      }

      p {
        font-size: 0.8rem;
        color: rgba(255,255,255,0.85);
        margin: 0;
        font-weight: 400;
      }
    }
    .slider-dots {
      position: absolute;
      bottom: 12px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 5px;
      z-index: 10;
    }
    .dot {
      width: 6px;
      height: 6px;
      border-radius: 999px;
      background: rgba(255,255,255,0.4);
      border: none;
      padding: 0;
      cursor: pointer;
      transition: all 0.3s ease;

      &.active {
        background: white;
        width: 20px;
      }
    }

    /* ─── Search ──────────────────────────────── */
    .search-section {
      padding: 14px var(--space-base) 0;
    }
    .search-box {
      display: flex;
      align-items: center;
      background: var(--surface);
      border: 1.5px solid rgba(0,0,0,0.08);
      border-radius: var(--radius-xl);
      padding: 0 14px;
      height: 46px;
      gap: 10px;
      box-shadow: var(--shadow-xs);
      transition: border-color 0.2s, box-shadow 0.2s;

      &:focus-within {
        border-color: var(--primary);
        box-shadow: 0 0 0 3px rgba(139,0,0,0.08);
      }

      .search-icon { color: var(--text-muted); font-size: 1.2rem; flex-shrink: 0; }

      input {
        flex: 1;
        border: none;
        outline: none;
        font-size: 0.9rem;
        color: var(--text-main);
        background: transparent;
        font-family: inherit;
        &::placeholder { color: var(--text-muted); }
      }

      .search-clear {
        background: none; border: none; padding: 0; cursor: pointer;
        color: var(--text-muted); display: flex; align-items: center;
        .material-symbols-outlined { font-size: 1.1rem; }
        &:hover { color: var(--text-main); }
      }
    }

    /* ─── Categories ──────────────────────────── */
    .categories-section {
      padding: 14px 0 2px;
    }
    .category-scroll {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding: 2px var(--space-base) 8px;
      &::-webkit-scrollbar { display: none; }
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
    .category-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 7px 14px;
      background: var(--surface);
      border: 1.5px solid rgba(0,0,0,0.08);
      border-radius: 999px;
      white-space: nowrap;
      font-weight: 500;
      font-size: 0.82rem;
      cursor: pointer;
      box-shadow: var(--shadow-xs);
      transition: all 0.2s ease;
      color: var(--text-secondary);
      font-family: inherit;

      .pill-icon { font-size: 0.95rem; }

      &.active {
        background: var(--primary);
        color: white;
        border-color: var(--primary);
        box-shadow: 0 4px 12px rgba(139,0,0,0.25);
        .pill-icon { color: white; }
      }

      &:not(.active):hover {
        border-color: var(--primary);
        color: var(--primary);
      }
    }

    /* ─── Products Section ────────────────────── */
    .products-section { padding: 4px var(--space-base) 0; }

    .section-header {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      margin-bottom: 12px;
      h3 { font-size: 1rem; font-weight: 700; margin: 0; color: var(--text-main); }
      .product-count {
        font-size: 0.75rem;
        color: var(--text-muted);
        font-weight: 500;
      }
    }

    /* ─── Grid ────────────────────────────────── */
    .products-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    /* ─── Product Card ────────────────────────── */
    .product-card {
      background: var(--surface);
      border-radius: var(--radius-lg);
      overflow: hidden;
      box-shadow: var(--shadow-card);
      border: 1px solid rgba(0,0,0,0.04);
      cursor: pointer;
      transition: transform 0.22s ease, box-shadow 0.22s ease;
      display: flex;
      flex-direction: column;
      text-decoration: none;
      color: inherit;

      &:active {
        transform: scale(0.97);
        box-shadow: var(--shadow-xs);
      }
    }

    .card-img-wrap {
      position: relative;
      width: 100%;
      aspect-ratio: 4 / 3;
      background: #f0f0f0;
      overflow: hidden;

      img {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: opacity 0.35s ease;
        z-index: 1;

        &.loaded { opacity: 1; }
        &.grayscale { filter: grayscale(80%) brightness(0.85); }
      }

      &.out-of-stock img { opacity: 0.5; }
    }

    .img-skeleton {
      position: absolute;
      inset: 0;
      z-index: 0;
      border-radius: 0;
    }

    .sku-chip {
      position: absolute;
      bottom: 8px;
      left: 8px;
      background: rgba(255,255,255,0.92);
      backdrop-filter: blur(6px);
      color: var(--primary-dark);
      font-size: 0.6rem;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      letter-spacing: 0.4px;
      z-index: 5;
      box-shadow: 0 1px 4px rgba(0,0,0,0.1);
    }

    .oos-badge {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.38);
      color: white;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      z-index: 6;
    }

    .card-body {
      padding: 10px 10px 12px;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .card-cat {
      font-size: 0.6rem;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--text-muted);
      letter-spacing: 0.5px;
    }
    .card-title {
      font-size: 0.82rem;
      font-weight: 700;
      color: var(--text-main);
      margin: 0;
      line-height: 1.35;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .card-stock {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 0.7rem;
      color: var(--success);
      font-weight: 500;
      margin-top: 4px;
      .stock-dot {
        width: 6px; height: 6px;
        border-radius: 50%;
        background: var(--success);
        flex-shrink: 0;
      }
    }

    /* ─── Skeleton ────────────────────────────── */
    .skeleton-card {
      pointer-events: none;
      cursor: default;
    }
    .skeleton-card .card-img-wrap {
      aspect-ratio: 4 / 3;
      background: #ebebeb;
    }
    .skeleton-line { display: block; }
    .skeleton-pulse {
      background: linear-gradient(90deg, #f0f0f0 25%, #e4e4e4 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: shimmer 1.4s infinite ease-in-out;
    }
    @keyframes shimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* ─── Empty State ─────────────────────────── */
    .empty-state {
      text-align: center;
      padding: 3rem 1rem;
      color: var(--text-muted);

      .material-symbols-outlined { font-size: 3rem; opacity: 0.4; display: block; margin-bottom: 0.75rem; }
      p { margin-bottom: 1rem; font-size: 0.95rem; }
    }
    .btn-reset {
      background: rgba(139,0,0,0.07);
      color: var(--primary);
      border: none;
      padding: 8px 20px;
      border-radius: 999px;
      font-weight: 600;
      font-size: 0.85rem;
      cursor: pointer;
      font-family: inherit;
      transition: background 0.2s;
      &:hover { background: rgba(139,0,0,0.12); }
    }
  `]
})
export class UserHomeComponent implements OnInit, OnDestroy {
  dataService = inject(DataService);
  slides = computed(() => this.dataService.homeSlides().filter(s => s.status === 'active'));

  categories = this.dataService.categories;
  products = this.dataService.products;

  currentSlide = signal(0);
  activeDotIndex = computed(() => this.currentSlide());

  selectedCategory = signal<string | null>(null);
  searchQuery = signal<string>('');
  loadedImages = signal<Record<string, boolean>>({});
  isFiltering = signal<boolean>(false);

  private filterTimeout: any;
  private sliderInterval: any;
  private touchStartX = 0;

  ngOnInit() {
    this.startAutoPlay();
  }

  private startAutoPlay() {
    if (this.sliderInterval) clearInterval(this.sliderInterval);
    this.sliderInterval = setInterval(() => this.advance(), 4000);
  }

  /** Move to next slide — simple modulo, fade handles the loop */
  private advance() {
    if (this.slides().length === 0) return;
    this.currentSlide.update(s => (s + 1) % this.slides().length);
  }

  ngOnDestroy() {
    if (this.sliderInterval) clearInterval(this.sliderInterval);
    if (this.filterTimeout) clearTimeout(this.filterTimeout);
  }

  goToSlide(index: number) {
    this.currentSlide.set(index);
    this.startAutoPlay();
  }

  onTouchStart(e: TouchEvent) {
    this.touchStartX = e.changedTouches[0].screenX;
  }

  onTouchEnd(e: TouchEvent) {
    const diff = this.touchStartX - e.changedTouches[0].screenX;
    if (Math.abs(diff) > 40 && this.slides().length > 0) {
      if (diff > 0) {
        // swipe left → next
        const next = (this.activeDotIndex() + 1) % this.slides().length;
        this.goToSlide(next);
      } else {
        // swipe right → prev
        const prev = (this.activeDotIndex() - 1 + this.slides().length) % this.slides().length;
        this.goToSlide(prev);
      }
    }
  }

  onImageLoad(id: string) {
    this.loadedImages.update(current => ({ ...current, [id]: true }));
  }

  filteredProducts = computed(() => {
    const cat = this.selectedCategory();
    const query = this.searchQuery().toLowerCase().trim();
    let list = this.products().filter(p => p.status === 'active');
    if (cat) list = list.filter(p => p.categoryId === cat);
    if (query) list = list.filter(p =>
      p.name.toLowerCase().includes(query) ||
      (p.sku && p.sku.toLowerCase().includes(query))
    );
    return list.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
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

  private triggerLoading() {
    this.isFiltering.set(true);
    if (this.filterTimeout) clearTimeout(this.filterTimeout);
    this.filterTimeout = setTimeout(() => this.isFiltering.set(false), 800);
  }

  getCategoryName(id: string): string {
    const cat = this.categories().find(c => c.id === id);
    return cat ? cat.name : '';
  }
}
