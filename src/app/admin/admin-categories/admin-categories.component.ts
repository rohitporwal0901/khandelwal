import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService, Category } from '../../core/services/data.service';
import { SideDrawerComponent } from '../../shared/side-drawer/side-drawer.component';

@Component({
  selector: 'app-admin-categories',
  standalone: true,
  imports: [CommonModule, FormsModule, SideDrawerComponent],
  template: `
    <div class="page-header">
      <div>
        <h2>Categories</h2>
        <p class="text-muted">Manage your product categories</p>
      </div>
      <button class="btn btn-primary" (click)="openDrawer()">
        <span class="material-symbols-outlined">add</span> Add Category
      </button>
    </div>
    
    <div class="card p-0">
      <table class="table">
        <thead>
          <tr>
            <th>Image</th>
            <th>Name</th>
            <th>Description</th>
            <th>Status</th>
            <th class="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let cat of categories()">
            <td>
              <div class="img-preview">
                <img [src]="cat.image" [alt]="cat.name">
              </div>
            </td>
            <td><strong>{{ cat.name }}</strong></td>
            <td><span class="text-muted">{{ cat.description | slice:0:50 }}...</span></td>
            <td>
              <span class="badge" [ngClass]="cat.status === 'active' ? 'badge-success' : 'badge-error'">
                {{ cat.status | titlecase }}
              </span>
            </td>
            <td class="text-right">
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

    <!-- Right Drawer for Add Category -->
    <app-side-drawer 
      [isOpen]="isDrawerOpen()" 
      title="Add New Category" 
      (close)="closeDrawer()">
      
      <form (ngSubmit)="saveCategory()" #catForm="ngForm">
        <div class="form-group">
          <label class="form-label">Category Name</label>
          <input type="text" class="form-control" [(ngModel)]="newCategory.name" name="name" required placeholder="e.g. Wedding Cards">
        </div>
        
        <div class="form-group">
          <label class="form-label">Image URL / Icon</label>
          <input type="text" class="form-control" [(ngModel)]="newCategory.image" name="image" required placeholder="https://...">
          
          <div class="img-preview-lg mt-3" *ngIf="newCategory.image">
            <img [src]="newCategory.image" alt="Preview">
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea class="form-control" rows="4" [(ngModel)]="newCategory.description" name="description" placeholder="Brief description..."></textarea>
        </div>
        
        <div class="form-group">
          <label class="form-label">Status</label>
          <select class="form-control" [(ngModel)]="newCategory.status" name="status">
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
        
        <div class="drawer-actions mt-4">
          <button type="button" class="btn btn-outline" (click)="closeDrawer()">Cancel</button>
          <button type="submit" class="btn btn-primary" [disabled]="!catForm.valid">Save Category</button>
        </div>
      </form>
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
      
      tbody tr:last-child td { border-bottom: none; }
      tbody tr:hover { background: rgba(0,0,0,0.01); }
    }
    
    .text-right { text-align: right !important; }
    
    .img-preview {
      width: 48px;
      height: 48px;
      border-radius: var(--border-radius-sm);
      overflow: hidden;
      background: var(--background);
      
      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }
    
    .img-preview-lg {
      width: 100%;
      height: 200px;
      border-radius: var(--border-radius-md);
      overflow: hidden;
      border: 1px dashed #ccc;
      
      img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
    }
    
    .mt-3 { margin-top: 1rem; }
    .mt-4 { margin-top: 1.5rem; }
    
    .drawer-actions {
      display: flex;
      gap: 1rem;
      
      button { flex: 1; }
    }
  `]
})
export class AdminCategoriesComponent {
  dataService = inject(DataService);
  categories = this.dataService.categories;
  
  isDrawerOpen = signal(false);
  
  newCategory: Omit<Category, 'id'> = {
    name: '',
    image: '',
    description: '',
    status: 'active'
  };

  openDrawer() {
    this.isDrawerOpen.set(true);
    this.newCategory = { name: '', image: '', description: '', status: 'active' };
  }
  
  closeDrawer() {
    this.isDrawerOpen.set(false);
  }
  
  async saveCategory() {
    await this.dataService.addCategory(this.newCategory);
    this.closeDrawer();
  }
}
