import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService, Product, Category } from '../../core/services/data.service';
import { SideDrawerComponent } from '../../shared/side-drawer/side-drawer.component';
import { ImageGalleryComponent } from '../../shared/image-gallery/image-gallery.component';
import { Storage, ref, uploadBytesResumable, getDownloadURL } from '@angular/fire/storage';
import { ConfirmationModalComponent } from '../../shared/confirmation-modal/confirmation-modal.component';
import { SnackbarService } from '../../core/services/snackbar.service';

@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [CommonModule, FormsModule, SideDrawerComponent, ImageGalleryComponent, ConfirmationModalComponent],
  templateUrl: './admin-products.component.html',
  styleUrls: ['./admin-products.component.css']
})
export class AdminProductsComponent implements OnInit {
  dataService = inject(DataService);
  storage = inject(Storage);
  snackbar = inject(SnackbarService);

  products = this.dataService.products;
  categories = this.dataService.categories;

  currentPage = signal(1);
  pageSize = signal(10);
  isPaginating = signal(false);
  isLoading = signal(true);
  searchQuery = signal<string>('');

  ngOnInit() {
    setTimeout(() => {
      this.isLoading.set(false);
    }, 2000);
  }

  onSearch(val: string) {
    this.searchQuery.set(val);
    this.currentPage.set(1); // Reset pagination on search
  }

