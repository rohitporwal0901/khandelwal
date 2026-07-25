import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-user-account',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="account-page">

      <!-- ─── Premium Profile Hero Banner ─────── -->
      <div class="profile-banner">
        <!-- Background decorative circles -->
        <div class="bg-circle circle-1"></div>
        <div class="bg-circle circle-2"></div>

        <div class="profile-main">
          <!-- Interactive Avatar with Photo Upload -->
          <div class="avatar-container">
            <div class="profile-avatar" [class.uploading]="photoUploading()">
              <img *ngIf="profile()?.photoUrl" [src]="profile()?.photoUrl" alt="Profile" class="profile-img">
              <span *ngIf="!profile()?.photoUrl" class="initial-text">{{ getInitial() }}</span>

              <div class="spinner-overlay" *ngIf="photoUploading()">
                <div class="spinner"></div>
              </div>
            </div>

            <!-- Camera button triggering file input -->
            <button class="camera-btn" (click)="fileInput.click()" [disabled]="photoUploading()" title="Upload Profile Picture">
              <span class="material-symbols-outlined icon">add_a_photo</span>
            </button>
            <input #fileInput type="file" accept="image/*" class="hidden-input" (change)="onFileSelected($event)">
          </div>

          <div class="profile-info">
            <div class="verified-badge">
              <span class="material-symbols-outlined icon-ver">verified</span>
              <span>Verified Wholesale Client</span>
            </div>
            <h2 class="profile-name">{{ profile()?.name || 'Member Account' }}</h2>
            <p class="profile-phone">🇮🇳 +91 {{ profile()?.phone }}</p>
          </div>
        </div>

        <!-- Floating Stats Banner -->
        <div class="stats-float-card">
          <div class="stat-item">
            <span class="stat-label">Security Tier</span>
            <span class="stat-value text-gold">Gold Member</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-label">Access Status</span>
            <span class="stat-value text-green flex-align">
              <span class="dot"></span> Active
            </span>
          </div>
        </div>
      </div>

      <!-- ─── Menu Sections ──────────────────── -->
      <div class="content-body">
        
        <div class="section-title">Wholesale Store & Orders</div>
        <div class="menu-card">
          <div class="menu-item" (click)="router.navigate(['/shop/orders'])">
            <div class="menu-icon orders-icon">
              <span class="material-symbols-outlined">package_2</span>
            </div>
            <div class="menu-content">
              <span class="menu-label">My Orders</span>
              <span class="menu-sub">Track production & printing status</span>
            </div>
            <span class="material-symbols-outlined menu-arrow">arrow_forward_ios</span>
          </div>

          <div class="divider"></div>

          <div class="menu-item" (click)="router.navigate(['/shop'])">
            <div class="menu-icon shop-icon">
              <span class="material-symbols-outlined">storefront</span>
            </div>
            <div class="menu-content">
              <span class="menu-label">Browse Catalogue</span>
              <span class="menu-sub">Explore wedding & invitation card designs</span>
            </div>
            <span class="material-symbols-outlined menu-arrow">arrow_forward_ios</span>
          </div>
        </div>

        <div class="section-title mt-4">Security & Support</div>
        <div class="menu-card">
          <div class="menu-item" (click)="showChangePinSheet.set(true)">
            <div class="menu-icon pin-icon">
              <span class="material-symbols-outlined">lock_reset</span>
            </div>
            <div class="menu-content">
              <span class="menu-label">Change Security PIN</span>
              <span class="menu-sub">Update your 6-digit wholesale access PIN</span>
            </div>
            <span class="material-symbols-outlined menu-arrow">arrow_forward_ios</span>
          </div>

          <div class="divider"></div>

          <div class="menu-item" (click)="contactSupport()">
            <div class="menu-icon support-icon">
              <span class="material-symbols-outlined">support_agent</span>
            </div>
            <div class="menu-content">
              <span class="menu-label">Wholesale Support Desk</span>
              <span class="menu-sub">Contact admin for custom bulk printing</span>
            </div>
            <span class="material-symbols-outlined menu-arrow">arrow_forward_ios</span>
          </div>
        </div>

        <!-- ─── Sign Out Button ────────────────── -->
        <div class="logout-section mt-4">
          <button class="logout-btn" (click)="confirmLogout.set(true)">
            <span class="material-symbols-outlined">logout</span>
            <span>Sign Out of Store</span>
          </button>
        </div>

        <p class="footer-note">Khandelwal Cards App • Secured Wholesale Access v2.0</p>
      </div>

      <!-- ─── Change PIN Bottom Sheet ──────── -->
      <div class="overlay" *ngIf="showChangePinSheet()" (click)="showChangePinSheet.set(false)"></div>
      <div class="bottom-sheet" [class.open]="showChangePinSheet()">
        <div class="sheet-handle"></div>
        <div class="sheet-header-badge">🔐 Security Update</div>
        <h3 class="sheet-title mt-1">Change Access PIN</h3>

        <div class="form-group">
          <label class="form-label">Current 6-Digit PIN</label>
          <div class="pin-boxes">
            <input *ngFor="let i of [0,1,2,3,4,5]"
              type="password" class="pin-box" maxlength="1" inputmode="numeric"
              [id]="'cur-pin-' + i"
              [(ngModel)]="currentPinDigits[i]"
              (input)="onPinInput($event, i, 'current')"
              (keydown.backspace)="onPinBackspace($event, i, 'current')">
          </div>
        </div>

        <div class="form-group mt-3">
          <label class="form-label">New 6-Digit PIN</label>
          <div class="pin-boxes">
            <input *ngFor="let i of [0,1,2,3,4,5]"
              type="password" class="pin-box" maxlength="1" inputmode="numeric"
              [id]="'chg-new-pin-' + i"
              [(ngModel)]="newPinDigits[i]"
              (input)="onPinInput($event, i, 'new')"
              (keydown.backspace)="onPinBackspace($event, i, 'new')">
          </div>
        </div>

        <div class="form-group mt-3">
          <label class="form-label">Confirm New PIN</label>
          <div class="pin-boxes">
            <input *ngFor="let i of [0,1,2,3,4,5]"
              type="password" class="pin-box" maxlength="1" inputmode="numeric"
              [id]="'chg-conf-pin-' + i"
              [(ngModel)]="confirmNewPinDigits[i]"
              (input)="onPinInput($event, i, 'confirm')"
              (keydown.backspace)="onPinBackspace($event, i, 'confirm')">
          </div>
        </div>

        <div class="error-msg" *ngIf="changePinError()">
          <span class="material-symbols-outlined">error</span> {{ changePinError() }}
        </div>
        <div class="success-msg" *ngIf="changePinSuccess()">
          <span class="material-symbols-outlined">check_circle</span> PIN changed successfully!
        </div>

        <button class="btn-primary mt-4" (click)="changePin()"
                [disabled]="changePinLoading() || currentPinDigits.join('').length !== 6 || newPinDigits.join('').length !== 6 || confirmNewPinDigits.join('').length !== 6">
          <span *ngIf="!changePinLoading()">Update Security PIN</span>
          <span class="btn-spinner" *ngIf="changePinLoading()"></span>
        </button>
      </div>

      <!-- ─── Logout Confirm Dialog ──────── -->
      <div class="overlay" *ngIf="confirmLogout()" (click)="confirmLogout.set(false)"></div>
      <div class="confirm-dialog" [class.open]="confirmLogout()">
        <div class="dialog-icon">
          <span class="material-symbols-outlined">logout</span>
        </div>
        <h3>Sign Out?</h3>
        <p>Are you sure you want to sign out from your Khandelwal Cards wholesale account?</p>
        <div class="dialog-actions">
          <button class="btn-cancel" (click)="confirmLogout.set(false)">Stay Logged In</button>
          <button class="btn-logout-confirm" (click)="logout()" [disabled]="logoutLoading()">
            <span *ngIf="!logoutLoading()">Sign Out</span>
            <span class="btn-spinner-dark" *ngIf="logoutLoading()"></span>
          </button>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .account-page {
      min-height: 100%;
      background: var(--background);
      padding-bottom: 3rem;
      overflow-x: hidden;
    }

    /* ─── Profile Banner ───────────────────── */
    .profile-banner {
      background: linear-gradient(135deg, #3a0000 0%, #7a0000 50%, #5a0000 100%);
      padding: 32px var(--space-base) 64px;
      position: relative;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0,0,0,0.18);
    }
    .bg-circle {
      position: absolute;
      border-radius: 50%;
      background: rgba(255,255,255,0.04);
      pointer-events: none;
    }
    .circle-1 { width: 220px; height: 220px; top: -60px; right: -60px; }
    .circle-2 { width: 140px; height: 140px; bottom: 10px; left: -40px; }

    .profile-main {
      display: flex;
      align-items: center;
      gap: 20px;
      position: relative;
      z-index: 2;
    }

    /* ─── Avatar & Camera ──────────────────── */
    .avatar-container {
      position: relative;
      flex-shrink: 0;
    }
    .profile-avatar {
      width: 82px;
      height: 82px;
      border-radius: 50%;
      background: linear-gradient(135deg, #D4AF37, #f0d060);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2.2rem;
      font-weight: 800;
      color: #4a0000;
      border: 3.5px solid rgba(255,255,255,0.3);
      box-shadow: 0 8px 24px rgba(0,0,0,0.35);
      overflow: hidden;
      position: relative;
      transition: transform 0.2s ease;
      
      &.uploading { opacity: 0.7; }
      .profile-img { width: 100%; height: 100%; object-fit: cover; }
    }
    .spinner-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      
      .spinner {
        width: 26px; height: 26px;
        border: 3px solid rgba(255,255,255,0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .camera-btn {
      position: absolute;
      bottom: -2px;
      right: -2px;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--primary);
      color: white;
      border: 2px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 10px rgba(0,0,0,0.25);
      transition: transform 0.15s ease, background 0.15s ease;
      
      &:hover { background: var(--primary-dark); transform: scale(1.1); }
      &:active { transform: scale(0.95); }
      .icon { font-size: 1.1rem; }
    }
    .hidden-input { display: none; }

    /* ─── Profile Info ─────────────────────── */
    .profile-info {
      flex: 1;
      .verified-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: rgba(212, 175, 55, 0.2);
        color: #F8E08E;
        font-size: 0.72rem;
        font-weight: 700;
        padding: 4px 10px;
        border-radius: 999px;
        border: 1px solid rgba(212, 175, 55, 0.4);
        margin-bottom: 6px;
        letter-spacing: 0.3px;

        .icon-ver { font-size: 0.95rem; color: #D4AF37; }
      }
      .profile-name {
        margin: 0 0 4px;
        font-size: 1.35rem;
        font-weight: 800;
        color: white;
        letter-spacing: -0.2px;
      }
      .profile-phone {
        margin: 0;
        font-size: 0.9rem;
        color: rgba(255,255,255,0.85);
        font-weight: 600;
      }
    }

    /* ─── Stats Floating Card ──────────────── */
    .stats-float-card {
      position: absolute;
      bottom: 12px;
      left: var(--space-base);
      right: var(--space-base);
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(12px);
      border-radius: 16px;
      padding: 12px 20px;
      display: flex;
      align-items: center;
      justify-content: space-around;
      box-shadow: 0 8px 24px rgba(0,0,0,0.12);
      border: 1px solid rgba(255,255,255,0.6);
      z-index: 3;
    }
    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }
    .stat-label { font-size: 0.7rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; }
    .stat-value { font-size: 0.9rem; font-weight: 800; }
    .text-gold { color: #B8860B; }
    .text-green { color: #2E7D32; }
    .flex-align { display: flex; align-items: center; gap: 6px; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: #2E7D32; box-shadow: 0 0 6px #2E7D32; }
    .stat-divider { width: 1px; height: 28px; background: rgba(0,0,0,0.08); }

    /* ─── Content Body ─────────────────────── */
    .content-body {
      padding: 24px var(--space-base) 0;
      position: relative;
      z-index: 2;
    }
    .section-title {
      font-size: 0.78rem;
      font-weight: 800;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin: 0 0 10px 4px;
    }

    /* ─── Menu Cards ───────────────────────── */
    .menu-card {
      background: var(--surface);
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 4px 18px rgba(0,0,0,0.05);
      border: 1px solid rgba(0,0,0,0.05);
    }
    .menu-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 18px;
      cursor: pointer;
      transition: background 0.15s ease;
      &:active { background: rgba(0,0,0,0.03); }
    }
    .menu-icon {
      width: 44px; height: 44px;
      border-radius: 14px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      .material-symbols-outlined { font-size: 1.4rem; }
    }
    .orders-icon { background: rgba(139,0,0,0.08); color: var(--primary); }
    .shop-icon { background: rgba(46,125,50,0.08); color: #2E7D32; }
    .pin-icon { background: rgba(212,175,55,0.12); color: #B8860B; }
    .support-icon { background: rgba(25,118,210,0.08); color: #1976D2; }

    .menu-content {
      flex: 1;
      display: flex; flex-direction: column; gap: 2px;
    }
    .menu-label { font-size: 0.95rem; font-weight: 700; color: var(--text-main); }
    .menu-sub { font-size: 0.75rem; color: var(--text-muted); }
    .menu-arrow { color: #ccc; font-size: 1rem; font-weight: 700; }
    .divider { height: 1px; background: rgba(0,0,0,0.05); margin: 0 18px; }

    /* ─── Logout ───────────────────────────── */
    .logout-section { width: 100%; }
    .logout-btn {
      width: 100%;
      height: 52px;
      border: 1.5px solid rgba(198,40,40,0.25);
      border-radius: 16px;
      background: white;
      color: #C62828;
      font-size: 0.95rem;
      font-weight: 700;
      font-family: inherit;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      transition: all 0.2s;
      box-shadow: 0 2px 10px rgba(198,40,40,0.05);
      
      .material-symbols-outlined { font-size: 1.3rem; }
      &:hover { background: #FFEBEE; border-color: #C62828; }
      &:active { transform: scale(0.98); }
    }

    .footer-note {
      text-align: center;
      font-size: 0.72rem;
      color: var(--text-muted);
      margin: 24px 0 0;
      opacity: 0.7;
    }

    /* ─── PIN Boxes ─────────────────────────── */
    .pin-boxes { display: flex; gap: 8px; justify-content: center; }
    .pin-box {
      width: 44px; height: 52px;
      border: 2px solid rgba(0,0,0,0.12); border-radius: 12px;
      text-align: center; font-size: 1.3rem; font-weight: 700;
      font-family: inherit; color: var(--primary); background: white;
      outline: none; transition: border-color 0.2s, box-shadow 0.2s;
      -webkit-text-security: disc;
      &:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(139,0,0,0.1); }
      &:not(:placeholder-shown) { border-color: #D4AF37; background: rgba(212,175,55,0.05); }
    }

    /* ─── Bottom Sheet & Dialog ─────────────── */
    .overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.45);
      z-index: 200;
      backdrop-filter: blur(3px);
    }
    .bottom-sheet {
      position: fixed; bottom: 0; left: 50%; transform: translateX(-50%) translateY(100%);
      width: 100%; max-width: 480px;
      background: white; border-radius: 28px 28px 0 0;
      padding: 16px var(--space-base) 2.5rem;
      z-index: 201;
      transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 0 -10px 40px rgba(0,0,0,0.2);
      &.open { transform: translateX(-50%) translateY(0); }
    }
    .sheet-handle { width: 40px; height: 5px; border-radius: 999px; background: rgba(0,0,0,0.12); margin: 0 auto 16px; }
    .sheet-header-badge {
      display: inline-block; background: rgba(212,175,55,0.15); color: #8A6D14;
      font-size: 0.72rem; font-weight: 700; padding: 4px 10px; border-radius: 6px;
    }
    .sheet-title { font-size: 1.15rem; font-weight: 800; margin: 0 0 20px; color: var(--text-main); }

    .confirm-dialog {
      position: fixed; bottom: 0; left: 50%; transform: translateX(-50%) translateY(100%);
      width: 100%; max-width: 480px;
      background: white; border-radius: 28px 28px 0 0;
      padding: 24px var(--space-base) 2rem;
      z-index: 201;
      transition: transform 0.3s ease;
      text-align: center;
      
      .dialog-icon {
        width: 56px; height: 56px; border-radius: 50%; background: #FFEBEE; color: #C62828;
        display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;
        .material-symbols-outlined { font-size: 1.8rem; }
      }
      h3 { margin: 0 0 8px; font-size: 1.15rem; font-weight: 800; }
      p { margin: 0 0 24px; font-size: 0.88rem; color: var(--text-muted); line-height: 1.4; }
      &.open { transform: translateX(-50%) translateY(0); }
    }
    .dialog-actions { display: flex; gap: 12px; }
    .btn-cancel {
      flex: 1; height: 50px; border: 1.5px solid rgba(0,0,0,0.12);
      border-radius: 14px; background: none; font-size: 0.95rem;
      font-weight: 700; font-family: inherit; cursor: pointer;
    }
    .btn-logout-confirm {
      flex: 1; height: 50px; background: #C62828;
      border: none; border-radius: 14px; color: white;
      font-size: 0.95rem; font-weight: 700; font-family: inherit; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      &:disabled { opacity: 0.6; }
    }

    /* ─── Misc ──────────────────────────────── */
    .btn-primary {
      width: 100%; height: 52px;
      background: linear-gradient(135deg, #7a0000 0%, #8B0000 100%);
      color: white; border: none; border-radius: 14px;
      font-size: 0.95rem; font-weight: 700; font-family: inherit;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 18px rgba(139,0,0,0.25);
      &:disabled { opacity: 0.55; cursor: not-allowed; box-shadow: none; }
    }
    .btn-spinner {
      width: 18px; height: 18px;
      border: 2px solid rgba(255,255,255,0.3); border-top-color: white;
      border-radius: 50%; animation: spin 0.8s linear infinite;
    }
    .btn-spinner-dark {
      width: 16px; height: 16px;
      border: 2px solid rgba(255,255,255,0.4); border-top-color: white;
      border-radius: 50%; animation: spin 0.8s linear infinite;
    }
    .error-msg {
      display: flex; align-items: center; gap: 6px;
      color: var(--error); font-size: 0.8rem; font-weight: 500; margin-top: 10px;
      .material-symbols-outlined { font-size: 1rem; }
    }
    .success-msg {
      display: flex; align-items: center; gap: 6px;
      color: var(--success); font-size: 0.8rem; font-weight: 500; margin-top: 10px;
      .material-symbols-outlined { font-size: 1rem; }
    }
    .form-group { display: flex; flex-direction: column; gap: 8px; }
    .form-label {
      font-size: 0.75rem; font-weight: 700; color: var(--text-secondary);
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    .mt-1 { margin-top: 0.25rem; }
    .mt-3 { margin-top: 1rem; }
    .mt-4 { margin-top: 1.5rem; }
  `]
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
    } catch(e) {
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
    switch(type) {
      case 'current': return this.currentPinDigits;
      case 'new': return this.newPinDigits;
      case 'confirm': return this.confirmNewPinDigits;
      default: return this.currentPinDigits;
    }
  }
  private getPinId(type: string, index: number): string {
    switch(type) {
      case 'current': return `cur-pin-${index}`;
      case 'new': return `chg-new-pin-${index}`;
      case 'confirm': return `chg-conf-pin-${index}`;
      default: return `cur-pin-${index}`;
    }
  }
}
