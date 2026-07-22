import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService, Product, Category } from '../../core/services/data.service';
import { SideDrawerComponent } from '../../shared/side-drawer/side-drawer.component';
import { ImageGalleryComponent } from '../../shared/image-gallery/image-gallery.component';
import { Storage, ref, uploadBytesResumable, getDownloadURL } from '@angular/fire/storage';

@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [CommonModule, FormsModule, SideDrawerComponent, ImageGalleryComponent],
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
    
    <div class="card p-0">
      <table class="table">
        <thead>
          <tr>
            <th>Product</th>
            <th>SKU</th>
            <th>Category</th>
            <th>Stock</th>
            <th>Status</th>
            <th class="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let prod of products()" (click)="openDetailsDrawer(prod)" class="clickable-row">
            <td>
              <div class="product-cell">
                <img [src]="prod.images[0]" [alt]="prod.name" class="thumbnail">
                <strong>{{ prod.name }}</strong>
              </div>
            </td>
            <td>{{ prod.sku }}</td>
            <td>{{ getCategoryName(prod.categoryId) }}</td>
            <td>
              <span [class.text-error]="prod.stock < 1000">{{ prod.stock }}</span>
            </td>
            <td>
              <span class="badge" [ngClass]="prod.status === 'active' ? 'badge-success' : 'badge-error'">
                {{ prod.status | titlecase }}
              </span>
            </td>
            <td class="text-right" (click)="$event.stopPropagation()">
              <button class="btn-icon" title="Edit">
                <span class="material-symbols-outlined text-primary">edit</span>
              </button>
              <button class="btn-icon" title="Delete">
                <span class="material-symbols-outlined text-error">delete</span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Right Drawer for Add Product -->
    <app-side-drawer 
      [isOpen]="isAddDrawerOpen()" 
      title="Add New Product" 
      width="500px"
      (close)="closeAddDrawer()">
      
      <form (ngSubmit)="saveProduct()" #prodForm="ngForm">
        <div class="form-group">
          <label class="form-label">Product Name</label>
          <input type="text" class="form-control" [(ngModel)]="newProduct.name" name="name" required>
        </div>
        
        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label">Product Code (SKU)</label>
            <input type="text" class="form-control" [(ngModel)]="newProduct.sku" name="sku" required>
          </div>
          <div class="form-group flex-1">
            <label class="form-label">Category</label>
            <select class="form-control" [(ngModel)]="newProduct.categoryId" name="categoryId" required>
              <option *ngFor="let cat of categories()" [value]="cat.id">{{ cat.name }}</option>
            </select>
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">Stock Quantity</label>
          <input type="number" class="form-control" [(ngModel)]="newProduct.stock" name="stock" required min="0">
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
        </div>
        
        <div class="drawer-actions mt-4">
          <button type="button" class="btn btn-outline" (click)="closeAddDrawer()">Cancel</button>
          <button type="submit" class="btn btn-primary" [disabled]="!prodForm.valid || newProduct.images.length === 0">Save Product</button>
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
    
    .p-0 { padding: 0 !important; overflow: hidden; }
    
    .table {
      width: 100%;
      border-collapse: collapse;
      
      th, td {
        padding: 1rem 1.5rem;
        text-align: left;
        border-bottom: 1px solid rgba(0,0,0,0.05);
        vertical-align: middle;
      }
      
      th {
        background: #f8f9fa;
        color: var(--text-muted);
        font-weight: 600;
        text-transform: uppercase;
        font-size: 0.8rem;
        letter-spacing: 0.5px;
      }
      
      tbody tr {
        cursor: pointer;
        transition: var(--transition);
      }
      tbody tr:last-child td { border-bottom: none; }
      tbody tr:hover { background: rgba(0,0,0,0.02); }
    }
    
    .text-right { text-align: right !important; }
    
    .product-cell {
      display: flex;
      align-items: center;
      gap: 1rem;
      
      .thumbnail {
        width: 48px;
        height: 48px;
        border-radius: var(--border-radius-sm);
        object-fit: cover;
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
          object-fit: cover;
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
    .mb-1 { margin-bottom: 0.25rem; }
    .text-sm { font-size: 0.8rem; }
    .font-weight-bold { font-weight: 700; }
    
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
  
  isAddDrawerOpen = signal(false);
  isDetailsDrawerOpen = signal(false);
  selectedProduct = signal<Product | null>(null);
  
  isUploading = signal(false);
  uploadProgress = signal(0);
  
  newProduct: Omit<Product, 'id'> = {
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

  openAddDrawer() {
    this.isAddDrawerOpen.set(true);
    this.newProduct = { 
      name: '', sku: '', categoryId: '', description: '', 
      stock: 0, status: 'active', images: [] 
    };
  }
  
  closeAddDrawer() {
    this.isAddDrawerOpen.set(false);
  }

  async onFileSelected(event: any) {
    const files: FileList = event.target.files;
    if (!files || files.length === 0) return;
    
    this.isUploading.set(true);
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const filePath = `products/${Date.now()}_${file.name}`;
      const storageRef = ref(this.storage, filePath);
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      await new Promise((resolve, reject) => {
        uploadTask.on('state_changed', 
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            this.uploadProgress.set(Math.round(progress));
          }, 
          (error) => {
            console.error("Upload error:", error);
            reject(error);
          }, 
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            this.newProduct.images.push(downloadURL);
            resolve(true);
          }
        );
      });
    }
    
    this.isUploading.set(false);
    this.uploadProgress.set(0);
  }

  removeImage(index: number) {
    this.newProduct.images.splice(index, 1);
  }
  
  saveProduct() {
    this.dataService.addProduct(this.newProduct);
    this.closeAddDrawer();
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