  filteredProducts = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    let list = this.products();
    if (query) {
      list = list.filter(p =>
        p.sku.toLowerCase().includes(query) ||
        p.name.toLowerCase().includes(query)
      );
    }
    return list;
  });

  paginatedProducts = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    const end = start + this.pageSize();
    return this.filteredProducts().slice(start, end);
  });

  totalPages = computed(() => {
    return Math.ceil(this.filteredProducts().length / this.pageSize());
  });

  loadedImages = signal<Record<string, boolean>>({});

  isAddDrawerOpen = signal(false);
  isDetailsDrawerOpen = signal(false);
  isEditing = signal(false);
  selectedProduct = signal<Product | null>(null);

  isDeleteModalOpen = signal(false);
  productToDelete = signal<string | null>(null);
  isGenerating = signal(false);

  isUploading = signal(false);
  uploadProgress = signal(0);

  isSaving = signal(false);
  duplicateSkuError = signal<string>('');

  newProduct: Product | Omit<Product, 'id'> = {
    name: '',
    sku: '',
    categoryId: '',
    description: '',
    stock: 0,
    status: 'active',
    images: [],
    purchaseRate: 0,
    sellingRate: 0
  };

  getCategoryName(id: string): string {
    const cat = this.categories().find(c => c.id === id);
    return cat ? cat.name : 'Unknown';
  }

  onImageLoad(productId: string) {
    this.loadedImages.update(state => ({ ...state, [productId]: true }));
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.isPaginating.set(true);
      setTimeout(() => {
        this.currentPage.update(p => p + 1);
        this.isPaginating.set(false);
      }, 400); // simulate network delay
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.isPaginating.set(true);
      setTimeout(() => {
        this.currentPage.update(p => p - 1);
        this.isPaginating.set(false);
      }, 400); // simulate network delay
    }
  }

  openAddDrawer() {
    this.isEditing.set(false);
    this.isAddDrawerOpen.set(true);
    this.duplicateSkuError.set('');
    this.newProduct = {
      name: '', sku: '', categoryId: '', description: '',
      stock: 0, status: 'active', images: [],
      purchaseRate: 0, sellingRate: 0
    };
  }

  openEditDrawer(prod: Product) {
    this.isEditing.set(true);
    this.duplicateSkuError.set('');
    // clone the product so we don't mutate the UI immediately before save
    const cloned = JSON.parse(JSON.stringify(prod));
    this.newProduct = {
      ...cloned,
      purchaseRate: cloned.purchaseRate || 0,
      sellingRate: cloned.sellingRate || 0
    };
    this.isAddDrawerOpen.set(true);
  }

  checkDuplicateSku(skuValue?: string) {
    const sku = (skuValue || this.newProduct.sku || '').trim().toLowerCase();
    if (!sku) {
      this.duplicateSkuError.set('');
      return;
    }
    const currentId = ('id' in this.newProduct) ? (this.newProduct as Product).id : null;
    const exists = this.products().some(p =>
      p.sku.trim().toLowerCase() === sku && p.id !== currentId
    );
    if (exists) {
      this.duplicateSkuError.set(`Product Code (SKU) "${this.newProduct.sku}" already exists!`);
    } else {
      this.duplicateSkuError.set('');
    }
  }

  closeAddDrawer() {
    this.isAddDrawerOpen.set(false);
  }

  promptDeleteProduct(id: string) {
    this.productToDelete.set(id);
    this.isDeleteModalOpen.set(true);
  }

  confirmDelete() {
    const id = this.productToDelete();
    if (id) {
      this.dataService.deleteProduct(id);
      this.snackbar.show('Product deleted successfully', 'success');
    }
    this.isDeleteModalOpen.set(false);
    this.productToDelete.set(null);
  }

  cancelDelete() {
    this.isDeleteModalOpen.set(false);
    this.productToDelete.set(null);
  }

  async onFileSelected(event: any) {
    const files: FileList = event.target.files;
    if (!files || files.length === 0) return;

    this.isUploading.set(true);
    this.uploadProgress.set(0);

    const totalFiles = files.length;
    let completedUploads = 0;

    // Array to hold promises for concurrent upload
    const uploadPromises = Array.from(files).map((file) => {
      const filePath = `products/${Date.now()}_${file.name}`;
      const storageRef = ref(this.storage, filePath);
      const uploadTask = uploadBytesResumable(storageRef, file);

      return new Promise((resolve, reject) => {
        uploadTask.on('state_changed',
          (snapshot) => {
            // We can track individual progress if needed, but for simplicity
            // we will just update overall progress based on completed files
          },
          (error) => {
            console.error("Upload error:", error);
            reject(error);
          },
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            this.newProduct.images.push(downloadURL);

            // Update overall progress correctly
            completedUploads++;
            this.uploadProgress.set(Math.round((completedUploads / totalFiles) * 100));
            resolve(true);
          }
        );
      });
    });

    await Promise.all(uploadPromises);
    this.isUploading.set(false);
  }

  removeImage(index: number) {
    this.newProduct.images.splice(index, 1);
  }

  async saveProduct(form: any) {
    this.checkDuplicateSku();
    if (form.invalid || this.newProduct.images.length === 0 || !!this.duplicateSkuError()) {
      // Mark all controls as touched to trigger validation UI
      Object.keys(form.controls).forEach(key => {
        form.controls[key].markAsTouched();
      });
      if (this.duplicateSkuError()) {
        this.snackbar.show(this.duplicateSkuError(), 'error');
      }
      return; // Stop saving if invalid
    }

    this.isSaving.set(true);
    try {
      // Ensure stock is saved as a number since input type is text now
      const productToSave = {
        ...this.newProduct,
        stock: Number(this.newProduct.stock),
        purchaseRate: Number(this.newProduct.purchaseRate || 0),
        sellingRate: Number(this.newProduct.sellingRate || 0)
      };

      if (this.isEditing() && 'id' in productToSave) {
        await this.dataService.updateProduct((productToSave as Product).id, productToSave);
        this.snackbar.show('Product updated successfully', 'success');
      } else {
        await this.dataService.addProduct(productToSave as Omit<Product, 'id'>);
        this.snackbar.show('Product added successfully', 'success');
        this.currentPage.set(1); // Jump to page 1 to see newly added product at top
      }
      this.closeAddDrawer();
    } catch (err) {
      console.error("Error saving product:", err);
      this.snackbar.show('Failed to save product', 'error');
    } finally {
      this.isSaving.set(false);
    }
  }

  openDetailsDrawer(product: Product) {
    this.selectedProduct.set(product);
    this.isDetailsDrawerOpen.set(true);
  }

  closeDetailsDrawer() {
    this.isDetailsDrawerOpen.set(false);
    this.selectedProduct.set(null);
  }

  async bulkAddMockProducts() {
    this.isGenerating.set(true);
    try {
      await this.dataService.bulkAddMockProducts();
      this.snackbar.show('100 mock products added successfully!', 'success');
    } catch (err) {
      console.error("Error bulk adding products:", err);
      this.snackbar.show('Failed to add mock products', 'error');
    } finally {
      this.isGenerating.set(false);
    }
  }
}
