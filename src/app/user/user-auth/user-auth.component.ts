import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

type Screen = 'phone' | 'login-pin' | 'register' | 'forgot-pin' | 'waiting-approval';

@Component({
  selector: 'app-user-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="auth-page">

      <!-- ─── Brand Header ─────────────────── -->
      <div class="auth-brand">
        <div class="brand-inner">
          <div class="brand-logo">
            <img src="assets/images/card1.png" alt="Logo" class="brand-img">
          </div>
          <div class="brand-text">
            <h1>Khandelwal Cards</h1>
            <span>Exclusive Member Access</span>
          </div>
        </div>
        <p class="brand-tagline">🏆 India's Premier Wholesale Wedding Cards Portal</p>
      </div>

      <!-- ═══════════════════════════════════ -->
      <!-- Screen 1: Phone Number             -->
      <!-- ═══════════════════════════════════ -->
      <div class="auth-card" *ngIf="screen() === 'phone'">
        <div class="vip-badge">
          <span class="material-symbols-outlined icon-small">verified_user</span>
          <span>Verified Wholesale Portal</span>
        </div>
        
        <div class="header-section mt-3">
          <h2 class="auth-title">Welcome to Khandelwal</h2>
          <p class="auth-subtitle">Enter your mobile number to sign in or apply for exclusive member access.</p>
        </div>

        <div class="form-group mt-4">
          <label class="form-label">Mobile Number</label>
          <div class="phone-input-wrap">
            <span class="country-code">🇮🇳 +91</span>
            <input
              type="tel"
              class="form-input phone-input"
              placeholder="98765 43210"
              [(ngModel)]="phoneNumber"
              maxlength="10"
              inputmode="numeric"
              (keyup.enter)="checkPhone()"
              (input)="onPhoneInput($event)"
              id="phone-input"
              autofocus>
          </div>
          <div class="error-msg mt-2" *ngIf="errorMsg()">
            <span class="material-symbols-outlined">error</span>
            <span>{{ errorMsg() }}</span>
          </div>
        </div>

        <button class="btn-primary mt-4" (click)="checkPhone()" [disabled]="isLoading() || phoneNumber.length !== 10">
          <span *ngIf="!isLoading()">Continue</span>
          <span class="btn-spinner" *ngIf="isLoading()"></span>
        </button>

        <p class="terms-text">
          By continuing, you agree to our <span class="link-text">Terms of Wholesale Access</span>
        </p>
      </div>

      <!-- ═══════════════════════════════════ -->
      <!-- Screen 2A: Existing User — PIN     -->
      <!-- ═══════════════════════════════════ -->
      <div class="auth-card muted-bg" *ngIf="screen() === 'login-pin'">
        <div class="bg-placeholder">
          <div class="brand-logo large-logo">
            <img src="assets/images/card1.png" alt="Logo" class="brand-img">
          </div>
          <h3>Secure Member Login</h3>
          <p>Enter your PIN to access the wholesale store</p>
        </div>

        <div class="reg-bottom-sheet open">
          <div class="sheet-handle"></div>

          <div class="sheet-header">
            <div class="sheet-top-row">
              <div>
                <div class="header-badge">
                  <span class="material-symbols-outlined badge-icon">lock</span>
                  <span>SECURE LOGIN</span>
                </div>
                <h2 class="auth-title mt-1">Welcome Back</h2>
              </div>
              <button class="btn-close-clean" (click)="goBack()" title="Back">
                <span class="material-symbols-outlined">arrow_back</span>
              </button>
            </div>
            <div class="phone-chip mt-2">
              <span class="material-symbols-outlined icon-xs">phone_iphone</span>
              <span>+91 {{ phoneNumber }}</span>
              <button class="change-link" (click)="goBack()">Change</button>
            </div>
            <p class="auth-subtitle mt-1">Enter your 6-digit security PIN to unlock store</p>
          </div>

          <div class="pin-boxes mt-3" (keydown)="onPinKeydown($event, 'login')">
            <input *ngFor="let i of [0,1,2,3,4,5]"
              type="password" class="pin-box" [class.filled]="loginPinDigits[i] !== ''"
              maxlength="1" inputmode="numeric" [id]="'login-pin-' + i"
              [(ngModel)]="loginPinDigits[i]"
              (input)="onPinInput($event, i, 'login')"
              (keydown.backspace)="onPinBackspace($event, i, 'login')">
          </div>

          <div class="error-msg mt-2" *ngIf="errorMsg()">
            <span class="material-symbols-outlined">error</span>
            <span>{{ errorMsg() }}</span>
          </div>

          <button class="btn-primary mt-4" (click)="loginUser()" [disabled]="isLoading() || loginPinDigits.join('').length !== 6">
            <span *ngIf="!isLoading()">Login to Store</span>
            <span class="btn-spinner" *ngIf="isLoading()"></span>
          </button>

          <button class="link-btn mt-3" (click)="screen.set('forgot-pin')">Forgot PIN?</button>
        </div>
      </div>

      <!-- ═══════════════════════════════════ -->
      <!-- Screen 2B: New User — Bottom Sheet  -->
      <!-- ═══════════════════════════════════ -->
      <div class="auth-card muted-bg" *ngIf="screen() === 'register'">
        <div class="bg-placeholder">
          <div class="brand-logo large-logo">
            <img src="assets/images/card1.png" alt="Logo" class="brand-img">
          </div>
          <h3>Application in Progress...</h3>
          <p>Please complete the registration form below</p>
        </div>

        <div class="reg-bottom-sheet open">
          <div class="sheet-handle"></div>
          
          <div class="sheet-header">
            <div class="sheet-top-row">
              <div>
                <div class="header-badge">
                  <span class="material-symbols-outlined badge-icon">badge</span>
                  <span>NEW MEMBER APPLICATION</span>
                </div>
                <h2 class="auth-title mt-1">Create Account</h2>
              </div>
              <button class="btn-close-clean" (click)="goBack()" title="Close">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>
            <div class="phone-chip mt-2">
              <span class="material-symbols-outlined icon-xs">phone_iphone</span>
              <span>+91 {{ phoneNumber }}</span>
              <button class="change-link" (click)="goBack()">Change</button>
            </div>
          </div>

          <div class="form-group mt-3">
            <label class="form-label">Your Full Name / Business Name</label>
            <div class="input-with-icon">
              <span class="material-symbols-outlined icon">storefront</span>
              <input type="text" class="form-input with-icon" placeholder="e.g. Sharma Wedding Cards / Rahul Kumar"
                     [(ngModel)]="registerName" id="reg-name">
            </div>
          </div>

          <div class="form-group mt-3">
            <label class="form-label">Set 6-Digit Security PIN</label>
            <div class="pin-boxes">
              <input *ngFor="let i of [0,1,2,3,4,5]"
                type="password"
                class="pin-box"
                [class.filled]="registerPinDigits[i] !== ''"
                maxlength="1"
                inputmode="numeric"
                [id]="'reg-pin-' + i"
                [(ngModel)]="registerPinDigits[i]"
                (input)="onPinInput($event, i, 'register')"
                (keydown.backspace)="onPinBackspace($event, i, 'register')">
            </div>
          </div>

          <div class="form-group mt-3">
            <label class="form-label">Confirm 6-Digit PIN</label>
            <div class="pin-boxes">
              <input *ngFor="let i of [0,1,2,3,4,5]"
                type="password"
                class="pin-box"
                [class.filled]="confirmPinDigits[i] !== ''"
                maxlength="1"
                inputmode="numeric"
                [id]="'conf-pin-' + i"
                [(ngModel)]="confirmPinDigits[i]"
                (input)="onPinInput($event, i, 'confirm')"
                (keydown.backspace)="onPinBackspace($event, i, 'confirm')">
            </div>
          </div>

          <div class="error-msg mt-2" *ngIf="errorMsg()">
            <span class="material-symbols-outlined">error</span>
            <span>{{ errorMsg() }}</span>
          </div>

          <button class="btn-primary mt-4" (click)="registerUser()"
                  [disabled]="isLoading() || !registerName.trim() || registerPinDigits.join('').length !== 6 || confirmPinDigits.join('').length !== 6">
            <span *ngIf="!isLoading()">Submit Application</span>
            <span class="btn-spinner" *ngIf="isLoading()"></span>
          </button>
        </div>
      </div>

      <!-- ═══════════════════════════════════ -->
      <!-- Screen 3: Forgot PIN               -->
      <!-- ═══════════════════════════════════ -->
      <div class="auth-card muted-bg" *ngIf="screen() === 'forgot-pin'">
        <div class="bg-placeholder">
          <div class="brand-logo large-logo">
            <img src="assets/images/card1.png" alt="Logo" class="brand-img">
          </div>
          <h3>Security Recovery</h3>
          <p>Reset your 6-digit wholesale access PIN</p>
        </div>

        <div class="reg-bottom-sheet open">
          <div class="sheet-handle"></div>

          <div class="sheet-header">
            <div class="sheet-top-row">
              <div>
                <div class="header-badge">
                  <span class="material-symbols-outlined badge-icon">lock_reset</span>
                  <span>SECURITY RECOVERY</span>
                </div>
                <h2 class="auth-title mt-1">Reset Security PIN</h2>
              </div>
              <button class="btn-close-clean" (click)="screen.set('login-pin')" title="Back">
                <span class="material-symbols-outlined">arrow_back</span>
              </button>
            </div>
            <div class="phone-chip mt-2">
              <span class="material-symbols-outlined icon-xs">phone_iphone</span>
              <span>+91 {{ phoneNumber }}</span>
            </div>
            <p class="auth-subtitle mt-1">Set a new 6-digit PIN for your account</p>
          </div>

          <div class="form-group mt-3">
            <label class="form-label">New PIN</label>
            <div class="pin-boxes">
              <input *ngFor="let i of [0,1,2,3,4,5]"
                type="password" class="pin-box" [class.filled]="newPinDigits[i] !== ''"
                maxlength="1" inputmode="numeric" [id]="'new-pin-' + i"
                [(ngModel)]="newPinDigits[i]"
                (input)="onPinInput($event, i, 'new')"
                (keydown.backspace)="onPinBackspace($event, i, 'new')">
            </div>
          </div>

          <div class="form-group mt-3">
            <label class="form-label">Confirm New PIN</label>
            <div class="pin-boxes">
              <input *ngFor="let i of [0,1,2,3,4,5]"
                type="password" class="pin-box" [class.filled]="newConfirmPinDigits[i] !== ''"
                maxlength="1" inputmode="numeric" [id]="'new-conf-pin-' + i"
                [(ngModel)]="newConfirmPinDigits[i]"
                (input)="onPinInput($event, i, 'new-confirm')"
                (keydown.backspace)="onPinBackspace($event, i, 'new-confirm')">
            </div>
          </div>

          <div class="error-msg mt-2" *ngIf="errorMsg()">
            <span class="material-symbols-outlined">error</span>
            <span>{{ errorMsg() }}</span>
          </div>

          <button class="btn-primary mt-4" (click)="resetPin()"
                  [disabled]="isLoading() || newPinDigits.join('').length !== 6 || newConfirmPinDigits.join('').length !== 6">
            <span *ngIf="!isLoading()">Reset PIN</span>
            <span class="btn-spinner" *ngIf="isLoading()"></span>
          </button>
        </div>
      </div>

      <!-- ═══════════════════════════════════ -->
      <!-- Screen 4: Waiting for Approval    -->
      <!-- ═══════════════════════════════════ -->
      <div class="auth-card approval-card" *ngIf="screen() === 'waiting-approval'">

        <!-- Top Illustration -->
        <div class="approval-hero">
          <div class="approval-rings">
            <div class="ring ring-3"></div>
            <div class="ring ring-2"></div>
            <div class="ring ring-1"></div>
          </div>
          <div class="status-shield">
            <span class="material-symbols-outlined">shield_person</span>
          </div>
        </div>

        <!-- Status Badge -->
        <div class="status-tag mt-3">
          <span class="status-dot"></span>
          <span>VERIFICATION IN PROGRESS</span>
        </div>

        <h2 class="auth-title mt-2 text-center">You're Almost In!</h2>
        <p class="auth-subtitle text-center mt-1">
          Hi <strong class="text-main">{{ authService.currentUserProfile()?.name || 'Member' }}</strong>, your application for
          <strong class="text-main">+91&nbsp;{{ authService.currentUserProfile()?.phone || phoneNumber }}</strong> is under review.
        </p>

        <!-- 3-Step Progress -->
        <div class="approval-steps mt-4">
          <div class="step-row">
            <div class="step-icon-done">
              <span class="material-symbols-outlined">check_circle</span>
            </div>
            <div class="step-body">
              <span class="step-title">Registration Submitted</span>
              <span class="step-desc">Your details have been received</span>
            </div>
          </div>
          <div class="step-connector active"></div>
          <div class="step-row">
            <div class="step-icon-active">
              <span class="material-symbols-outlined">manage_accounts</span>
            </div>
            <div class="step-body">
              <span class="step-title">Admin Verification</span>
              <span class="step-desc">Our team is reviewing your account</span>
            </div>
          </div>
          <div class="step-connector"></div>
          <div class="step-row muted">
            <div class="step-icon-pending">
              <span class="material-symbols-outlined">storefront</span>
            </div>
            <div class="step-body">
              <span class="step-title">Wholesale Access Granted</span>
              <span class="step-desc">Start browsing the full catalogue</span>
            </div>
          </div>
        </div>

        <!-- Info Note -->
        <div class="approval-note mt-3">
          <span class="material-symbols-outlined">schedule</span>
          <span>Approval usually takes <strong>within 24 hours</strong>. You'll be notified by your admin.</span>
        </div>

        <div class="error-msg text-center justify-center mt-3" *ngIf="errorMsg()">
          <span class="material-symbols-outlined">info</span>
          <span>{{ errorMsg() }}</span>
        </div>

        <button class="btn-primary mt-4" (click)="refreshApprovalStatus()" [disabled]="isLoading()">
          <span *ngIf="!isLoading()" class="flex-align">
            <span class="material-symbols-outlined mr-1">refresh</span>
            <span>Check Approval Status</span>
          </span>
          <span class="btn-spinner" *ngIf="isLoading()"></span>
        </button>

        <a class="call-admin-btn mt-3" href="tel:+918461909143">
          <span class="material-symbols-outlined">call</span>
          <span>Call Admin — +91 84619 09143</span>
        </a>

        <button class="link-btn mt-2" (click)="logoutFromWaiting()">Sign out / Use another account</button>
      </div>

    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 100%;
      width: 100%;
      background: var(--surface);
    }
    .auth-page {
      min-height: 100%;
      width: 100%;
      background: var(--surface);
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 0;
      margin: 0;
      flex: 1;
    }

    /* ─── Brand Header ──────────────────────── */
    .auth-brand {
      width: 100%;
      background: linear-gradient(135deg, #3a0000 0%, #7a0000 50%, #5a0000 100%);
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      padding: 32px var(--space-base) 44px;
      position: relative;
      z-index: 1;
      margin-bottom: -28px;
    }
    .brand-inner {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .brand-tagline {
      font-size: 0.72rem;
      color: rgba(255,255,255,0.55);
      margin: 8px 0 0;
      font-weight: 500;
      letter-spacing: 0.2px;
    }
    .brand-logo {
      width: 60px;
      height: 60px;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(0,0,0,0.35);
      flex-shrink: 0;
      border: 2px solid rgba(212,175,55,0.7);
    }
    .brand-img { width: 100%; height: 100%; object-fit: cover; }
    .brand-text {
      h1 {
        margin: 0;
        font-size: 1.35rem;
        font-weight: 800;
        color: white;
        letter-spacing: -0.3px;
      }
      span {
        font-size: 0.68rem;
        color: #D4AF37;
        font-weight: 700;
        letter-spacing: 1.4px;
        text-transform: uppercase;
      }
    }

    /* ─── Auth Card ─────────────────────────── */
    .auth-card {
      background: var(--surface);
      border-radius: 28px 28px 0 0;
      width: 100%;
      flex: 1;
      padding: 28px var(--space-base) 2.5rem;
      position: relative;
      z-index: 2;
      box-shadow: 0 -4px 20px rgba(0,0,0,0.12);
      display: flex;
      flex-direction: column;

      &.muted-bg {
        background: #f4f2f0;
        overflow: hidden;
      }
    }

    /* ─── Benefits Section ──────────────────── */
    .benefits-section { width: 100%; }
    .benefits-divider {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .divider-line {
      flex: 1;
      height: 1px;
      background: #E2E8F0;
    }
    .divider-text {
      font-size: 0.68rem;
      font-weight: 700;
      color: #94A3B8;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .benefit-card {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px 14px;
      background: #F8FAFC;
      border: 1px solid #F1F5F9;
      border-radius: 14px;
      margin-top: 10px;
      transition: background 0.15s;
      &:hover { background: #F1F5F9; }
    }
    .benefit-icon {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      .material-symbols-outlined { font-size: 1.25rem; }
      &.maroon { background: #FFF5F5; .material-symbols-outlined { color: #8B0000; } }
      &.gold   { background: #FFFDF0; .material-symbols-outlined { color: #B8860B; } }
      &.green  { background: #F0FDF4; .material-symbols-outlined { color: #16A34A; } }
    }
    .benefit-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      .benefit-title { font-size: 0.85rem; font-weight: 700; color: #1E293B; }
      .benefit-desc  { font-size: 0.75rem; color: #64748B; line-height: 1.3; }
    }

    .card-header-row {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      margin-bottom: 8px;
    }

    .back-btn-clean, .btn-close-clean {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #f1f5f9;
      border: none;
      color: #334155;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
      &:hover { background: #e2e8f0; color: #0f172a; }
      &:active { transform: scale(0.92); }
      .material-symbols-outlined { font-size: 1.2rem; }
    }

    .vip-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #FFFDF0;
      color: #8A6D14;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 6px 14px;
      border-radius: 999px;
      border: 1px solid #E6C875;
      box-shadow: 0 2px 6px rgba(212, 175, 55, 0.12);
      width: fit-content;
      letter-spacing: 0.3px;
      
      .icon-small { font-size: 1rem; color: #D4AF37; }
    }

    .header-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      color: #475569;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 5px 12px;
      border-radius: 999px;
      letter-spacing: 0.6px;
      
      .badge-icon { font-size: 0.95rem; color: var(--primary); }
    }

    /* ─── Typography ────────────────────────── */
    .header-section {
      display: flex;
      flex-direction: column;
    }
    .auth-title {
      font-size: 1.3rem;
      font-weight: 800;
      color: var(--text-main);
      margin: 0;
      letter-spacing: -0.3px;
      line-height: 1.25;
    }
    .auth-subtitle {
      font-size: 0.85rem;
      color: var(--text-muted);
      margin: 0;
      line-height: 1.45;
      font-weight: 400;
    }
    .text-center { text-align: center; }
    .justify-center { justify-content: center; }
    .text-main { color: var(--text-main); }
    
    .phone-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #F1F5F9;
      color: #1E293B;
      font-size: 0.85rem;
      font-weight: 600;
      padding: 6px 12px;
      border-radius: 999px;
      width: fit-content;
      border: 1px solid #E2E8F0;
      
      .icon-xs { font-size: 1rem; color: var(--primary); }
    }
    .change-link {
      background: none;
      border: none;
      color: var(--primary);
      font-size: 0.78rem;
      font-weight: 700;
      text-decoration: underline;
      cursor: pointer;
      padding: 0;
      margin-left: 4px;
      &:hover { color: #600000; }
    }

    /* ─── Phone Input ───────────────────────── */
    .phone-input-wrap {
      display: flex;
      align-items: center;
      border: 1.5px solid #CBD5E1;
      border-radius: 16px;
      overflow: hidden;
      transition: all 0.2s ease;
      background: #FFFFFF;
      box-shadow: 0 2px 8px rgba(0,0,0,0.02);
      height: 54px;
      &:focus-within {
        border-color: var(--primary);
        box-shadow: 0 0 0 3px rgba(139, 0, 0, 0.08);
      }
    }
    .country-code {
      padding: 0 16px;
      font-size: 0.95rem;
      font-weight: 700;
      color: #1E293B;
      border-right: 1.5px solid #E2E8F0;
      height: 100%;
      display: flex;
      align-items: center;
      background: #F8FAFC;
      white-space: nowrap;
    }
    .phone-input {
      flex: 1;
      border: none !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      font-size: 1.1rem;
      font-weight: 700;
      letter-spacing: 1px;
      color: #0F172A;
      padding: 0 16px;
      height: 100%;
      background: #FFFFFF !important;
      &:focus-within { box-shadow: none !important; }
      &::placeholder { color: #94A3B8; font-weight: 500; letter-spacing: 0.5px; }
    }

    /* ─── Generic Input ─────────────────────── */
    .form-input {
      width: 100%;
      border: 1.5px solid #CBD5E1;
      border-radius: 16px;
      padding: 0 16px;
      height: 52px;
      font-size: 0.95rem;
      font-family: inherit;
      color: var(--text-main);
      background: white;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
      box-sizing: border-box;
      &:focus {
        border-color: var(--primary);
        box-shadow: 0 0 0 3px rgba(139,0,0,0.08);
      }
      &::placeholder { color: #94A3B8; }
    }

    .input-with-icon {
      position: relative;
      display: flex;
      align-items: center;
      
      .icon {
        position: absolute;
        left: 14px;
        color: #64748B;
        font-size: 1.25rem;
      }
      .with-icon {
        padding-left: 44px;
      }
    }

    /* ─── PIN Boxes (Clean & Premium) ───────── */
    .pin-boxes {
      display: flex;
      gap: 8px;
      justify-content: flex-start;
    }
    .pin-box {
      width: 44px;
      height: 50px;
      border: 1.5px solid #CBD5E1;
      border-radius: 12px;
      text-align: center;
      font-size: 1.25rem;
      font-weight: 700;
      font-family: inherit;
      color: #1E293B;
      background: #FFFFFF;
      outline: none;
      transition: all 0.2s ease;
      -webkit-text-security: disc;
      &:focus {
        border-color: var(--primary);
        box-shadow: 0 0 0 3px rgba(139, 0, 0, 0.1);
      }
      &.filled {
        border-color: var(--primary);
        background: #FFFDF0;
        color: var(--primary);
      }
    }

    /* ─── Registration Bottom Sheet UI ──────── */
    .bg-placeholder {
      text-align: center;
      padding: 2rem 1rem;
      opacity: 0.4;
      
      .large-logo {
        width: 64px;
        height: 64px;
        margin: 0 auto 1rem;
      }
      h3 { margin: 0; font-size: 1.1rem; color: var(--text-main); }
      p { margin: 4px 0 0; font-size: 0.85rem; }
    }

    .reg-bottom-sheet {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      background: white;
      border-radius: 28px 28px 0 0;
      padding: 16px var(--space-base) 2.5rem;
      box-shadow: 0 -10px 40px rgba(0,0,0,0.15);
      animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 10;
    }
    @keyframes slideUp {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }
    .sheet-handle {
      width: 40px;
      height: 5px;
      background: #E2E8F0;
      border-radius: 999px;
      margin: 0 auto 16px;
    }
    .sheet-header {
      border-bottom: 1px solid #F1F5F9;
      padding-bottom: 14px;
    }
    .sheet-top-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
    }

    /* ─── Approval Screen UI ────────────────── */
    .approval-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding-top: 1.5rem;
    }

    /* Animated Rings */
    .approval-hero {
      position: relative;
      width: 96px;
      height: 96px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .approval-rings {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .ring {
      position: absolute;
      border-radius: 50%;
      border: 1.5px solid rgba(212,175,55,0.35);
      animation: ringPulse 2.5s infinite ease-out;
    }
    .ring-1 { width: 68px; height: 68px; animation-delay: 0s; }
    .ring-2 { width: 82px; height: 82px; animation-delay: 0.5s; }
    .ring-3 { width: 96px; height: 96px; animation-delay: 1s; }
    @keyframes ringPulse {
      0% { opacity: 0.8; transform: scale(0.95); }
      100% { opacity: 0; transform: scale(1.1); }
    }
    .status-shield {
      position: relative;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #D4AF37, #B8860B);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 6px 20px rgba(212,175,55,0.4);
      z-index: 2;
      .material-symbols-outlined { font-size: 2rem; }
    }

    /* 3-Step Progress Tracker */
    .approval-steps {
      width: 100%;
      background: #F8FAFC;
      border: 1px solid #E8EDF3;
      border-radius: 16px;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 0;
    }
    .step-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 4px 0;
      &.muted { opacity: 0.4; }
    }
    .step-icon-done {
      width: 34px; height: 34px; border-radius: 50%;
      background: #ECFDF5; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      .material-symbols-outlined { font-size: 1.1rem; color: #16A34A; }
    }
    .step-icon-active {
      width: 34px; height: 34px; border-radius: 50%;
      background: #FFFDF0; border: 2px solid #D4AF37; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      .material-symbols-outlined { font-size: 1.1rem; color: #D4AF37; }
    }
    .step-icon-pending {
      width: 34px; height: 34px; border-radius: 50%;
      background: #F1F5F9; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      .material-symbols-outlined { font-size: 1.1rem; color: #94A3B8; }
    }
    .step-body {
      display: flex; flex-direction: column; gap: 1px;
      .step-title { font-size: 0.82rem; font-weight: 700; color: #1E293B; }
      .step-desc { font-size: 0.72rem; color: #64748B; }
    }
    .step-connector {
      width: 2px; height: 16px;
      background: #E2E8F0; margin-left: 16px; border-radius: 999px;
      &.active { background: linear-gradient(to bottom, #16A34A, #D4AF37); }
    }

    /* Approval Note */
    .approval-note {
      width: 100%;
      display: flex;
      align-items: flex-start;
      gap: 8px;
      background: #FFFDF0;
      border: 1px solid #E6C875;
      border-radius: 12px;
      padding: 10px 14px;
      font-size: 0.78rem;
      color: #6B4F00;
      line-height: 1.4;
      .material-symbols-outlined { font-size: 1rem; color: #D4AF37; margin-top: 1px; flex-shrink: 0; }
      strong { color: #4A3500; }
    }
    .status-tag {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #FFFDF0;
      color: #8A6D14;
      font-size: 0.78rem;
      font-weight: 700;
      padding: 6px 14px;
      border-radius: 999px;
      border: 1px solid #E6C875;
      letter-spacing: 0.5px;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #D4AF37;
      box-shadow: 0 0 8px #D4AF37;
    }
    .info-box {
      width: 100%;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 16px;
      padding: 16px;
      display: flex;
      gap: 12px;
      align-items: flex-start;

      .info-icon {
        color: var(--primary);
        .material-symbols-outlined { font-size: 1.5rem; }
      }
      .info-text {
        flex: 1;
        strong { font-size: 0.88rem; color: var(--text-main); display: block; margin-bottom: 4px; }
        p { margin: 0; font-size: 0.82rem; color: #475569; line-height: 1.45; }
      }
    }

    /* ─── Buttons ───────────────────────────── */
    .btn-primary {
      width: 100%;
      height: 54px;
      background: linear-gradient(135deg, #8B0000 0%, #600000 100%);
      color: white;
      border: none;
      border-radius: 16px;
      font-size: 1.02rem;
      font-weight: 700;
      letter-spacing: 0.4px;
      cursor: pointer;
      font-family: inherit;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      box-shadow: 0 6px 20px rgba(139, 0, 0, 0.22);
      &:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 8px 24px rgba(139, 0, 0, 0.3);
      }
      &:active:not(:disabled) { transform: scale(0.98); }
      &:disabled {
        background: #E2E8F0 !important;
        color: #94A3B8 !important;
        cursor: not-allowed;
        box-shadow: none !important;
      }
    }
    .btn-spinner {
      width: 20px;
      height: 20px;
      border: 2.5px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .link-btn {
      background: none;
      border: none;
      color: #64748B;
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
      display: block;
      margin: 0 auto;
      padding: 8px 12px;
      transition: color 0.15s ease;
      &:hover { color: var(--text-main); }
    }

    /* ─── Error ─────────────────────────────── */
    .error-msg {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #DC2626;
      font-size: 0.82rem;
      font-weight: 500;
      .material-symbols-outlined { font-size: 1.1rem; }
    }

    /* ─── Call Admin Button ──────────────────── */
    .call-admin-btn {
      width: 100%;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: #F0FDF4;
      border: 1.5px solid #86EFAC;
      border-radius: 14px;
      color: #16A34A;
      font-size: 0.9rem;
      font-weight: 700;
      text-decoration: none;
      font-family: inherit;
      cursor: pointer;
      transition: all 0.2s ease;
      letter-spacing: 0.2px;
      .material-symbols-outlined { font-size: 1.15rem; }
      &:hover { background: #DCFCE7; border-color: #4ADE80; }
      &:active { transform: scale(0.98); }
    }

    /* ─── Form ──────────────────────────────── */
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-label {
      font-size: 0.75rem;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* ─── Misc ──────────────────────────────── */
    .terms-text {
      text-align: center;
      font-size: 0.78rem;
      color: #64748B;
      margin-top: auto;
      padding-top: 2rem;
      padding-bottom: 0.5rem;
      line-height: 1.5;
    }
    .link-text { color: var(--primary); font-weight: 600; cursor: pointer; }
    .flex-align { display: flex; align-items: center; justify-content: center; }
    .mr-1 { margin-right: 6px; }
    .mb-1 { margin-bottom: 0.25rem; }
    .mb-2 { margin-bottom: 0.5rem; }
    .mt-1 { margin-top: 0.25rem; }
    .mt-2 { margin-top: 0.5rem; }
    .mt-3 { margin-top: 1rem; }
    .mt-4 { margin-top: 1.5rem; }
  `]
})
export class UserAuthComponent implements OnInit {
  authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

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
