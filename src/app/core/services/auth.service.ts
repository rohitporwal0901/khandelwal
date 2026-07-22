import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  isAuthenticated = signal<boolean>(false);
  isAdmin = signal<boolean>(false);
  
  constructor() {}

  login(email: string, pass: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (email === 'admin@khandelwalcards.com' && pass === '123456') {
          this.isAuthenticated.set(true);
          this.isAdmin.set(true);
          resolve(true);
        } else {
          reject('Invalid credentials');
        }
      }, 1500); // simulate network delay
    });
  }

  logout() {
    this.isAuthenticated.set(false);
    this.isAdmin.set(false);
  }
}
