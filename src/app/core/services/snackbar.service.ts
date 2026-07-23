import { Injectable, signal } from '@angular/core';

export type SnackbarType = 'success' | 'error' | 'info';

@Injectable({
  providedIn: 'root'
})
export class SnackbarService {
  message = signal('');
  type = signal<SnackbarType>('success');
  isOpen = signal(false);
  private timeoutId: any;

  show(message: string, type: SnackbarType = 'success', duration = 3000) {
    this.message.set(message);
    this.type.set(type);
    this.isOpen.set(true);

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(() => {
      this.close();
    }, duration);
  }

  close() {
    this.isOpen.set(false);
  }
}
