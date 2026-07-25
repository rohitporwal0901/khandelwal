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
        <div class="brand-logo">
          <img src="assets/images/card1.png" alt="Logo" class="brand-img">
        </div>
        <div class="brand-text">
          <h1>Khandelwal Cards</h1>
          <span>Exclusive Member Access</span>
        </div>
      </div>

      <!-- ═══════════════════════════════════ -->
      <!-- Screen 1: Phone Number             -->
      <!-- ═══════════════════════════════════ -->
      <div class="auth-card" *ngIf="screen() === 'phone'">
        <div class="vip-badge">
          <span class="material-symbols-outlined icon-small">verified_user</span>
          <span>Verified Wholesale Portal</span>
        </div>
        
        <h2 class="auth-title mt-2">Welcome to Khandelwal</h2>
        <p class="auth-subtitle">Enter your mobile number to sign in or apply for exclusive member access.</p>

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
          <div class="error-msg" *ngIf="errorMsg()">
            <span class="material-symbols-outlined">error</span>
            {{ errorMsg() }}
          </div>
        </div>

        <button class="btn-primary" (click)="checkPhone()" [disabled]="isLoading() || phoneNumber.length !== 10">
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
      <div class="auth-card" *ngIf="screen() === 'login-pin'">
        <button class="back-btn" (click)="goBack()">
          <span class="material-symbols-outlined">arrow_back</span>
        </button>
        <div class="user-greeting">
          <span class="greeting-icon">👋</span>
          <div>
            <h2 class="auth-title">Welcome back!</h2>
            <p class="phone-display">+91 {{ phoneNumber }}</p>
          </div>
        </div>

        <p class="auth-subtitle mt-3">Enter your 6-digit security PIN to unlock store</p>

        <div class="pin-boxes mt-3" (keydown)="onPinKeydown($event, 'login')">
          <input *ngFor="let i of [0,1,2,3,4,5]"
            type="password"
            class="pin-box"
            [class.filled]="loginPinDigits[i] !== ''"
            maxlength="1"
            inputmode="numeric"
            [id]="'login-pin-' + i"
            [(ngModel)]="loginPinDigits[i]"
            (input)="onPinInput($event, i, 'login')"
            (keydown.backspace)="onPinBackspace($event, i, 'login')">
        </div>

        <div class="error-msg" *ngIf="errorMsg()">
          <span class="material-symbols-outlined">error</span>
          {{ errorMsg() }}
        </div>

        <button class="btn-primary mt-4" (click)="loginUser()" [disabled]="isLoading() || loginPinDigits.join('').length !== 6">
          <span *ngIf="!isLoading()">Login to Store</span>
          <span class="btn-spinner" *ngIf="isLoading()"></span>
        </button>

        <button class="link-btn mt-3" (click)="screen.set('forgot-pin')">Forgot PIN?</button>
      </div>

      <!-- ═══════════════════════════════════ -->
      <!-- Screen 2B: New User — Bottom Sheet  -->
      <!-- ═══════════════════════════════════ -->
      <div class="auth-card muted-bg" *ngIf="screen() === 'register'">
        <!-- Background decorative view while bottom sheet is active -->
        <div class="bg-placeholder">
          <div class="brand-logo large-logo">
            <img src="assets/images/card1.png" alt="Logo" class="brand-img">
          </div>
          <h3>Application in Progress...</h3>
          <p>Please complete the registration form below</p>
        </div>

        <!-- Sleek Bottom Sheet for Registration -->
        <div class="reg-bottom-sheet open">
          <div class="sheet-handle"></div>
          
          <div class="sheet-header">
            <div class="sheet-top-row">
              <div>
                <div class="header-badge">🎉 New Member Application</div>
                <h2 class="auth-title mt-1">Create Account</h2>
              </div>
              <button class="btn-close-rapido" (click)="goBack()" title="Close">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>
            <div class="phone-change-wrap">
              <span class="phone-display">+91 {{ phoneNumber }}</span>
              <button class="change-link" (click)="goBack()">Change</button>
            </div>
          </div>

          <div class="form-group mt-2">
            <label class="form-label">Your Full Name / Business Name</label>
            <div class="input-with-icon">
              <span class="material-symbols-outlined icon">storefront</span>
              <input type="text" class="form-input with-icon" placeholder="e.g. Sharma Wedding Cards / Rahul Kumar"
                     [(ngModel)]="registerName" id="reg-name">
            </div>
          </div>

          <div class="form-group mt-2">
            <label class="form-label">Set 6-digit Security PIN</label>
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

          <div class="form-group mt-2">
            <label class="form-label">Confirm 6-digit PIN</label>
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

          <div class="error-msg" *ngIf="errorMsg()">
            <span class="material-symbols-outlined">error</span>
            {{ errorMsg() }}
          </div>

          <button class="btn-primary btn-gradient mt-4" (click)="registerUser()"
                  [disabled]="isLoading() || !registerName.trim() || registerPinDigits.join('').length !== 6 || confirmPinDigits.join('').length !== 6">
            <span *ngIf="!isLoading()">Submit Application 🚀</span>
            <span class="btn-spinner" *ngIf="isLoading()"></span>
          </button>
        </div>
      </div>

      <!-- ═══════════════════════════════════ -->
      <!-- Screen 3: Forgot PIN               -->
      <!-- ═══════════════════════════════════ -->
      <div class="auth-card" *ngIf="screen() === 'forgot-pin'">
        <button class="back-btn" (click)="screen.set('login-pin')">
          <span class="material-symbols-outlined">arrow_back</span>
        </button>
        <div class="user-greeting">
          <span class="greeting-icon">🔑</span>
          <div>
            <h2 class="auth-title">Reset PIN</h2>
            <p class="phone-display">+91 {{ phoneNumber }}</p>
          </div>
        </div>
        <p class="auth-subtitle mt-2">Set a new 6-digit PIN for your account</p>

        <div class="form-group mt-2">
          <label class="form-label">New PIN</label>
          <div class="pin-boxes">
            <input *ngFor="let i of [0,1,2,3,4,5]"
              type="password"
              class="pin-box"
              [class.filled]="newPinDigits[i] !== ''"
              maxlength="1"
              inputmode="numeric"
              [id]="'new-pin-' + i"
              [(ngModel)]="newPinDigits[i]"
              (input)="onPinInput($event, i, 'new')"
              (keydown.backspace)="onPinBackspace($event, i, 'new')">
          </div>
        </div>

        <div class="form-group mt-2">
          <label class="form-label">Confirm New PIN</label>
          <div class="pin-boxes">
            <input *ngFor="let i of [0,1,2,3,4,5]"
              type="password"
              class="pin-box"
              [class.filled]="newConfirmPinDigits[i] !== ''"
              maxlength="1"
              inputmode="numeric"
              [id]="'new-conf-pin-' + i"
              [(ngModel)]="newConfirmPinDigits[i]"
              (input)="onPinInput($event, i, 'new-confirm')"
              (keydown.backspace)="onPinBackspace($event, i, 'new-confirm')">
          </div>
        </div>

        <div class="error-msg" *ngIf="errorMsg()">
          <span class="material-symbols-outlined">error</span>
          {{ errorMsg() }}
        </div>

        <button class="btn-primary mt-4" (click)="resetPin()"
                [disabled]="isLoading() || newPinDigits.join('').length !== 6 || newConfirmPinDigits.join('').length !== 6">
          <span *ngIf="!isLoading()">Reset PIN</span>
          <span class="btn-spinner" *ngIf="isLoading()"></span>
        </button>
      </div>

      <!-- ═══════════════════════════════════ -->
      <!-- Screen 4: Waiting for Approval    -->
      <!-- ═══════════════════════════════════ -->
      <div class="auth-card approval-card" *ngIf="screen() === 'waiting-approval'">
        <div class="status-icon-wrap">
          <div class="status-pulse"></div>
          <div class="status-shield">
            <span class="material-symbols-outlined">shield_person</span>
          </div>
        </div>

        <div class="status-tag mt-3">
          <span class="status-dot"></span> Verification Pending
        </div>

        <h2 class="auth-title mt-2 text-center">Application Under Review</h2>
        <p class="auth-subtitle text-center">
          Hello <strong>{{ authService.currentUserProfile()?.name || 'Member' }}</strong>! We have received your registration for <strong>+91 {{ authService.currentUserProfile()?.phone || phoneNumber }}</strong>.
        </p>

        <div class="info-box mt-4">
          <div class="info-icon">
            <span class="material-symbols-outlined">admin_panel_settings</span>
          </div>
          <div class="info-text">
            <strong>Why is approval required?</strong>
            <p>To maintain our exclusive wholesale pricing and catalogue privacy, Khandelwal Cards Admin verifies all new member accounts before granting access.</p>
          </div>
        </div>

        <div class="error-msg text-center justify-center mt-3" *ngIf="errorMsg()">
          <span class="material-symbols-outlined">info</span> {{ errorMsg() }}
        </div>

        <button class="btn-primary mt-4" (click)="refreshApprovalStatus()" [disabled]="isLoading()">
          <span *ngIf="!isLoading()" class="flex-align">
            <span class="material-symbols-outlined mr-1">refresh</span> Check Approval Status
          </span>
          <span class="btn-spinner" *ngIf="isLoading()"></span>
        </button>

        <button class="link-btn mt-3" (click)="logoutFromWaiting()">Sign out / Use another account</button>
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
      align-items: center;
      gap: 14px;
      padding: 24px var(--space-base) 28px;
      margin-bottom: -24px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      position: relative;
      z-index: 1;
    }
    .brand-logo {
      width: 46px;
      height: 46px;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 4px 14px rgba(0,0,0,0.3);
      flex-shrink: 0;
      border: 2px solid rgba(212,175,55,0.6);
    }
    .brand-img { width: 100%; height: 100%; object-fit: cover; }
    .brand-text {
      h1 {
        margin: 0;
        font-size: 1.2rem;
        font-weight: 800;
        color: white;
        letter-spacing: -0.2px;
      }
      span {
        font-size: 0.68rem;
        color: #D4AF37;
        font-weight: 700;
        letter-spacing: 1.2px;
        text-transform: uppercase;
      }
    }

    /* ─── Auth Card ─────────────────────────── */
    .auth-card {
      background: var(--surface);
      border-radius: 28px 28px 0 0;
      width: 100%;
      flex: 1;
      padding: 32px var(--space-base) 2rem;
      position: relative;
      z-index: 2;
      box-shadow: 0 -8px 30px rgba(0,0,0,0.12);
      display: flex;
      flex-direction: column;
      
      &.muted-bg {
        background: #f4f2f0;
        overflow: hidden;
      }
    }

    .vip-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: linear-gradient(135deg, #FFF9E6 0%, #FFF2CC 100%);
      color: #8A6D14;
      font-size: 0.78rem;
      font-weight: 700;
      padding: 6px 14px;
      border-radius: 999px;
      border: 1px solid #E6C875;
      box-shadow: 0 2px 8px rgba(212, 175, 55, 0.15);
      width: fit-content;
      
      .icon-small { font-size: 1.05rem; color: #D4AF37; }
    }

    .back-btn {
      position: absolute;
      top: 20px;
      left: var(--space-base);
      background: none;
      border: none;
      cursor: pointer;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      padding: 6px;
      border-radius: 8px;
      transition: background 0.2s;
      &:hover { background: rgba(0,0,0,0.05); }
      .material-symbols-outlined { font-size: 1.3rem; }
    }

    /* ─── Typography ────────────────────────── */
    .auth-title {
      font-size: 1.35rem;
      font-weight: 800;
      color: var(--text-main);
      margin: 0 0 4px;
    }
    .auth-subtitle {
      font-size: 0.88rem;
      color: var(--text-muted);
      margin: 0;
      line-height: 1.4;
    }
    .text-center { text-align: center; }
    .justify-center { justify-content: center; }
    
    .user-greeting {
      display: flex;
      align-items: center;
      gap: 14px;
      padding-left: 4px;
      .greeting-icon { font-size: 2rem; }
    }
    .phone-display {
      font-size: 0.88rem;
      color: var(--primary);
      font-weight: 700;
      margin: 2px 0 0;
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
      box-shadow: 0 2px 10px rgba(0,0,0,0.03);
      height: 56px;
      &:focus-within {
        border-color: #8B0000;
        box-shadow: 0 0 0 4px rgba(139, 0, 0, 0.08);
      }
    }
    .country-code {
      padding: 0 16px;
      font-size: 0.98rem;
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
      font-size: 1.15rem;
      font-weight: 700;
      letter-spacing: 1.5px;
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
      border: 1.5px solid rgba(0,0,0,0.12);
      border-radius: 14px;
      padding: 0 16px;
      height: 50px;
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
      &::placeholder { color: var(--text-muted); }
    }

    .input-with-icon {
      position: relative;
      display: flex;
      align-items: center;
      
      .icon {
        position: absolute;
        left: 14px;
        color: var(--text-muted);
        font-size: 1.3rem;
      }
      .with-icon {
        padding-left: 44px;
      }
    }

    /* ─── PIN Boxes (Rapido Compact Style) ──── */
    .pin-boxes {
      display: flex;
      gap: 6px;
      justify-content: center;
    }
    .pin-box {
      width: 38px;
      height: 42px;
      border: 1.5px solid #D8D8DE;
      border-radius: 8px;
      text-align: center;
      font-size: 1.15rem;
      font-weight: 700;
      font-family: inherit;
      color: #282C3F;
      background: #FFFFFF;
      outline: none;
      transition: all 0.15s ease;
      -webkit-text-security: disc;
      &:focus {
        border-color: #D4AF37;
        box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.25);
      }
      &.filled {
        border-color: #D4AF37;
        background: #FFFDF0;
        color: #8B0000;
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
      border-radius: 24px 24px 0 0;
      padding: 12px var(--space-base) 2rem;
      box-shadow: 0 -10px 40px rgba(0,0,0,0.2);
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
      background: rgba(0,0,0,0.12);
      border-radius: 999px;
      margin: 0 auto 12px;
    }
    .sheet-header {
      border-bottom: 1px solid rgba(0,0,0,0.06);
      padding-bottom: 12px;
    }
    .sheet-top-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
    }
    .btn-close-rapido {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #F5F5F6;
      border: none;
      color: #535766;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s ease;
      &:hover { background: #EAEAEA; color: #282C3F; }
      &:active { transform: scale(0.9); }
      .material-symbols-outlined { font-size: 1.2rem; }
    }
    .header-badge {
      display: inline-block;
      background: linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.25));
      color: #8A6D14;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .phone-change-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 4px;
    }
    .change-link {
      background: none;
      border: none;
      color: var(--text-secondary);
      font-size: 0.78rem;
      text-decoration: underline;
      cursor: pointer;
      padding: 0;
    }

    /* ─── Approval Screen UI ────────────────── */
    .approval-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding-top: 2rem;
    }
    .status-icon-wrap {
      position: relative;
      width: 80px;
      height: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .status-pulse {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background: rgba(212, 175, 55, 0.2);
      animation: pulseGlow 2s infinite ease-in-out;
    }
    @keyframes pulseGlow {
      0%, 100% { transform: scale(1); opacity: 0.6; }
      50% { transform: scale(1.25); opacity: 0.2; }
    }
    .status-shield {
      position: relative;
      width: 68px;
      height: 68px;
      border-radius: 50%;
      background: linear-gradient(135deg, #D4AF37, #B8860B);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 20px rgba(212, 175, 55, 0.35);
      
      .material-symbols-outlined { font-size: 2.2rem; }
    }
    .status-tag {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #FFF9E6;
      color: #B8860B;
      font-size: 0.82rem;
      font-weight: 700;
      padding: 6px 14px;
      border-radius: 999px;
      border: 1px solid rgba(212, 175, 55, 0.3);
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
      background: rgba(0,0,0,0.025);
      border: 1px solid rgba(0,0,0,0.06);
      border-radius: 16px;
      padding: 16px;
      display: flex;
      gap: 12px;
      align-items: flex-start;

      .info-icon {
        color: var(--primary);
        .material-symbols-outlined { font-size: 1.6rem; }
      }
      .info-text {
        flex: 1;
        strong { font-size: 0.88rem; color: var(--text-main); display: block; margin-bottom: 4px; }
        p { margin: 0; font-size: 0.8rem; color: var(--text-muted); line-height: 1.4; }
      }
    }

    /* ─── Buttons ───────────────────────────── */
    .btn-primary {
      width: 100%;
      height: 56px;
      background: linear-gradient(135deg, #8B0000 0%, #600000 100%);
      color: white;
      border: none;
      border-radius: 16px;
      font-size: 1.05rem;
      font-weight: 700;
      letter-spacing: 0.5px;
      cursor: pointer;
      font-family: inherit;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      box-shadow: 0 8px 24px rgba(139, 0, 0, 0.25);
      margin-top: 1.5rem;
      &:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 10px 28px rgba(139, 0, 0, 0.35);
      }
      &:active:not(:disabled) { transform: scale(0.98); }
      &:disabled {
        background: #E2E8F0 !important;
        color: #94A3B8 !important;
        cursor: not-allowed;
        box-shadow: none !important;
        opacity: 1 !important;
      }
    }
    .btn-gradient {
      background: linear-gradient(135deg, #7a0000 0%, #a00000 50%, #7a0000 100%);
      box-shadow: 0 6px 22px rgba(139,0,0,0.35);
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
      color: #D4AF37;
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
      display: block;
      margin: 0 auto;
      padding: 6px;
      &:hover { text-decoration: underline; }
    }

    /* ─── Error ─────────────────────────────── */
    .error-msg {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--error);
      font-size: 0.8rem;
      font-weight: 500;
      margin-top: 8px;
      .material-symbols-outlined { font-size: 1rem; }
    }

    /* ─── Form ──────────────────────────────── */
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-label {
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* ─── Misc ──────────────────────────────── */
    .terms-text {
      text-align: center;
      font-size: 0.78rem;
      color: #64748B;
      margin-top: auto;
      padding-top: 2.5rem;
      padding-bottom: 1rem;
      line-height: 1.5;
    }
    .link-text { color: var(--primary); font-weight: 600; cursor: pointer; }
    .flex-align { display: flex; align-items: center; justify-content: center; }
    .mr-1 { margin-right: 6px; }
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
      await this.authService.loginUser(this.phoneNumber, newPin);
      this.navigateAfterLogin();
    } catch(e: any) {
      this.errorMsg.set('Unable to reset PIN. Please try again.');
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
