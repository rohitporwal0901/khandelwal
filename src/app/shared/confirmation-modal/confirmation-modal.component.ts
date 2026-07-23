import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirmation-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-overlay" *ngIf="isOpen" (click)="onCancel()">
      <div class="modal-card glass-panel" (click)="$event.stopPropagation()">
        
        <div class="modal-icon text-error">
          <span class="material-symbols-outlined">warning</span>
        </div>
        
        <h3 class="modal-title">{{ title }}</h3>
        <p class="modal-message text-muted">{{ message }}</p>
        
        <div class="modal-actions">
          <button class="btn btn-outline" (click)="onCancel()">{{ cancelText }}</button>
          <button class="btn btn-primary bg-error" (click)="onConfirm()">{{ confirmText }}</button>
        </div>
        
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(4px);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.2s ease-out;
    }
    
    .modal-card {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: var(--glass-blur);
      border: 1px solid var(--glass-border);
      border-radius: var(--border-radius-xl);
      padding: 2.5rem 2rem;
      width: 90%;
      max-width: 400px;
      text-align: center;
      box-shadow: 0 10px 40px rgba(158, 27, 34, 0.15);
      animation: scaleUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    
    .modal-icon {
      width: 64px;
      height: 64px;
      margin: 0 auto 1.5rem auto;
      background: rgba(220, 53, 69, 0.1);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      
      span {
        font-size: 32px;
      }
    }
    
    .modal-title {
      font-size: 1.5rem;
      margin: 0 0 1rem 0;
      color: var(--text-main);
    }
    
    .modal-message {
      margin: 0 0 2rem 0;
      font-size: 1rem;
      line-height: 1.5;
    }
    
    .modal-actions {
      display: flex;
      gap: 1rem;
      
      button {
        flex: 1;
        padding: 0.8rem;
        font-weight: 600;
        
        &.bg-error {
          background: var(--error);
          border-color: var(--error);
          
          &:hover {
            box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
          }
        }
      }
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes scaleUp {
      from { transform: scale(0.9); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
  `]
})
export class ConfirmationModalComponent {
  @Input() isOpen = false;
  @Input() title = 'Confirm Action';
  @Input() message = 'Are you sure you want to proceed?';
  @Input() confirmText = 'Confirm';
  @Input() cancelText = 'Cancel';
  
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
  
  onConfirm() {
    this.confirm.emit();
  }
  
  onCancel() {
    this.cancel.emit();
  }
}
