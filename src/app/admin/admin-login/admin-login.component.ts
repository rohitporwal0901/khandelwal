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
  templateUrl: './admin-login.component.html',
  styleUrls: ['./admin-login.component.css']
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
