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
      padding: 0.75rem 1.25rem;
      border-radius: 50px;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: var(--text-main);
      min-width: 300px;
      
      &.success {
        border-left: 4px solid var(--success);
        .icon { color: var(--success); }
      }
      
      &.error {
        border-left: 4px solid var(--error);
        .icon { color: var(--error); }
      }
      
      &.info {
        border-left: 4px solid var(--primary);
        .icon { color: var(--primary); }
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
      color: var(--text-muted);
      transition: background 0.2s ease;
      
      &:hover {
        background: rgba(0,0,0,0.05);
        color: var(--text-main);
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
