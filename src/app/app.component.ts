import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SnackbarComponent } from './shared/snackbar/snackbar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SnackbarComponent],
  template: `
    <router-outlet></router-outlet>
    <app-snackbar></app-snackbar>
  `
})
export class AppComponent {
  title = 'khandelwal-cards';
}
