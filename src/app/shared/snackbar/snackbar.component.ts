import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SnackbarService } from '../../core/services/snackbar.service';

@Component({
  selector: 'app-snackbar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="snackbar-container" [class.show]="snackbar.isOpen()">
      <div class="snackbar glass-panel" [ngClass]="snackbar.type()">
        <span class="material-symbols-outlined icon">
          {{ getIcon(snackbar.type()) }}
        </span>
        <span class="message">{{ snackbar.message() }}</span>
        <button class="close-btn" (click)="snackbar.close()">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .snackbar-container {
      position: fixed;
      bottom: 2rem;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      z-index: 9999;
      opacity: 0;
      visibility: hidden;
      transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      
      &.show {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
        visibility: visible;
      }
    }
    
    .snackbar {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      border-radius: 50px;
      background: var(--primary);
      backdrop-filter: blur(10px);
      box-shadow: 0 10px 40px rgba(139, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: var(--surface);
      min-width: 320px;
      
      &.success {
        .icon { color: var(--success); filter: brightness(1.5); }
      }
      
      &.error {
        .icon { color: #ff6b6b; }
      }
      
      &.info {
        .icon { color: var(--secondary); }
      }
    }
    
    .icon {
      font-size: 24px;
    }
    
    .message {
      font-size: 0.95rem;
      font-weight: 500;
      flex: 1;
    }
    
    .close-btn {
      background: transparent;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.25rem;
      border-radius: 50%;
      color: rgba(255, 255, 255, 0.7);
      transition: background 0.2s ease, color 0.2s ease;
      
      &:hover {
        background: rgba(255, 255, 255, 0.1);
        color: var(--surface);
      }
      
      span { font-size: 18px; }
    }
  `]
})
export class SnackbarComponent {
  snackbar = inject(SnackbarService);
  
  getIcon(type: string): string {
    switch (type) {
      case 'success': return 'check_circle';
      case 'error': return 'error';
      case 'info': return 'info';
      default: return 'info';
    }
  }
}
