import { Component, inject, signal, OnInit } from '@angular/core';
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
  templateUrl: './admin-categories.component.html',
  styleUrls: ['./admin-categories.component.css']
})
export class AdminCategoriesComponent implements OnInit {
  dataService = inject(DataService);
  snackbar = inject(SnackbarService);
  categories = this.dataService.categories;

  isLoading = signal(true);
  isDrawerOpen = signal(false);
  isEditing = signal(false);
  isSaving = signal(false);
  duplicateCategoryError = signal<string>('');

  isDeleteModalOpen = signal(false);
  categoryToDelete = signal<string | null>(null);

  newCategory: Category | Omit<Category, 'id' | 'image'> = {
    name: '',
    description: '',
    status: 'active'
  };

  ngOnInit() {
    setTimeout(() => {
      this.isLoading.set(false);
    }, 2000);
  }

  openDrawer() {
    this.isEditing.set(false);
    this.isDrawerOpen.set(true);
    this.duplicateCategoryError.set('');
    this.newCategory = { name: '', description: '', status: 'active' };
  }

  openEditDrawer(cat: Category) {
    this.isEditing.set(true);
    this.duplicateCategoryError.set('');
    // clone the category
    this.newCategory = {
      ...cat
    };
    this.isDrawerOpen.set(true);
  }

  checkDuplicateCategory(nameValue?: string) {
    const name = (nameValue || this.newCategory.name || '').trim().toLowerCase();
    if (!name) {
      this.duplicateCategoryError.set('');
      return;
    }
    const currentId = ('id' in this.newCategory) ? (this.newCategory as Category).id : null;
    const exists = this.categories().some(c => 
      c.name.trim().toLowerCase() === name && c.id !== currentId
    );
    if (exists) {
      this.duplicateCategoryError.set(`Category "${this.newCategory.name}" already exists!`);
    } else {
      this.duplicateCategoryError.set('');
    }
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
    this.checkDuplicateCategory();
    if (form.invalid || !!this.duplicateCategoryError()) {
      Object.keys(form.controls).forEach(key => {
        form.controls[key].markAsTouched();
      });
      if (this.duplicateCategoryError()) {
        this.snackbar.show(this.duplicateCategoryError(), 'error');
      }
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
