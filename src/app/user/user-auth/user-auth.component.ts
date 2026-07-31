import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SnackbarService } from '../../core/services/snackbar.service';

type Screen = 'phone' | 'login-pin' | 'register' | 'forgot-pin' | 'waiting-approval';

@Component({
  selector: 'app-user-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-auth.component.html',
  styleUrls: ['./user-auth.component.css']
})
export class UserAuthComponent implements OnInit {
  authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackbar = inject(SnackbarService);

  screen = signal<Screen>('phone');
  isLoading = signal(false);
  errorMsg = signal('');

  phoneNumber = '';
  registerName = '';

  loginPinDigits: string[] = ['', '', '', '', '', ''];
  registerPinDigits: string[] = ['', '', '', '', '', ''];
  confirmPinDigits: string[] = ['', '', '', '', '', ''];
  newPinDigits: string[] = ['', '', '', '', '', ''];
  newConfirmPinDigits: string[] = ['', '', '', '', '', ''];

  ngOnInit() {
    // If user is already logged in, check their approval status
    this.checkInitialStatus();
  }

  private checkInitialStatus() {
    const statusParam = this.route.snapshot.queryParamMap.get('status');
    const profile = this.authService.currentUserProfile();
    
    if (statusParam === 'pending' || statusParam === 'rejected' || profile?.status === 'pending' || profile?.status === 'rejected') {
      this.screen.set('waiting-approval');
    } else if (this.authService.isAuthenticated() && profile?.status === 'approved') {
      this.navigateAfterLogin();
    }
  }

  onPhoneInput(event: Event) {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/\D/g, '');
    this.phoneNumber = input.value;
    this.errorMsg.set('');

