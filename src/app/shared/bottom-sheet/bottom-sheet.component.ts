import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-bottom-sheet',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="overlay" [class.active]="isOpen" (click)="onClose()"></div>
    <div class="bottom-sheet" [class.open]="isOpen">
      <div class="sheet-header">
        <div class="drag-handle"></div>
        <h3 *ngIf="title">{{ title }}</h3>
        <button class="btn-icon" (click)="onClose()">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      <div class="sheet-content">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [`
    .bottom-sheet {
      position: fixed;
      bottom: -100%;
      left: 0;
      width: 100%;
      max-height: 90vh;
      background: var(--surface);
      border-radius: var(--border-radius-xl) var(--border-radius-xl) 0 0;
      box-shadow: 0 -4px 24px rgba(0,0,0,0.1);
      z-index: 1001;
      transition: bottom 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
      display: flex;
      flex-direction: column;
    }
    
    .bottom-sheet.open {
      bottom: 0;
    }
    
    @media (min-width: 768px) {
      .bottom-sheet {
        width: 500px;
        left: 50%;
        transform: translateX(-50%);
        border-radius: var(--border-radius-xl) var(--border-radius-xl) 0 0;
      }
    }
    
    .sheet-header {
      padding: 1rem 1.5rem;
      border-bottom: 1px solid rgba(0,0,0,0.05);
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: relative;
      
      h3 {
        margin: 0;
        font-size: 1.25rem;
        flex: 1;
        text-align: center;
      }
      
      .btn-icon {
        background: transparent;
        border: none;
        cursor: pointer;
        position: absolute;
        right: 1.5rem;
      }
    }
    
    .drag-handle {
      width: 40px;
      height: 4px;
      background: #e0e0e0;
      border-radius: 2px;
      position: absolute;
      top: 8px;
      left: 50%;
      transform: translateX(-50%);
    }
    
    .sheet-content {
      padding: 1.5rem;
      overflow-y: auto;
    }
  `]
})
export class BottomSheetComponent {
  @Input() isOpen: boolean = false;
  @Input() title: string = '';
  @Output() close = new EventEmitter<void>();

  onClose() {
    this.close.emit();
  }
}
