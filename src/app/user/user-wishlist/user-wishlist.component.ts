import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DataService } from '../../core/services/data.service';

@Component({
  selector: 'app-user-wishlist',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './user-wishlist.component.html',
  styleUrls: ['./user-wishlist.component.css']
})
export class UserWishlistComponent {
  dataService = inject(DataService);
  
  // Use computed to get full product objects for wishlisted IDs
  wishlistProducts = computed(() => {
    const ids = this.dataService.wishlist();
    const allProducts = this.dataService.products();
    return allProducts.filter(p => ids.includes(p.id));
  });

  removeFromWishlist(e: Event, productId: string) {
    e.preventDefault();
    e.stopPropagation();
    this.dataService.toggleWishlist(productId);
  }

  getCategoryName(id: string): string {
    const cat = this.dataService.categories().find(c => c.id === id);
    return cat ? cat.name : '';
  }
}
