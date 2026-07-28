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
  templateUrl: './user-product-details.component.html',
  styleUrls: ['./user-product-details.component.css']
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
