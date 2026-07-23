import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService, Product, Category } from '../../core/services/data.service';
import { SideDrawerComponent } from '../../shared/side-drawer/side-drawer.component';
import { ImageGalleryComponent } from '../../shared/image-gallery/image-gallery.component';
import { Storage, ref, uploadBytesResumable, getDownloadURL } from '@angular/fire/storage';
import { ConfirmationModalComponent } from '../../shared/confirmation-modal/confirmation-modal.component';

@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [CommonModule, FormsModule, SideDrawerComponent, ImageGalleryComponent, ConfirmationModalComponent],
  template: `
    <div class="page-header">
      <div>
        <h2>Products</h2>
        <p class="text-muted">Manage inventory and product details</p>
      </div>
      <button class="btn btn-primary" (click)="openAddDrawer()">
        <span class="material-symbols-outlined">add</span> Add Product
      </button>
    </div>
    
    <div class="products-grid">
      <div class="product-card glass-panel" *ngFor="let prod of paginatedProducts()">
        <div class="card-img-wrapper" (click)="openDetailsDrawer(prod)">
          <div class="skeleton-loader" *ngIf="!loadedImages()[prod.id]"></div>
          <img [src]="prod.images[0]" [alt]="prod.name" class="thumbnail-img" 
               [class.loaded]="loadedImages()[prod.id]" (load)="onImageLoad(prod.id)">
          <div class="status-badge" [ngClass]="prod.status === 'active' ? 'badge-success' : 'badge-error'">
            {{ prod.status | titlecase }}
          </div>
        </div>
        <div class="card-info">
          <h4 (click)="openDetailsDrawer(prod)">{{ prod.name }}</h4>
          <p class="sku text-muted">SKU: {{ prod.sku }} | {{ getCategoryName(prod.categoryId) }}</p>
          <div class="stock-info">
            <span class="label">Stock:</span>
            <span class="value font-weight-bold" [class.text-error]="prod.stock < 1000">{{ prod.stock }}</span>
          </div>
          <div class="card-actions">
            <button class="btn btn-outline edit-btn" (click)="openEditDrawer(prod)">
              <span class="material-symbols-outlined">edit</span> Edit
            </button>
            <button class="btn btn-outline delete-btn" (click)="promptDeleteProduct(prod.id)">
              <span class="material-symbols-outlined">delete</span> Delete
            </button>
          </div>
        </div>
      </div>
      <div class="empty-state" *ngIf="products().length === 0">
        <span class="material-symbols-outlined">inventory_2</span>
        <p>No products found. Start adding some!</p>
      </div>
    </div>
    
    <div class="pagination-bar" *ngIf="products().length > 0">
      <button class="btn btn-outline" [disabled]="currentPage() === 1" (click)="prevPage()">
        <span class="material-symbols-outlined">chevron_left</span> Previous
      </button>
      <div class="page-info">
        Page {{ currentPage() }} of {{ totalPages() || 1 }}
      </div>
      <button class="btn btn-outline" [disabled]="currentPage() >= totalPages()" (click)="nextPage()">
        Next <span class="material-symbols-outlined">chevron_right</span>
      </button>
    </div>

    <app-side-drawer 
      [isOpen]="isAddDrawerOpen()" 
      [title]="isEditing() ? 'Edit Product' : 'Add New Product'" 
      width="500px"
      (close)="closeAddDrawer()">
      
      <form (ngSubmit)="saveProduct(prodForm)" #prodForm="ngForm">
        <div class="form-group">
          <label class="form-label">Product Name</label>
          <input type="text" class="form-control" [class.is-invalid]="nameField.invalid && (nameField.dirty || nameField.touched)" [(ngModel)]="newProduct.name" name="name" #nameField="ngModel" required>
          <div class="validation-error" *ngIf="nameField.invalid && (nameField.dirty || nameField.touched)">
            <small>Product name is required.</small>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label">Product Code (SKU)</label>
            <input type="text" class="form-control" [class.is-invalid]="skuField.invalid && (skuField.dirty || skuField.touched)" [(ngModel)]="newProduct.sku" name="sku" #skuField="ngModel" required>
            <div class="validation-error" *ngIf="skuField.invalid && (skuField.dirty || skuField.touched)">
              <small>SKU is required.</small>
            </div>
          </div>
          <div class="form-group flex-1">
            <label class="form-label">Category</label>
            <select class="form-control" [class.is-invalid]="catField.invalid && (catField.dirty || catField.touched)" [(ngModel)]="newProduct.categoryId" name="categoryId" #catField="ngModel" required>
              <option value="" disabled selected>Select Category</option>
              <option *ngFor="let cat of categories()" [value]="cat.id">{{ cat.name }}</option>
            </select>
            <div class="validation-error" *ngIf="catField.invalid && (catField.dirty || catField.touched)">
              <small>Category is required.</small>
            </div>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label">Stock Quantity</label>
            <input type="text" class="form-control" 
                   [class.is-invalid]="stockField.invalid && (stockField.dirty || stockField.touched || prodForm.submitted)" 
                   [(ngModel)]="newProduct.stock" 
                   name="stock" 
                   #stockField="ngModel" 
                   required 
                   pattern="^[1-9][0-9]*$">
            <div class="validation-error" *ngIf="stockField.invalid && (stockField.dirty || stockField.touched || prodForm.submitted)">
              <small *ngIf="stockField.errors?.['required']">Stock is required.</small>
              <small *ngIf="stockField.errors?.['pattern']">Only positive numbers allowed (no zero, decimals, or leading zeros).</small>
            </div>
          </div>
          <div class="form-group flex-1">
            <label class="form-label">Status</label>
            <select class="form-control" [(ngModel)]="newProduct.status" name="status" required>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea class="form-control" rows="4" [(ngModel)]="newProduct.description" name="description"></textarea>
        </div>
        
        <div class="form-group">
          <label class="form-label">Product Images</label>
          
          <div class="image-upload-area" (click)="fileInput.click()">
            <span class="material-symbols-outlined">cloud_upload</span>
            <p>Click to select images</p>
            <input type="file" #fileInput (change)="onFileSelected($event)" accept="image/*" multiple style="display: none;">
          </div>
          
          <div class="upload-progress mt-2" *ngIf="isUploading()">
            <p class="text-muted mb-1 text-sm">Uploading... {{ uploadProgress() }}%</p>
            <div class="progress-bar-bg">
              <div class="progress-bar-fill" [style.width.%]="uploadProgress()"></div>
            </div>
          </div>
          
          <div class="image-previews mt-3" *ngIf="newProduct.images.length > 0">
            <div class="preview-item" *ngFor="let img of newProduct.images; let i = index">
              <img [src]="img" alt="Preview">
              <button type="button" class="remove-btn" (click)="removeImage(i)">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>
            <div class="preview-item add-more" (click)="fileInput.click()">
              <span class="material-symbols-outlined">add</span>
            </div>
          </div>
          
          <div class="validation-error mt-2" *ngIf="newProduct.images.length === 0">
            <small>At least one product image is required.</small>
          </div>
        </div>
        
        <div class="drawer-actions mt-4">
          <button type="button" class="btn btn-outline" (click)="closeAddDrawer()" [disabled]="isSaving()">Cancel</button>
          <button type="submit" class="btn btn-primary" [disabled]="isUploading() || isSaving()">
            <span *ngIf="isSaving()" class="loader-sm"></span>
            <span *ngIf="!isSaving()">{{ isUploading() ? 'Uploading...' : (isEditing() ? 'Update Product' : 'Save Product') }}</span>
          </button>
        </div>
      </form>
    </app-side-drawer>

    <!-- Right Drawer for Product Details Preview -->
    <app-side-drawer 
      [isOpen]="isDetailsDrawerOpen()" 
      [title]="selectedProduct()?.name || 'Product Details'" 
      width="600px"
      (close)="closeDetailsDrawer()">
      
      <div class="product-details-content" *ngIf="selectedProduct() as prod">
        <app-image-gallery [images]="prod.images"></app-image-gallery>
        
        <div class="details-section mt-4">
          <div class="detail-row">
            <span class="label">SKU:</span>
            <span class="value">{{ prod.sku }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Category:</span>
            <span class="value">{{ getCategoryName(prod.categoryId) }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Stock Available:</span>
            <span class="value font-weight-bold" [class.text-error]="prod.stock < 1000">{{ prod.stock }} units</span>
          </div>
          <div class="detail-row">
            <span class="label">Status:</span>
            <span class="value badge" [ngClass]="prod.status === 'active' ? 'badge-success' : 'badge-error'">
              {{ prod.status | titlecase }}
            </span>
          </div>
        </div>
        
        <div class="details-section mt-4">
          <h4>Description</h4>
          <p class="text-muted">{{ prod.description }}</p>
        </div>
      </div>
    </app-side-drawer>

    <!-- Custom Confirmation Modal for Deletion -->
    <app-confirmation-modal
      [isOpen]="isDeleteModalOpen()"
      title="Delete Product"
      message="Are you sure you want to delete this product? This action cannot be undone."
      confirmText="Delete"
      (confirm)="confirmDelete()"
      (cancel)="cancelDelete()">
    </app-confirmation-modal>
  `,
  styles: [`
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      
      h2 { margin: 0; }
      p { margin: 0; }
    }
    
    .products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 1.25rem;
    }
    
    .product-card {
      background: #ffffff;
      border-radius: var(--border-radius-md);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: var(--transition);
      border: 1px solid rgba(0,0,0,0.03);
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
      
      &:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 24px rgba(158, 27, 34, 0.08); /* Romantic subtle shadow */
        
        .thumbnail-img {
          transform: scale(1.03);
        }
      }
      
      .card-img-wrapper {
        width: 100%;
        height: 180px; /* Reduced height for a much smaller card */
        position: relative;
        background: #f8f9fa;
        cursor: pointer;
        padding: 0.75rem;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        
        .skeleton-loader {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          z-index: 1;
        }
        
        .thumbnail-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          transition: opacity 0.4s ease, transform 0.4s ease;
          opacity: 0;
          z-index: 2;
          position: relative;
          
          &.loaded {
            opacity: 1;
          }
        }
        
        .status-badge {
          position: absolute;
          top: 0.75rem;
          right: 0.75rem;
          font-size: 0.7rem;
          font-weight: 600;
          padding: 0.25rem 0.6rem;
          border-radius: 4px;
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(4px);
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
      }
      
      .card-info {
        padding: 0.85rem;
        flex: 1;
        display: flex;
        flex-direction: column;
        
        h4 {
          margin: 0 0 0.25rem 0;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          
          &:hover { color: var(--primary); }
        }
        
        .sku {
          font-size: 0.75rem;
          margin-bottom: 0.5rem;
          color: #777;
        }
        
        .stock-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
          font-size: 0.8rem;
          padding-top: 0.5rem;
          border-top: 1px solid rgba(0,0,0,0.04);
          
          .label { color: #555; }
        }
        
        .card-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: auto;
          
          button {
            flex: 1;
            padding: 0.4rem;
            font-size: 0.85rem;
            border-radius: 4px;
            font-weight: 500;
            
            &.edit-btn {
              border: 1px solid #ced4da;
              color: #495057;
              &:hover { border-color: var(--primary); color: var(--primary); background: rgba(158, 27, 34, 0.05); }
            }
            
            &.delete-btn {
              border: 1px solid #ced4da;
              color: #495057;
              &:hover { border-color: var(--error); color: var(--error); background: rgba(220, 53, 69, 0.05); }
            }
            
            span { font-size: 16px; vertical-align: text-bottom; }
          }
        }
      }
    }
    
    .empty-state {
      grid-column: 1 / -1;
      text-align: center;
      padding: 4rem 2rem;
      background: var(--surface);
      border-radius: var(--border-radius-lg);
      
      span { font-size: 4rem; color: var(--text-muted); opacity: 0.5; margin-bottom: 1rem; }
    }
    
    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    
    .pagination-bar {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 1.5rem;
      margin-top: 2rem;
      padding: 1rem;
      background: var(--surface);
      border-radius: var(--border-radius-md);
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
      
      .page-info {
        font-weight: 600;
        color: var(--text-muted);
      }
      
      .btn {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.5rem 1rem;
      }
    }
    
    .form-row {
      display: flex;
      gap: 1rem;
    }
    .flex-1 { flex: 1; }
    .w-100 { width: 100%; }
    
    .image-upload-area {
      border: 2px dashed #ced4da;
      border-radius: var(--border-radius-md);
      padding: 2rem;
      text-align: center;
      background: #f8f9fa;
      cursor: pointer;
      transition: var(--transition);
      
      &:hover {
        border-color: var(--primary);
        background: rgba(128, 0, 0, 0.02);
      }
      
      span {
        font-size: 2rem;
        color: var(--text-muted);
        margin-bottom: 0.5rem;
      }
      
      p {
        margin: 0;
        color: var(--text-muted);
      }
    }
    
    .upload-progress {
      .progress-bar-bg {
        width: 100%;
        height: 6px;
        background: rgba(0,0,0,0.05);
        border-radius: 3px;
        overflow: hidden;
      }
      .progress-bar-fill {
        height: 100%;
        background: var(--primary);
        transition: width 0.3s ease;
      }
    }
    
    .image-previews {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      
      .preview-item {
        position: relative;
        width: 80px;
        height: 80px;
        border-radius: var(--border-radius-sm);
        overflow: hidden;
        border: 1px solid #ddd;
        
        img {
          width: 100%;
          height: 100%;
          object-fit: contain; /* Best quality inside preview too */
          background: white;
        }
        
        .remove-btn {
          position: absolute;
          top: 2px;
          right: 2px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: rgba(0,0,0,0.5);
          color: white;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          
          span { font-size: 14px; }
          
          &:hover { background: var(--error); }
        }
        
        &.add-more {
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8f9fa;
          border: 1px dashed #ced4da;
          cursor: pointer;
          
          span {
            font-size: 24px;
            color: var(--text-muted);
          }
          
          &:hover {
            border-color: var(--primary);
            color: var(--primary);
          }
        }
      }
    }
    
    .details-section {
      background: #f8f9fa;
      padding: 1.5rem;
      border-radius: var(--border-radius-md);
      
      h4 {
        margin-top: 0;
        margin-bottom: 1rem;
      }
      
      .detail-row {
        display: flex;
        justify-content: space-between;
        padding: 0.75rem 0;
        border-bottom: 1px solid rgba(0,0,0,0.05);
        
        &:last-child { border-bottom: none; }
        
        .label {
          color: var(--text-muted);
          font-weight: 500;
        }
        .value {
          font-weight: 500;
        }
      }
    }
    
    .mt-4 { margin-top: 1.5rem; }
    .mt-3 { margin-top: 1rem; }
    .mt-2 { margin-top: 0.5rem; }
    .mb-1 { margin-bottom: 0.25rem; }
    .text-sm { font-size: 0.8rem; }
    .font-weight-bold { font-weight: 700; }
    
    .validation-error {
      color: var(--error);
      font-size: 0.8rem;
      margin-top: 0.25rem;
      padding-left: 0.5rem;
    }
    
    .form-control.is-invalid {
      border-color: var(--error);
      
      &:focus {
        box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.1);
      }
    }
    
    .loader-sm {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-radius: 50%;
      border-top-color: #fff;
      animation: shimmer 1s linear infinite; /* Reuse animation or spin */
      margin-right: 0.5rem;
      vertical-align: middle;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    .loader-sm {
      animation: spin 1s ease-in-out infinite;
    }
    
    .drawer-actions {
      display: flex;
      gap: 1rem;
      
      button { flex: 1; }
    }
  `]
})
export class AdminProductsComponent {
  dataService = inject(DataService);
  storage = inject(Storage);

