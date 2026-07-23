import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SnackbarService } from '../../core/services/snackbar.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-wrapper">
      <div class="login-card card">
        <div class="login-header">
          <h2>Khandelwal Cards</h2>
          <p class="text-muted">Admin Panel Login</p>
        </div>
        
        <form (ngSubmit)="onSubmit()" #loginForm="ngForm">
          <div class="form-group">
            <label class="form-label">Email Address</label>
            <div class="input-with-icon">
              <span class="material-symbols-outlined icon">mail</span>
              <input type="email" class="form-control" 
                     [class.is-invalid]="emailField.invalid && (emailField.dirty || emailField.touched)"
                     [(ngModel)]="email" name="email" #emailField="ngModel"
                     placeholder="admin@khandelwalcards.com" required email>
            </div>
            <div class="validation-error" *ngIf="emailField.invalid && (emailField.dirty || emailField.touched)">
              <small *ngIf="emailField.errors?.['required']">Email is required.</small>
              <small *ngIf="emailField.errors?.['email']">Please enter a valid email address.</small>
            </div>
          </div>
          
          <div class="form-group">
            <label class="form-label">Password</label>
            <div class="input-with-icon right-icon">
              <span class="material-symbols-outlined icon">lock</span>
              <input [type]="showPassword() ? 'text' : 'password'" class="form-control" 
                     [(ngModel)]="password" name="password" 
                     placeholder="••••••••" required>
              <button type="button" class="btn-icon eye-btn" (click)="togglePassword()">
                <span class="material-symbols-outlined">{{ showPassword() ? 'visibility_off' : 'visibility' }}</span>
              </button>
            </div>
          </div>
          
          <!-- <div class="form-options">
            <label class="remember-me">
              <input type="checkbox" [(ngModel)]="rememberMe" name="rememberMe">
              Remember me
            </label>
            <a href="#" class="forgot-link text-primary">Forgot Password?</a>
          </div> -->
          
          <div class="error-msg" *ngIf="errorMsg()">
            {{ errorMsg() }}
          </div>
          
          <button type="submit" class="btn btn-primary login-btn" 
                  [disabled]="isLoading() || !loginForm.form.valid">
            <span *ngIf="!isLoading() && !isSuccess()">Login to Dashboard</span>
            <span *ngIf="isLoading()" class="loader"></span>
            <span *ngIf="isSuccess()">
              <span class="material-symbols-outlined">check_circle</span> Success
            </span>
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .login-wrapper {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, var(--background) 0%, #e9ecef 100%);
    }
    
    .login-card {
      width: 100%;
      max-width: 400px;
      padding: 2.5rem;
      border-top: 4px solid var(--primary);
    }
    
    .login-header {
      text-align: center;
      margin-bottom: 2rem;
      
      h2 {
        color: var(--primary);
        font-size: 1.75rem;
        margin-bottom: 0.5rem;
      }
    }
    
    .input-with-icon {
      position: relative;
      
      .icon {
        position: absolute;
        left: 1rem;
        top: 50%;
        transform: translateY(-50%);
        color: var(--text-muted);
        font-size: 1.25rem;
      }
      
      .form-control {
        padding-left: 2.75rem;
      }
      
      &.right-icon .form-control {
        padding-right: 2.75rem;
      }
      
      .eye-btn {
        position: absolute;
        right: 0.5rem;
        top: 50%;
        transform: translateY(-50%);
        background: transparent;
        border: none;
        color: var(--text-muted);
        cursor: pointer;
        padding: 0.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        
        &:hover {
          color: var(--text-main);
        }
      }
    }
    
    .form-options {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      font-size: 0.9rem;
      
      .remember-me {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        cursor: pointer;
      }
      
      .forgot-link {
        text-decoration: none;
        font-weight: 500;
        
        &:hover {
          text-decoration: underline;
        }
      }
    }
    
    .login-btn {
      width: 100%;
      padding: 0.875rem;
      font-size: 1.1rem;
      
      .loader {
        width: 20px;
        height: 20px;
        border: 2px solid rgba(255,255,255,0.3);
        border-radius: 50%;
        border-top-color: #fff;
        animation: spin 1s ease-in-out infinite;
      }
    }
    
    .error-msg {
      color: var(--error);
      font-size: 0.875rem;
      text-align: center;
      margin-bottom: 1rem;
      padding: 0.5rem;
      background: rgba(220, 53, 69, 0.1);
      border-radius: var(--border-radius-sm);
    }
    
    .validation-error {
      color: var(--error);
      font-size: 0.8rem;
      margin-top: 0.25rem;
      padding-left: 0.5rem;
    }
    
    .form-control.is-invalid {
      border-color: var(--error);
      
      &:focus {
        box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.1);
      }
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class AdminLoginComponent {
  authService = inject(AuthService);
  snackbar = inject(SnackbarService);
  router = inject(Router);

  email = 'admin@khandelwalcards.com';
  password = '123456';
  rememberMe = false;

  isLoading = signal(false);
  isSuccess = signal(false);
  errorMsg = signal('');
  showPassword = signal(false);

  togglePassword() {
    this.showPassword.update(v => !v);
  }

  async onSubmit() {
    this.isLoading.set(true);
    this.errorMsg.set('');

    setTimeout(async () => {
      try {
        const success = await this.authService.login(this.email, this.password);
        
        if (success) {
          this.snackbar.show('Logged in successfully!', 'success');
          this.router.navigate(['/admin/dashboard']);
        } else {
          this.errorMsg.set('Invalid admin credentials.');
        }
      } catch (err: any) {
        this.errorMsg.set(err.message || 'Login failed');
      } finally {
        this.isLoading.set(false);
      }
    }, 1200);
  }
}
