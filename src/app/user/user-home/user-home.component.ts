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
  templateUrl: './user-home.component.html',
  styleUrls: ['./user-home.component.css']
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

  wishlist = computed(() => this.dataService.wishlist());

  toggleWishlist(e: Event, productId: string) {
    e.preventDefault();
    e.stopPropagation();
    this.dataService.toggleWishlist(productId);
  }

  getCategoryName(id: string): string {
    const cat = this.categories().find(c => c.id === id);
    return cat ? cat.name : '';
  }
}