  products = this.dataService.products;
  categories = this.dataService.categories;
  
  currentPage = signal(1);
  pageSize = signal(6);

  paginatedProducts = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    const end = start + this.pageSize();
    return this.products().slice(start, end);
  });

  totalPages = computed(() => {
    return Math.ceil(this.products().length / this.pageSize());
  });
  
  loadedImages = signal<Record<string, boolean>>({});

  isAddDrawerOpen = signal(false);
  isDetailsDrawerOpen = signal(false);
  isEditing = signal(false);
  selectedProduct = signal<Product | null>(null);

  isDeleteModalOpen = signal(false);
  productToDelete = signal<string | null>(null);

  isUploading = signal(false);
  uploadProgress = signal(0);
  
  isSaving = signal(false);

  newProduct: Product | Omit<Product, 'id'> = {
    name: '',
    sku: '',
    categoryId: '',
    description: '',
    stock: 0,
    status: 'active',
    images: []
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
      this.currentPage.update(p => p + 1);
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  openAddDrawer() {
    this.isEditing.set(false);
    this.isAddDrawerOpen.set(true);
    this.newProduct = {
      name: '', sku: '', categoryId: '', description: '',
      stock: 0, status: 'active', images: []
    };
  }

  openEditDrawer(prod: Product) {
    this.isEditing.set(true);
    // clone the product so we don't mutate the UI immediately before save
    this.newProduct = JSON.parse(JSON.stringify(prod));
    this.isAddDrawerOpen.set(true);
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
    if (form.invalid || this.newProduct.images.length === 0) {
      // Mark all controls as touched to trigger validation UI
      Object.keys(form.controls).forEach(key => {
        form.controls[key].markAsTouched();
      });
      return; // Stop saving if invalid
    }
    
    this.isSaving.set(true);
    try {
      // Ensure stock is saved as a number since input type is text now
      const productToSave = {
        ...this.newProduct,
        stock: Number(this.newProduct.stock)
      };
      
      if (this.isEditing() && 'id' in productToSave) {
        await this.dataService.updateProduct((productToSave as Product).id, productToSave);
      } else {
        await this.dataService.addProduct(productToSave as Omit<Product, 'id'>);
      }
      this.closeAddDrawer();
    } catch (err) {
      console.error("Error saving product:", err);
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
}
