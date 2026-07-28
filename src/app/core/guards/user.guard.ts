import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const userGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Wait for Firebase to resolve auth state (prevents redirect on page refresh)
  if (authService.authLoading()) {
    await new Promise<void>(resolve => {
      const interval = setInterval(() => {
        if (!authService.authLoading()) {
          clearInterval(interval);
          resolve();
        }
      }, 50);
    });
  }

  if (authService.isAuthenticated()) {
    const profile = authService.currentUserProfile();
    
    // If authenticated but no profile exists (e.g. deleted from Firestore), force logout
    if (!profile) {
      authService.logoutUser();
      router.navigate(['/shop/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }

    if (profile && (profile.status === 'pending' || profile.status === 'rejected')) {
      router.navigate(['/shop/login'], { queryParams: { returnUrl: state.url, status: profile.status } });
      return false;
    }
    return true;
  }

  // Not logged in — redirect to login page with returnUrl
  router.navigate(['/shop/login'], { queryParams: { returnUrl: state.url } });
  return false;
};
