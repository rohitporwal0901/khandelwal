import { Injectable, signal, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class NetworkService {
  isOnline = signal<boolean>(true);
  isOfflineBillingMode = signal<boolean>(false);

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      this.isOnline.set(navigator.onLine);

      window.addEventListener('online', () => {
        this.isOnline.set(true);
        this.isOfflineBillingMode.set(false); // Reset offline billing mode when back online
        this.syncOfflineBills();
      });

      window.addEventListener('offline', () => {
        this.isOnline.set(false);
      });
    }
  }

  enableOfflineBilling() {
    this.isOfflineBillingMode.set(true);
  }

  private syncOfflineBills() {
    // We will implement this sync logic later
    console.log('Network is back! Attempting to sync offline bills...');
  }
}
