import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService, HomeSlide } from '../../core/services/data.service';
import { SideDrawerComponent } from '../../shared/side-drawer/side-drawer.component';
import { Storage, ref, uploadBytesResumable, getDownloadURL } from '@angular/fire/storage';
import { SnackbarService } from '../../core/services/snackbar.service';
import { ConfirmationModalComponent } from '../../shared/confirmation-modal/confirmation-modal.component';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, SideDrawerComponent, ConfirmationModalComponent],
  template: `
    <div class="page-header">
      <div>
        <h2>Settings</h2>
        <p class="text-muted">Manage global settings and UI elements</p>
      </div>
    </div>

    <div class="settings-container">
      <div class="settings-nav glass-panel">
        <ul class="nav-list">
          <li class="active"><span class="material-symbols-outlined">view_carousel</span> Home Slides</li>
          <!-- Future settings tabs here -->
        </ul>
      </div>
      
      <div class="settings-content glass-panel">
        <div class="content-header">
          <h3>Hero Slider Management</h3>
          <button class="btn btn-primary btn-sm" (click)="openDrawer()">
            <span class="material-symbols-outlined">add</span> Add Slide
          </button>
        </div>
        
        <div class="slides-list">
          <div class="slide-item" *ngFor="let slide of slides(); let i = index">
            <div class="slide-order">
              <span class="badge">{{ slide.order }}</span>
            </div>
            <div class="slide-img">
              <img [src]="slide.img" [alt]="slide.title" />
            </div>
            <div class="slide-info">
              <h4>{{ slide.title }}</h4>
              <p class="text-muted text-truncate">{{ slide.subtitle }}</p>
              <div class="slide-meta">
                <span class="badge badge-primary">{{ slide.tag }}</span>
                <span class="badge" [ngClass]="slide.status === 'active' ? 'badge-success' : 'badge-error'">
                  {{ slide.status | titlecase }}
                </span>
              </div>
            </div>
            <div class="slide-actions">
              <button class="btn-icon" title="Edit" (click)="openDrawer(slide)">
                <span class="material-symbols-outlined">edit</span>
              </button>
              <button class="btn-icon text-error" title="Delete" (click)="promptDeleteSlide(slide.id)">
                <span class="material-symbols-outlined">delete</span>
              </button>
            </div>
          </div>
          
          <div class="empty-state" *ngIf="slides().length === 0">
            <span class="material-symbols-outlined">view_carousel</span>
            <p>No slides configured. Add some to display on the home page!</p>
          </div>
        </div>
      </div>
    </div>

    <app-side-drawer 
      [isOpen]="isDrawerOpen()" 
      [title]="isEditing() ? 'Edit Slide' : 'Add New Slide'" 
      width="450px"
      (close)="closeDrawer()">
      
      <form (ngSubmit)="saveSlide(slideForm)" #slideForm="ngForm">
        
        <div class="form-group">
          <label class="form-label">Title</label>
          <input type="text" class="form-control" [class.is-invalid]="titleField.invalid && (titleField.dirty || titleField.touched || slideForm.submitted)" [(ngModel)]="currentSlide.title" name="title" #titleField="ngModel" required>
          <div class="validation-error mt-1" *ngIf="titleField.invalid && (titleField.dirty || titleField.touched || slideForm.submitted)">
            <small>Title is required.</small>
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">Subtitle</label>
          <input type="text" class="form-control" [class.is-invalid]="subField.invalid && (subField.dirty || subField.touched || slideForm.submitted)" [(ngModel)]="currentSlide.subtitle" name="subtitle" #subField="ngModel" required>
          <div class="validation-error mt-1" *ngIf="subField.invalid && (subField.dirty || subField.touched || slideForm.submitted)">
            <small>Subtitle is required.</small>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label">Tag (e.g. Premium)</label>
            <input type="text" class="form-control" [(ngModel)]="currentSlide.tag" name="tag" required>
          </div>
          <div class="form-group flex-1">
            <label class="form-label">Order Number</label>
            <input type="number" class="form-control" [(ngModel)]="currentSlide.order" name="order" required>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label">Status</label>
            <select class="form-control" [(ngModel)]="currentSlide.status" name="status" required>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">Image</label>
          <div class="image-upload-area" (click)="fileInput.click()">
            <span class="material-symbols-outlined">cloud_upload</span>
            <p>Click to select image</p>
            <input type="file" #fileInput (change)="onFileSelected($event)" accept="image/*" style="display: none;">
          </div>
          
          <div class="upload-progress mt-2" *ngIf="isUploading()">
            <p class="text-muted mb-1 text-sm">Uploading... {{ uploadProgress() }}%</p>
            <div class="progress-bar-bg">
              <div class="progress-bar-fill" [style.width.%]="uploadProgress()"></div>
            </div>
          </div>
          
          <div class="mt-2" *ngIf="currentSlide.img">
            <img [src]="currentSlide.img" alt="Preview" style="width: 100%; height: 160px; object-fit: cover; border-radius: 4px;">
            <button type="button" class="btn btn-outline btn-sm mt-2 w-100" (click)="currentSlide.img = ''">Remove Image</button>
          </div>
          <div class="validation-error mt-1" *ngIf="!currentSlide.img && slideForm.submitted">
            <small>An image is required.</small>
          </div>
        </div>
        
        <div class="drawer-actions mt-4">
          <button type="button" class="btn btn-outline" (click)="closeDrawer()" [disabled]="isSaving()">Cancel</button>
          <button type="submit" class="btn btn-primary" [disabled]="isSaving() || isUploading()">
            <span *ngIf="isSaving()" class="loader-sm"></span>
            <span *ngIf="!isSaving()">{{ isUploading() ? 'Uploading...' : (isEditing() ? 'Update Slide' : 'Save Slide') }}</span>
          </button>
        </div>
      </form>
    </app-side-drawer>

    <app-confirmation-modal
      [isOpen]="isDeleteModalOpen()"
      title="Delete Slide"
      message="Are you sure you want to delete this slide? This action cannot be undone."
      confirmText="Delete"
      (confirm)="confirmDelete()"
      (cancel)="cancelDelete()">
    </app-confirmation-modal>
  `,
  styles: [`
    .page-header {
      margin-bottom: 2rem;
      h2 { margin: 0; }
      p { margin: 0; }
    }
    
    .settings-container {
      display: grid;
      grid-template-columns: 240px 1fr;
      gap: 1.5rem;
      align-items: start;
    }
    
    .settings-nav {
      padding: 1rem 0;
      
      .nav-list {
        list-style: none;
        padding: 0;
        margin: 0;
        
        li {
          padding: 0.75rem 1.5rem;
          cursor: pointer;
          font-weight: 500;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          gap: 0.75rem;
          border-left: 3px solid transparent;
          transition: var(--transition);
          
          &:hover {
            background: rgba(0,0,0,0.02);
            color: var(--text-main);
          }
          
          &.active {
            background: rgba(128,0,0,0.05);
            color: var(--primary);
            border-left-color: var(--primary);
          }
        }
      }
    }
    
    .settings-content {
      padding: 1.5rem;
      background: white;
      border-radius: var(--border-radius-lg);
      box-shadow: 0 4px 12px rgba(0,0,0,0.03);
    }
    
    .content-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      border-bottom: 1px solid rgba(0,0,0,0.05);
      padding-bottom: 1rem;
      
      h3 { margin: 0; font-size: 1.1rem; }
    }
    
    .slides-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    
    .slide-item {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      padding: 1rem;
      background: rgba(0,0,0,0.02);
      border-radius: var(--border-radius-md);
      border: 1px solid rgba(0,0,0,0.04);
      
      .slide-order {
        .badge { background: #333; color: white; padding: 0.4rem 0.6rem; font-size: 0.9rem; }
      }
      
      .slide-img {
        width: 120px;
        height: 70px;
        border-radius: 4px;
        overflow: hidden;
        flex-shrink: 0;
        background: #f0f0f0;
        
        img { width: 100%; height: 100%; object-fit: cover; }
      }
      
      .slide-info {
        flex: 1;
        min-width: 0;
        
        h4 { margin: 0 0 0.25rem 0; font-size: 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        p { margin: 0 0 0.5rem 0; font-size: 0.85rem; }
        
        .slide-meta {
          display: flex;
          gap: 0.5rem;
        }
      }
      
      .slide-actions {
        display: flex;
        gap: 0.5rem;
        
        .btn-icon {
          background: white;
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 0.4rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: var(--transition);
          
          &:hover { background: #f0f0f0; }
          &.text-error:hover { color: var(--error); border-color: var(--error); background: rgba(220,53,69,0.05); }
        }
      }
    }
    
    .empty-state {
      text-align: center;
      padding: 3rem;
      color: var(--text-muted);
      
      span { font-size: 3rem; opacity: 0.5; margin-bottom: 1rem; display: block; }
    }
    
    .text-truncate {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .image-upload-area {
      border: 2px dashed #ced4da;
      border-radius: var(--border-radius-md);
      padding: 2rem;
      text-align: center;
      background: #f8f9fa;
      cursor: pointer;
      transition: var(--transition);
      
      &:hover { border-color: var(--primary); background: rgba(128, 0, 0, 0.02); }
      span { font-size: 2rem; color: var(--text-muted); margin-bottom: 0.5rem; }
      p { margin: 0; color: var(--text-muted); }
    }
    
    .upload-progress {
      .progress-bar-bg {
        width: 100%; height: 6px; background: rgba(0,0,0,0.05);
        border-radius: 3px; overflow: hidden;
      }
      .progress-bar-fill {
        height: 100%; background: var(--primary); transition: width 0.3s ease;
      }
    }
    
    .form-group { margin-bottom: 1.25rem; }
    .form-label { display: block; margin-bottom: 0.5rem; font-weight: 500; font-size: 0.9rem; color: #333; }
    
    .form-row { display: flex; gap: 1rem; flex-wrap: wrap; }
    .flex-1 { flex: 1; min-width: 200px; }
    .w-100 { width: 100%; }
    .mt-4 { margin-top: 1.5rem; }
    .mt-2 { margin-top: 0.5rem; }
    .mt-1 { margin-top: 0.25rem; }
    .mb-1 { margin-bottom: 0.25rem; }
    .text-sm { font-size: 0.8rem; }
    .drawer-actions { display: flex; gap: 1rem; button { flex: 1; } }
    
    .validation-error { color: var(--error); }
  `]
})
export class AdminSettingsComponent {
  dataService = inject(DataService);
  storage = inject(Storage);
  snackbar = inject(SnackbarService);
  
