import { Component, inject, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../core/services/data.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  dataService = inject(DataService);

  isLoading = signal(true);
  skuSearchTerm = signal('');

  // ── Inline Stock Edit State ────────────────────────────────────────────────
  editingProductId = signal<string | null>(null); // Which product row is in edit mode
  editingStockValue = signal<any>(0);              // Temp value while typing (any = supports empty string)
  isSavingStock = signal<string | null>(null);     // Product ID currently being saved
  stockInputError = signal<string>('');            // Live validation error message

  ngOnInit() {
    setTimeout(() => {
      this.isLoading.set(false);
    }, 2000);
  }

  totalProducts = computed(() => this.dataService.products().length);
  totalCategories = computed(() => this.dataService.categories().length);

  pendingOrders = computed(() =>
    this.dataService.orders().filter(o => o.status === 'pending' && !o.billNumber).length
  );

  completedOrders = computed(() =>
    this.dataService.orders().filter(o => o.status === 'completed').length
  );

  recentOrders = computed(() => {
    return [...this.dataService.orders()]
      .filter(o => o.status === 'pending' && !o.billNumber)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });

  lowStockProducts = computed(() => {
    let products = this.dataService.products().filter(p => p.stock < 1500);
    const term = this.skuSearchTerm().trim().toLowerCase();
    if (term) {
      products = products.filter(p => p.sku.toLowerCase().includes(term));
    }
    return products;
  });

  // ── Inline Edit Methods ────────────────────────────────────────────────────

  // Open edit mode for a specific product row
  openStockEdit(productId: string, currentStock: number) {
    this.editingProductId.set(productId);
    this.editingStockValue.set(currentStock);
    this.stockInputError.set(''); // Clear any previous error
  }

  // Cancel edit without saving
  cancelStockEdit() {
    this.editingProductId.set(null);
    this.editingStockValue.set(0);
    this.stockInputError.set('');
  }

  // Live validation on every keystroke
  onStockValueChange(val: any) {
    const str = String(val ?? '').trim();

    // Empty check
    if (str === '' || str === null) {
      this.editingStockValue.set('' as any);
      this.stockInputError.set('Value cannot be empty');
      return;
    }

    const num = Number(str);

    // NaN check (non-numeric input)
    if (isNaN(num)) {
      this.stockInputError.set('Enter a valid number');
      return;
    }

    // Negative check
    if (num < 0) {
      this.editingStockValue.set('' as any);
      this.stockInputError.set('Value cannot be negative');
      return;
    }

    // Decimal check (stock must be whole number)
    if (!Number.isInteger(num)) {
      this.stockInputError.set('Only whole numbers allowed');
      return;
    }

    // Valid!
    this.editingStockValue.set(num);
    this.stockInputError.set('');
  }

  // Block invalid keys at keyboard level before they reach the input
  preventInvalidStockKey(event: KeyboardEvent) {
    const blocked = ['-', '+', 'e', 'E', ' ', '.']; // minus, plus, exponent, space, decimal
    if (blocked.includes(event.key)) {
      event.preventDefault();
    }
  }

  // Whether current input is valid enough to save
  get isStockInputValid(): boolean {
    const val = this.editingStockValue();
    if (val === '' || val === null || val === undefined) return false;
    const num = Number(val);
    return !isNaN(num) && num >= 0 && Number.isInteger(num);
  }

  // Save updated stock to Firestore
  async saveStock(productId: string) {
    if (!this.isStockInputValid) return; // Guard against invalid state

    const newStock = Number(this.editingStockValue());
    this.isSavingStock.set(productId);
    try {
      await this.dataService.updateProduct(productId, { stock: newStock });
      this.editingProductId.set(null); // Close edit mode on success
      this.stockInputError.set('');
    } catch (e) {
      console.error('Failed to update stock:', e);
      this.stockInputError.set('Save failed. Try again.');
    } finally {
      this.isSavingStock.set(null);
    }
  }

  // Handle Enter/Escape keys in the stock input
  onStockInputKeydown(event: KeyboardEvent, productId: string) {
    if (event.key === 'Enter' && this.isStockInputValid) {
      this.saveStock(productId);
    } else if (event.key === 'Escape') {
      this.cancelStockEdit();
    }
  }
}
