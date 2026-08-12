import { Component, OnInit, Inject, PLATFORM_ID, signal } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { SnackbarComponent } from './shared/snackbar/snackbar.component';
import { SplashScreenComponent } from './shared/splash-screen/splash-screen.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SnackbarComponent, CommonModule, SplashScreenComponent],
  template: `
    <!-- Premium Splash Screen (only on first load) -->
    <app-splash-screen *ngIf="showSplash()"></app-splash-screen>
    <router-outlet></router-outlet>
    <app-snackbar></app-snackbar>
  `
})
export class AppComponent implements OnInit {
  title = 'khandelwal-cards';
  showSplash = signal(true);

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      if (isPlatformBrowser(this.platformId)) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });

    // Remove splash after doors fully open (1s delay + 0.85s animation + 0.25s buffer)
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => this.showSplash.set(false), 2200);
    } else {
      this.showSplash.set(false);
    }
  }
}
