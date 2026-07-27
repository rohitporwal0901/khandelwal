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

      <!-- ─── Clean Myntra-Style Profile Header ─── -->
      <div class="profile-header">
        <div class="profile-card-inner">
          
          <!-- Avatar & Camera Upload -->
          <div class="avatar-wrap">
            <div class="profile-avatar" [class.uploading]="photoUploading()">
              <img *ngIf="profile()?.photoUrl" [src]="profile()?.photoUrl" alt="Profile" class="profile-img">
              <span *ngIf="!profile()?.photoUrl" class="initial-text">{{ getInitial() }}</span>

              <div class="spinner-overlay" *ngIf="photoUploading()">
                <div class="spinner"></div>
              </div>
            </div>

            <button class="camera-badge" (click)="fileInput.click()" [disabled]="photoUploading()" title="Upload Photo">
              <span class="material-symbols-outlined icon">photo_camera</span>
            </button>
            <input #fileInput type="file" accept="image/*" class="hidden-input" (change)="onFileSelected($event)">
          </div>

          <!-- User Details -->
          <div class="profile-details">
            <div class="verified-tag">
              <span class="material-symbols-outlined icon-ver">verified</span>
              <span>Verified Wholesale Client</span>
            </div>
            <h2 class="user-name">{{ profile()?.name || 'Member Account' }}</h2>
            <p class="user-phone">🇮🇳 +91-{{ profile()?.phone }}</p>

            <div class="status-badge-clean">
              <span class="dot-green"></span>
              <span>Active Wholesale Access</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Account Ledger Balance Card -->
      <div class="balance-card-container">
        <div class="balance-card" [class.is-due]="(profile()?.balance || 0) > 0" [class.is-advance]="(profile()?.balance || 0) < 0">
          <div class="bc-left">
            <div class="bc-icon-wrap">
              <span class="material-symbols-outlined bc-icon">
                {{ (profile()?.balance || 0) > 0 ? 'account_balance_wallet' : 'account_balance_wallet' }}
              </span>
            </div>
            <div class="bc-info">
              <span class="bc-title">Account Ledger Balance</span>
              
              <!-- Due State -->
              <span *ngIf="(profile()?.balance || 0) > 0" class="bc-amount text-danger">
                ₹{{ profile()?.balance | number:'1.2-2' }} <span class="bc-sub">(Due / बकाया)</span>
              </span>
              
              <!-- Advance State -->
              <span *ngIf="(profile()?.balance || 0) < 0" class="bc-amount text-success">
                ₹{{ ((profile()?.balance || 0) * -1) | number:'1.2-2' }} <span class="bc-sub">(Advance / जमा)</span>
              </span>
              
              <!-- Settled State -->
              <span *ngIf="(profile()?.balance || 0) === 0" class="bc-amount text-success">
                ₹0.00 <span class="bc-sub">(Settled)</span>
              </span>
            </div>
          </div>
          <span class="material-symbols-outlined bc-arrow">chevron_right</span>
        </div>
      </div>

      <!-- ─── Clean Menu Sections ────────────── -->
      <div class="menu-container">
        
        <div class="section-heading">Orders & Catalogue</div>
        <div class="menu-box">
          <div class="menu-row" (click)="router.navigate(['/shop/orders'])">
            <span class="material-symbols-outlined row-icon icon-orders">package_2</span>
            <div class="row-info">
              <span class="row-title">My Orders</span>
              <span class="row-subtitle">Track custom printing & production status</span>
            </div>
            <span class="material-symbols-outlined row-chevron">arrow_forward_ios</span>
          </div>

          <div class="row-divider"></div>

          <div class="menu-row" (click)="router.navigate(['/shop'])">
            <span class="material-symbols-outlined row-icon icon-shop">auto_stories</span>
            <div class="row-info">
              <span class="row-title">Browse Catalogue</span>
              <span class="row-subtitle">Explore wedding & invitation card designs</span>
            </div>
            <span class="material-symbols-outlined row-chevron">arrow_forward_ios</span>
          </div>
        </div>

        <div class="section-heading mt-4">Security & Settings</div>
        <div class="menu-box">
          <div class="menu-row" (click)="showChangePinSheet.set(true)">
            <span class="material-symbols-outlined row-icon icon-pin">lock_reset</span>
            <div class="row-info">
              <span class="row-title">Change Security PIN</span>
              <span class="row-subtitle">Update your 6-digit wholesale access code</span>
            </div>
            <span class="material-symbols-outlined row-chevron">arrow_forward_ios</span>
          </div>

          <div class="row-divider"></div>

          <!-- <div class="menu-row" (click)="contactSupport()">
            <span class="material-symbols-outlined row-icon icon-support">support_agent</span>
            <div class="row-info">
              <span class="row-title">Wholesale Support Desk</span>
              <span class="row-subtitle">Contact admin for custom bulk printing</span>
            </div>
            <span class="material-symbols-outlined row-chevron">arrow_forward_ios</span>
          </div> -->
        </div>

        <!-- ─── Sign Out ──────────────────────── -->
        <div class="logout-wrap mt-4">
          <button class="btn-logout-clean" (click)="confirmLogout.set(true)">
            <span class="material-symbols-outlined">logout</span>
            <span>LOG OUT OF STORE</span>
          </button>
        </div>

        <p class="app-version-text">Khandelwal Cards Portal v2.0 • Secured Access</p>
      </div>

      <!-- ─── Change PIN Bottom Sheet (Rapido Style) ──────── -->
      <div class="overlay" *ngIf="showChangePinSheet()" (click)="showChangePinSheet.set(false)"></div>
      <div class="bottom-sheet" [class.open]="showChangePinSheet()">
        <div class="sheet-handle"></div>
        
        <div class="sheet-top-row">
          <div>
            <div class="sheet-header-badge">🔐 Security Settings</div>
            <h3 class="sheet-title mt-1">Change Access PIN</h3>
          </div>
          <button class="btn-close-rapido" (click)="showChangePinSheet.set(false)" title="Close">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <p class="sheet-sub">Enter your current 6-digit PIN and set a new security PIN below.</p>

        <div class="form-group mt-2">
          <label class="form-label">Current PIN</label>
          <div class="pin-boxes">
            <input *ngFor="let i of [0,1,2,3,4,5]"
              type="password" class="pin-box" [class.filled]="currentPinDigits[i] !== ''" maxlength="1" inputmode="numeric"
              [id]="'cur-pin-' + i"
              [(ngModel)]="currentPinDigits[i]"
              (input)="onPinInput($event, i, 'current')"
              (keydown.backspace)="onPinBackspace($event, i, 'current')">
          </div>
        </div>

        <div class="form-group mt-2">
          <label class="form-label">New PIN</label>
          <div class="pin-boxes">
            <input *ngFor="let i of [0,1,2,3,4,5]"
              type="password" class="pin-box" [class.filled]="newPinDigits[i] !== ''" maxlength="1" inputmode="numeric"
              [id]="'chg-new-pin-' + i"
              [(ngModel)]="newPinDigits[i]"
              (input)="onPinInput($event, i, 'new')"
              (keydown.backspace)="onPinBackspace($event, i, 'new')">
          </div>
        </div>

        <div class="form-group mt-2">
          <label class="form-label">Confirm New PIN</label>
          <div class="pin-boxes">
            <input *ngFor="let i of [0,1,2,3,4,5]"
              type="password" class="pin-box" [class.filled]="confirmNewPinDigits[i] !== ''" maxlength="1" inputmode="numeric"
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

        <button class="btn-rapido-update mt-3" (click)="changePin()"
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
      background: #F5F5F6; /* Clean Myntra light gray background */
      padding-bottom: 4rem;
      color: #282C3F;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    /* ─── Profile Header (Myntra Clean Style) ─── */
    .profile-header {
      background: #FFFFFF;
      border-bottom: 1px solid #EAEAEA;
      padding: 24px var(--space-base) 0;
      margin-bottom: 16px;
    }
    .profile-card-inner {
      display: flex;
      align-items: center;
      gap: 20px;
      padding-bottom: 24px;
    }

    /* ─── Avatar ───────────────────────────── */
    .avatar-wrap {
      position: relative;
      flex-shrink: 0;
    }
    .profile-avatar {
      width: 76px;
      height: 76px;
      border-radius: 50%;
      background: #F5F5F6;
      border: 1.5px solid #D4AF37;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      font-weight: 700;
      color: #8B0000;
      overflow: hidden;
      position: relative;
      box-shadow: 0 2px 10px rgba(0,0,0,0.06);

      &.uploading { opacity: 0.7; }
      .profile-img { width: 100%; height: 100%; object-fit: cover; }
    }
    .spinner-overlay {
      position: absolute; inset: 0; background: rgba(0,0,0,0.4);
      display: flex; align-items: center; justify-content: center;
      .spinner {
        width: 22px; height: 22px; border: 2.5px solid rgba(255,255,255,0.3);
        border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite;
      }
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .camera-badge {
      position: absolute; bottom: 0; right: 0;
      width: 28px; height: 28px; border-radius: 50%;
      background: #282C3F; color: #FFFFFF;
      border: 2px solid #FFFFFF; display: flex; align-items: center; justify-content: center;
      cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.15);
      transition: transform 0.15s ease;
      &:active { transform: scale(0.9); }
      .icon { font-size: 0.95rem; }
    }
    .hidden-input { display: none; }

    /* ─── Profile Details ──────────────────── */
    .profile-details {
      flex: 1;
    }
    .verified-tag {
      display: inline-flex; align-items: center; gap: 4px;
      color: #B8860B; font-size: 0.72rem; font-weight: 700;
      margin-bottom: 4px; letter-spacing: 0.2px;
      .icon-ver { font-size: 0.9rem; color: #D4AF37; }
    }
    .user-name {
      margin: 0 0 2px; font-size: 1.25rem; font-weight: 700;
      color: #282C3F; letter-spacing: -0.3px;
    }
    .user-phone {
      margin: 0 0 8px; font-size: 0.85rem; font-weight: 600; color: #686B78;
    }
    .status-badge-clean {
      display: inline-flex; align-items: center; gap: 6px;
      background: #E8F8F5; color: #0E6655; font-size: 0.72rem;
      font-weight: 700; padding: 3px 10px; border-radius: 4px;
      border: 1px solid #D1F2EB;
      .dot-green { width: 6px; height: 6px; border-radius: 50%; background: #117A65; }
    }

    /* ─── Ledger Balance Card ────────────────── */
    .balance-card-container {
      padding: 0 var(--space-base);
      margin-bottom: 16px;
    }
    .balance-card {
      background: #FFFFFF;
      border-radius: 12px;
      padding: 16px;
      display: flex; align-items: center; justify-content: space-between;
      border: 1px solid #EAEAEA;
      box-shadow: 0 4px 12px rgba(0,0,0,0.03);
      transition: transform 0.2s;
      
      &:active { transform: scale(0.98); }
      
      &.is-due {
        border-color: rgba(220,38,38,0.2);
        background: linear-gradient(145deg, #FFF5F5 0%, #FFFFFF 100%);
        .bc-icon-wrap { background: rgba(220,38,38,0.1); color: var(--error); }
      }
      &.is-advance {
        border-color: rgba(22,163,74,0.2);
        background: linear-gradient(145deg, #F0FDF4 0%, #FFFFFF 100%);
        .bc-icon-wrap { background: rgba(22,163,74,0.1); color: var(--success); }
      }
    }
    .bc-left {
      display: flex; align-items: center; gap: 14px;
    }
    .bc-icon-wrap {
      width: 42px; height: 42px; border-radius: 10px;
      background: rgba(0,0,0,0.04); color: #535766;
      display: flex; align-items: center; justify-content: center;
    }
    .bc-icon { font-size: 1.6rem; }
    
    .bc-info {
      display: flex; flex-direction: column; gap: 2px;
    }
    .bc-title {
      font-size: 0.75rem; font-weight: 600; color: #686B78; text-transform: uppercase; letter-spacing: 0.5px;
    }
    .bc-amount {
      font-size: 1.15rem; font-weight: 800; color: #282C3F; letter-spacing: -0.3px; display: flex; align-items: baseline; gap: 4px;
    }
    .bc-sub { font-size: 0.75rem; font-weight: 600; opacity: 0.8; }
    
    .text-danger { color: var(--error) !important; }
    .text-success { color: var(--success) !important; }
    
    .bc-arrow { color: #C4C6CE; font-size: 1.4rem; }

    /* ─── Menu Container ───────────────────── */
    .menu-container {
      padding: 16px var(--space-base) 0;
    }
    .section-heading {
      font-size: 0.75rem; font-weight: 700; color: #535766;
      text-transform: uppercase; letter-spacing: 0.8px;
      margin: 0 0 8px 2px;
    }

    /* ─── Clean Menu Box (Myntra Style) ────── */
    .menu-box {
      background: #FFFFFF;
      border-radius: 8px;
      border: 1px solid #EAEAEA;
      overflow: hidden;
    }
    .menu-row {
      display: flex; align-items: center; gap: 16px;
      padding: 16px; cursor: pointer;
      transition: background 0.15s ease;
      &:hover { background: #FAFDFC; }
      &:active { background: #F5F5F6; }
    }
    .row-icon {
      font-size: 1.4rem; color: #535766; flex-shrink: 0;
    }
    .icon-orders { color: #8B0000; }
    .icon-shop { color: #2E7D32; }
    .icon-pin { color: #B8860B; }
    .icon-support { color: #1976D2; }

    .row-info {
      flex: 1; display: flex; flex-direction: column; gap: 2px;
    }
    .row-title { font-size: 0.92rem; font-weight: 600; color: #282C3F; }
    .row-subtitle { font-size: 0.75rem; color: #94969F; }
    .row-chevron { font-size: 0.9rem; color: #C4C6CE; font-weight: 700; }
    .row-divider { height: 1px; background: #F5F5F6; margin: 0 16px; }

    /* ─── Sign Out Clean Button ────────────── */
    .logout-wrap { width: 100%; }
    .btn-logout-clean {
      width: 100%; height: 48px;
      background: #FFFFFF; color: #8B0000;
      border: 1px solid #EAEAEA; border-radius: 8px;
      font-size: 0.82rem; font-weight: 700; letter-spacing: 0.8px;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      gap: 8px; transition: all 0.15s ease;
      &:hover { background: #FFF5F5; border-color: #8B0000; }
      &:active { transform: scale(0.99); }
      .material-symbols-outlined { font-size: 1.2rem; }
    }

    .app-version-text {
      text-align: center; font-size: 0.72rem; color: #94969F;
      margin: 24px 0 0;
    }

    /* ─── PIN Boxes (Rapido Compact Style) ──── */
    .pin-boxes { display: flex; gap: 6px; justify-content: center; }
    .pin-box {
      width: 38px; height: 42px;
      border: 1.5px solid #D8D8DE; border-radius: 8px;
      text-align: center; font-size: 1.15rem; font-weight: 700;
      font-family: inherit; color: #282C3F; background: #FFFFFF;
      outline: none; transition: all 0.15s ease;
      -webkit-text-security: disc;
      &:focus { border-color: #D4AF37; box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.25); }
      &.filled { border-color: #D4AF37; background: #FFFDF0; color: #8B0000; }
    }

    /* ─── Bottom Sheet & Dialog (Rapido Style) ─ */
    .overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.55);
      z-index: 200; backdrop-filter: blur(3px);
    }
    .bottom-sheet {
      position: fixed; bottom: 0; left: 50%; transform: translateX(-50%) translateY(100%);
      width: 100%; max-width: 480px; background: white; border-radius: 24px 24px 0 0;
      padding: 12px var(--space-base) 2rem; z-index: 201;
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 0 -10px 40px rgba(0,0,0,0.2);
      &.open { transform: translateX(-50%) translateY(0); }
    }
    .sheet-handle { width: 36px; height: 4px; border-radius: 999px; background: #EAEAEA; margin: 0 auto 12px; }
    .sheet-top-row {
      display: flex; align-items: flex-start; justify-content: space-between;
      margin-bottom: 4px;
    }
    .sheet-header-badge {
      display: inline-block; background: #F5F5F6; color: #535766;
      font-size: 0.68rem; font-weight: 700; padding: 3px 8px; border-radius: 4px;
    }
    .sheet-title { font-size: 1.15rem; font-weight: 700; margin: 4px 0 0; color: #282C3F; }
    .sheet-sub { font-size: 0.8rem; color: #686B78; margin: 0 0 16px; line-height: 1.3; }
    
    .btn-close-rapido {
      width: 32px; height: 32px; border-radius: 50%;
      background: #F5F5F6; border: none; color: #535766;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all 0.15s ease;
      &:hover { background: #EAEAEA; color: #282C3F; }
      &:active { transform: scale(0.9); }
      .material-symbols-outlined { font-size: 1.2rem; }
    }

    .btn-rapido-update {
      width: 100%; height: 48px; background: #282C3F;
      color: white; border: none; border-radius: 12px;
      font-size: 0.92rem; font-weight: 700; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 14px rgba(40,44,63,0.2);
      transition: all 0.15s ease;
      &:hover { background: #1A1A1A; }
      &:active { transform: scale(0.98); }
      &:disabled { opacity: 0.55; cursor: not-allowed; box-shadow: none; }
    }

    .confirm-dialog {
      position: fixed; bottom: 0; left: 50%; transform: translateX(-50%) translateY(100%);
      width: 100%; max-width: 480px; background: white; border-radius: 20px 20px 0 0;
      padding: 24px var(--space-base) 2rem; z-index: 201;
      transition: transform 0.3s ease; text-align: center;
      .dialog-icon {
        width: 52px; height: 52px; border-radius: 50%; background: #FFF5F5; color: #8B0000;
        display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;
        .material-symbols-outlined { font-size: 1.6rem; }
      }
      h3 { margin: 0 0 8px; font-size: 1.15rem; font-weight: 700; color: #282C3F; }
      p { margin: 0 0 24px; font-size: 0.88rem; color: #686B78; line-height: 1.4; }
      &.open { transform: translateX(-50%) translateY(0); }
    }
    .dialog-actions { display: flex; gap: 12px; }
    .btn-cancel {
      flex: 1; height: 48px; border: 1px solid #EAEAEA; border-radius: 8px;
      background: none; font-size: 0.9rem; font-weight: 700; color: #282C3F; cursor: pointer;
    }
    .btn-logout-confirm {
      flex: 1; height: 48px; background: linear-gradient(135deg, #8B0000, #C0392B); border: none; border-radius: 8px;
      color: white; font-size: 0.9rem; font-weight: 700; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      &:disabled { opacity: 0.6; }
    }

    /* ─── Misc ──────────────────────────────── */
    .btn-primary {
      width: 100%; height: 48px; background: #8B0000;
      color: white; border: none; border-radius: 8px;
      font-size: 0.92rem; font-weight: 700; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 14px rgba(139,0,0,0.2);
      &:disabled { opacity: 0.55; cursor: not-allowed; box-shadow: none; }
    }
    .btn-spinner {
      width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite;
    }
    .btn-spinner-dark {
      width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.4);
      border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite;
    }
    .error-msg {
      display: flex; align-items: center; gap: 6px;
      color: #8B0000; font-size: 0.8rem; font-weight: 500; margin-top: 10px;
      .material-symbols-outlined { font-size: 1rem; }
    }
    .success-msg {
      display: flex; align-items: center; gap: 6px;
      color: #0E6655; font-size: 0.8rem; font-weight: 500; margin-top: 10px;
      .material-symbols-outlined { font-size: 1rem; }
    }
    .form-group { display: flex; flex-direction: column; gap: 8px; }
    .form-label {
      font-size: 0.72rem; font-weight: 700; color: #535766;
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