  slides = this.dataService.homeSlides;
  
  isDrawerOpen = signal(false);
  isEditing = signal(false);
  isSaving = signal(false);
  isUploading = signal(false);
  uploadProgress = signal(0);
  
  isDeleteModalOpen = signal(false);
  slideToDelete = signal<string | null>(null);
  
  currentSlide: any = this.getEmptySlide();

  getEmptySlide() {
    return {
      title: '',
      subtitle: '',
      tag: '',
      bg: '#000000', // Default fallback
      img: '',
      status: 'active',
      order: 1
    };
  }

  openDrawer(slide?: HomeSlide) {
    if (slide) {
      this.currentSlide = { ...slide };
      this.isEditing.set(true);
    } else {
      this.currentSlide = this.getEmptySlide();
      this.currentSlide.order = this.slides().length + 1;
      this.isEditing.set(false);
    }
    this.isDrawerOpen.set(true);
  }

  closeDrawer() {
    this.isDrawerOpen.set(false);
  }

  async saveSlide(form: any) {
    if (form.invalid || !this.currentSlide.img) {
      this.snackbar.show('Please fill all required fields and upload an image.', 'error');
      return;
    }
    
    this.isSaving.set(true);
    try {
      if (this.isEditing()) {
        await this.dataService.updateHomeSlide(this.currentSlide.id, this.currentSlide);
        this.snackbar.show('Slide updated successfully!');
      } else {
        await this.dataService.addHomeSlide(this.currentSlide);
        this.snackbar.show('Slide added successfully!');
      }
      this.closeDrawer();
    } catch (e) {
      console.error(e);
      this.snackbar.show('Failed to save slide.', 'error');
    } finally {
      this.isSaving.set(false);
    }
  }

