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
  templateUrl: './admin-settings.component.html',
  styleUrls: ['./admin-settings.component.css']
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
