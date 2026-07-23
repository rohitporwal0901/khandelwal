import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService, Category } from '../../core/services/data.service';
import { SideDrawerComponent } from '../../shared/side-drawer/side-drawer.component';
import { ConfirmationModalComponent } from '../../shared/confirmation-modal/confirmation-modal.component';
import { SnackbarService } from '../../core/services/snackbar.service';

@Component({
  selector: 'app-admin-categories',
  standalone: true,
  imports: [CommonModule, FormsModule, SideDrawerComponent, ConfirmationModalComponent],
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
            <th>Name</th>
            <th>Description</th>
            <th>Status</th>
            <th class="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let cat of categories()">
            <td><strong>{{ cat.name }}</strong></td>
            <td><span class="text-muted">{{ cat.description | slice:0:50 }}{{ cat.description && cat.description.length > 50 ? '...' : '' }}</span></td>
            <td>
              <span class="badge" [ngClass]="cat.status === 'active' ? 'badge-success' : 'badge-error'">
                {{ cat.status | titlecase }}
              </span>
            </td>
            <td class="text-right">
              <button class="btn-icon" title="Edit" (click)="openEditDrawer(cat)">
                <span class="material-symbols-outlined text-primary">edit</span>
              </button>
              <button class="btn-icon" title="Delete" (click)="promptDeleteCategory(cat.id)">
                <span class="material-symbols-outlined text-error">delete</span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      
      <div class="empty-state" *ngIf="categories().length === 0">
        <span class="material-symbols-outlined">category</span>
        <p>No categories found. Start by adding one!</p>
      </div>
    </div>

    <!-- Right Drawer for Add/Edit Category -->
    <app-side-drawer 
      [isOpen]="isDrawerOpen()" 
      [title]="isEditing() ? 'Edit Category' : 'Add New Category'" 
      (close)="closeDrawer()">
      
      <form (ngSubmit)="saveCategory(catForm)" #catForm="ngForm">
        <div class="form-group">
          <label class="form-label">Category Name</label>
          <input type="text" class="form-control" [class.is-invalid]="nameField.invalid && (nameField.dirty || nameField.touched || catForm.submitted)" [(ngModel)]="newCategory.name" name="name" #nameField="ngModel" required placeholder="e.g. Wedding Cards">
          <div class="validation-error" *ngIf="nameField.invalid && (nameField.dirty || nameField.touched || catForm.submitted)">
            <small>Category name is required.</small>
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea class="form-control" rows="4" [(ngModel)]="newCategory.description" name="description" placeholder="Brief description..."></textarea>
        </div>
        
        <div class="form-group">
          <label class="form-label">Status</label>
          <select class="form-control" [(ngModel)]="newCategory.status" name="status" required>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
        
        <div class="drawer-actions mt-4">
          <button type="button" class="btn btn-outline" (click)="closeDrawer()" [disabled]="isSaving()">Cancel</button>
          <button type="submit" class="btn btn-primary" [disabled]="isSaving()">
            <span *ngIf="isSaving()" class="loader-sm"></span>
            <span *ngIf="!isSaving()">{{ isEditing() ? 'Update Category' : 'Save Category' }}</span>
          </button>
        </div>
      </form>
    </app-side-drawer>

    <!-- Custom Confirmation Modal for Deletion -->
    <app-confirmation-modal
      [isOpen]="isDeleteModalOpen()"
      title="Delete Category"
      message="Are you sure you want to delete this category? This action cannot be undone."
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
    
    .empty-state {
      text-align: center;
      padding: 3rem 2rem;
      
      span { font-size: 3rem; color: var(--text-muted); opacity: 0.5; margin-bottom: 1rem; display: block;}
    }
    
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
      animation: spin 1s ease-in-out infinite;
      margin-right: 0.5rem;
      vertical-align: middle;
    }
    
    .btn-icon {
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 0.4rem;
      border-radius: 50%;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-left: 0.25rem;
      
      &:hover {
        background: rgba(0,0,0,0.05);
        transform: scale(1.1);
      }
      
      span { font-size: 20px; }
    }
    
    .text-primary { color: var(--primary); }
    .text-error { color: var(--error); }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
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
  snackbar = inject(SnackbarService);
  categories = this.dataService.categories;
  
  isDrawerOpen = signal(false);
  isEditing = signal(false);
  isSaving = signal(false);
  
  isDeleteModalOpen = signal(false);
  categoryToDelete = signal<string | null>(null);
  
  newCategory: Category | Omit<Category, 'id' | 'image'> = {
    name: '',
    description: '',
    status: 'active'
  };

  openDrawer() {
    this.isEditing.set(false);
    this.isDrawerOpen.set(true);
    this.newCategory = { name: '', description: '', status: 'active' };
  }
  
  openEditDrawer(cat: Category) {
    this.isEditing.set(true);
    // clone the category
    this.newCategory = {
      ...cat
    };
    this.isDrawerOpen.set(true);
  }
  
  closeDrawer() {
    this.isDrawerOpen.set(false);
  }
  
  promptDeleteCategory(id: string) {
    this.categoryToDelete.set(id);
    this.isDeleteModalOpen.set(true);
  }
  
  confirmDelete() {
    const id = this.categoryToDelete();
    if (id) {
      this.dataService.deleteCategory(id);
      this.snackbar.show('Category deleted successfully', 'success');
    }
    this.isDeleteModalOpen.set(false);
    this.categoryToDelete.set(null);
  }
  
  cancelDelete() {
    this.isDeleteModalOpen.set(false);
    this.categoryToDelete.set(null);
  }
  
  async saveCategory(form: any) {
    if (form.invalid) {
      Object.keys(form.controls).forEach(key => {
        form.controls[key].markAsTouched();
      });
      return;
    }
    
    this.isSaving.set(true);
    try {
      if (this.isEditing() && 'id' in this.newCategory) {
        await this.dataService.updateCategory((this.newCategory as Category).id, this.newCategory);
        this.snackbar.show('Category updated successfully', 'success');
      } else {
        // Pass empty string for image since it is required by the original interface but omitted in UI
        const payload = { ...this.newCategory, image: '' };
        await this.dataService.addCategory(payload as Omit<Category, 'id'>);
        this.snackbar.show('Category added successfully', 'success');
      }
      this.closeDrawer();
    } catch (err) {
      console.error("Error saving category:", err);
      this.snackbar.show('Failed to save category', 'error');
    } finally {
      this.isSaving.set(false);
    }
  }
}