    // ✅ Rapido-style: auto-proceed when 10 digits entered
    if (this.phoneNumber.length === 10) {
      setTimeout(() => this.checkPhone(), 100);
    }
  }

  async checkPhone() {
    this.errorMsg.set('');
    if (this.phoneNumber.length !== 10) {
      this.errorMsg.set('Please enter a valid 10-digit mobile number.');
      return;
    }
    this.isLoading.set(true);
    try {
      const exists = await this.authService.isPhoneRegistered(this.phoneNumber);
      if (exists) {
        this.screen.set('login-pin');
      } else {
        this.screen.set('register');
      }
    } catch (e) {
      this.errorMsg.set('Something went wrong. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async loginUser() {
    const pin = this.loginPinDigits.join('');
    if (pin.length !== 6) return;
    this.isLoading.set(true);
    this.errorMsg.set('');
    try {
      await this.authService.loginUser(this.phoneNumber, pin);
      // Wait briefly for profile snapshot to load if not already loaded
      for (let i = 0; i < 40; i++) {
        if (this.authService.currentUserProfile()) break;
        await new Promise(r => setTimeout(r, 50));
      }
      this.snackbar.show('Logged in successfully!', 'success');
      this.navigateAfterLogin();
    } catch (e: any) {
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        this.errorMsg.set('Incorrect PIN. Please try again.');
      } else {
        this.errorMsg.set('Login failed. Please try again.');
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  async registerUser() {
    const pin = this.registerPinDigits.join('');
    const confirmPin = this.confirmPinDigits.join('');
    if (!this.registerName.trim()) { this.errorMsg.set('Please enter your full name or business name.'); return; }
    if (pin.length !== 6) { this.errorMsg.set('Please enter a 6-digit security PIN.'); return; }
    if (pin !== confirmPin) { this.errorMsg.set('PINs do not match. Please try again.'); return; }

    this.isLoading.set(true);
    this.errorMsg.set('');
    try {
      await this.authService.registerUser(this.registerName, this.phoneNumber, pin);
      // After registration, user status is 'pending' -> show waiting approval screen
      this.snackbar.show('Registration successful! Waiting for approval.', 'success');
      this.screen.set('waiting-approval');
    } catch (e: any) {
      if (e.code === 'auth/email-already-in-use') {
        this.errorMsg.set('This number is already registered. Please login.');
        this.screen.set('login-pin');
      } else {
        this.errorMsg.set('Registration failed. Please try again.');
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  async refreshApprovalStatus() {
    const user = this.authService.currentUser();
    if (!user) {
      this.screen.set('phone');
      return;
    }
    this.isLoading.set(true);
    this.errorMsg.set('');
    try {
      await this.authService.fetchUserProfile(user.uid);
      const profile = this.authService.currentUserProfile();
      if (profile?.status === 'approved') {
        this.navigateAfterLogin();
      } else if (profile?.status === 'rejected') {
        this.errorMsg.set('Your account access was declined by Admin.');
      } else {
        this.errorMsg.set('Still pending admin verification. Please check back shortly!');
      }
    } catch (e) {
      this.errorMsg.set('Could not refresh status. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async logoutFromWaiting() {
    await this.authService.logoutUser();
    this.screen.set('phone');
    this.phoneNumber = '';
    this.errorMsg.set('');
  }

  async resetPin() {
    const newPin = this.newPinDigits.join('');
    const confirmPin = this.newConfirmPinDigits.join('');
    if (newPin.length !== 6) { this.errorMsg.set('Please enter a 6-digit PIN.'); return; }
    if (newPin !== confirmPin) { this.errorMsg.set('PINs do not match.'); return; }

    this.isLoading.set(true);
    this.errorMsg.set('');
    try {
      await this.authService.setNewPin(this.phoneNumber, newPin);
      this.snackbar.show('PIN reset successfully!', 'success');
      this.navigateAfterLogin();
    } catch(e: any) {
      this.errorMsg.set(e.message || 'Unable to reset PIN. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  goBack() {
    this.errorMsg.set('');
    this.loginPinDigits = ['', '', '', '', '', ''];
    this.registerPinDigits = ['', '', '', '', '', ''];
    this.confirmPinDigits = ['', '', '', '', '', ''];
    this.screen.set('phone');
  }

  private navigateAfterLogin() {
    const profile = this.authService.currentUserProfile();
    if (profile && (profile.status === 'pending' || profile.status === 'rejected')) {
      this.screen.set('waiting-approval');
      return;
    }
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/shop';
    this.router.navigateByUrl(returnUrl);
  }

  // ─── PIN Box Keyboard Helpers ──────────────────
  onPinInput(event: Event, index: number, type: string) {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/\D/g, '').slice(-1);
    const arr = this.getPinArr(type);
    arr[index] = input.value;
    this.errorMsg.set('');

    if (input.value && index < 5) {
      const nextId = this.getPinId(type, index + 1);
      document.getElementById(nextId)?.focus();
    }

    // ✅ Rapido-style: auto-submit login when 6th PIN digit entered
    if (type === 'login' && index === 5 && input.value) {
      const allFilled = this.loginPinDigits.every(d => d !== '');
      if (allFilled) {
        setTimeout(() => this.loginUser(), 150);
      }
    }
  }

  onPinBackspace(event: Event, index: number, type: string) {
    const arr = this.getPinArr(type);
    if (!arr[index] && index > 0) {
      arr[index - 1] = '';
      const prevId = this.getPinId(type, index - 1);
      document.getElementById(prevId)?.focus();
    }
  }

  onPinKeydown(event: Event, type: string) {}

  private getPinArr(type: string): string[] {
    switch(type) {
      case 'login': return this.loginPinDigits;
      case 'register': return this.registerPinDigits;
      case 'confirm': return this.confirmPinDigits;
      case 'new': return this.newPinDigits;
      case 'new-confirm': return this.newConfirmPinDigits;
      default: return this.loginPinDigits;
    }
  }

  private getPinId(type: string, index: number): string {
    switch(type) {
      case 'login': return `login-pin-${index}`;
      case 'register': return `reg-pin-${index}`;
      case 'confirm': return `conf-pin-${index}`;
      case 'new': return `new-pin-${index}`;
      case 'new-confirm': return `new-conf-pin-${index}`;
      default: return `login-pin-${index}`;
    }
  }
}