  async onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.isUploading.set(true);
    this.uploadProgress.set(0);

    const filePath = `home-slides/${Date.now()}_${file.name}`;
    const storageRef = ref(this.storage, filePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    try {
      await new Promise((resolve, reject) => {
        uploadTask.on('state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            this.uploadProgress.set(Math.round(progress));
          },
          (error) => {
            console.error('Upload failed:', error);
            reject(error);
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              this.currentSlide.img = downloadURL;
              resolve(true);
            } catch (err) {
              reject(err);
            }
          }
        );
      });
    } catch (e) {
      console.error('Failed to get download URL', e);
      this.snackbar.show('Failed to upload image', 'error');
    } finally {
      this.isUploading.set(false);
    }
  }

  promptDeleteSlide(id: string) {
    this.slideToDelete.set(id);
    this.isDeleteModalOpen.set(true);
  }

  async confirmDelete() {
    const id = this.slideToDelete();
    if (id) {
      await this.deleteSlide(id);
    }
    this.isDeleteModalOpen.set(false);
    this.slideToDelete.set(null);
  }

  cancelDelete() {
    this.isDeleteModalOpen.set(false);
    this.slideToDelete.set(null);
  }

  async deleteSlide(id: string) {
    try {
      await this.dataService.deleteHomeSlide(id);
      this.snackbar.show('Slide deleted successfully', 'success');
    } catch (e) {
      console.error(e);
      this.snackbar.show('Failed to delete slide', 'error');
    }
  }
}
