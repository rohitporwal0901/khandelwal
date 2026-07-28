import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-user-account',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-account.component.html',
  styleUrls: ['./user-account.component.css']
})
export class UserAccountComponent {
  authService = inject(AuthService);
  router = inject(Router);

  profile = this.authService.currentUserProfile;

  showChangePinSheet = signal(false);
  confirmLogout = signal(false);
  logoutLoading = signal(false);
  photoUploading = signal(false);

  changePinLoading = signal(false);
  changePinError = signal('');
  changePinSuccess = signal(false);

  currentPinDigits: string[] = ['', '', '', '', '', ''];
  newPinDigits: string[] = ['', '', '', '', '', ''];
  confirmNewPinDigits: string[] = ['', '', '', '', '', ''];

  getInitial(): string {
    const name = this.profile()?.name || 'U';
    return name.charAt(0).toUpperCase();
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.photoUploading.set(true);

      const reader = new FileReader();
      reader.onload = (e: any) => {
        const img = new Image();
        img.src = e.target.result;
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 300; // Resize to 300x300 for optimal Firestore storage
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const base64 = canvas.toDataURL('image/jpeg', 0.85);

          try {
            const uid = this.profile()?.uid;
            if (uid) {
              await this.authService.updateProfilePhoto(uid, base64);
            }
          } catch (err) {
            alert('Failed to update profile picture. Please try again.');
          } finally {
            this.photoUploading.set(false);
          }
        };
      };
      reader.readAsDataURL(file);
    }
  }

  contactSupport() {
    alert('Wholesale Support Desk: Please contact Admin at +91 98765 43210 for custom wholesale printing orders and assistance.');
  }

  async logout() {
    this.logoutLoading.set(true);
    try {
      await this.authService.logoutUser();
      this.router.navigate(['/shop/login']);
    } catch (e) {
      console.error(e);
    } finally {
      this.logoutLoading.set(false);
      this.confirmLogout.set(false);
    }
  }

  async changePin() {
    const currentPin = this.currentPinDigits.join('');
    const newPin = this.newPinDigits.join('');
    const confirmPin = this.confirmNewPinDigits.join('');

    this.changePinError.set('');
    this.changePinSuccess.set(false);

    if (newPin !== confirmPin) { this.changePinError.set('New PINs do not match.'); return; }
    if (newPin === currentPin) { this.changePinError.set('New PIN cannot be same as current PIN.'); return; }

    this.changePinLoading.set(true);
    try {
      await this.authService.resetPin(currentPin, newPin);
      this.changePinSuccess.set(true);
      this.currentPinDigits = ['', '', '', '', '', ''];
      this.newPinDigits = ['', '', '', '', '', ''];
      this.confirmNewPinDigits = ['', '', '', '', '', ''];
      setTimeout(() => {
        this.showChangePinSheet.set(false);
        this.changePinSuccess.set(false);
      }, 1500);
    } catch (e: any) {
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        this.changePinError.set('Current PIN is incorrect.');
      } else {
        this.changePinError.set('Failed to change PIN. Please try again.');
      }
    } finally {
      this.changePinLoading.set(false);
    }
  }

  onPinInput(event: Event, index: number, type: string) {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/\D/g, '').slice(-1);
    const arr = this.getPinArr(type);
    arr[index] = input.value;
    if (input.value && index < 5) {
      document.getElementById(this.getPinId(type, index + 1))?.focus();
    }
  }

  onPinBackspace(event: Event, index: number, type: string) {
    const arr = this.getPinArr(type);
    if (!arr[index] && index > 0) {
      arr[index - 1] = '';
      document.getElementById(this.getPinId(type, index - 1))?.focus();
    }
  }

  private getPinArr(type: string): string[] {
    switch (type) {
      case 'current': return this.currentPinDigits;
      case 'new': return this.newPinDigits;
      case 'confirm': return this.confirmNewPinDigits;
      default: return this.currentPinDigits;
    }
  }
  private getPinId(type: string, index: number): string {
    switch (type) {
      case 'current': return `cur-pin-${index}`;
      case 'new': return `chg-new-pin-${index}`;
      case 'confirm': return `chg-conf-pin-${index}`;
      default: return `cur-pin-${index}`;
    }
  }
}
