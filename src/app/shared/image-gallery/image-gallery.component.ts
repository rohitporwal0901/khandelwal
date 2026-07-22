import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-image-gallery',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="gallery-container">
      <div class="main-image">
        <img [src]="images[currentIndex()]" alt="Product Image">
        
        <button *ngIf="images.length > 1" class="nav-btn prev desktop-only" (click)="prev()">
          <span class="material-symbols-outlined">chevron_left</span>
        </button>
        <button *ngIf="images.length > 1" class="nav-btn next desktop-only" (click)="next()">
          <span class="material-symbols-outlined">chevron_right</span>
        </button>
        
        <div class="pagination-dots mobile-only" *ngIf="images.length > 1">
          <span class="dot" *ngFor="let img of images; let i = index" 
                [class.active]="i === currentIndex()"
                (click)="setIndex(i)"></span>
        </div>
      </div>
      
      <div class="thumbnail-list" *ngIf="images.length > 1">
        <div class="thumb" *ngFor="let img of images; let i = index" 
             [class.active]="i === currentIndex()"
             (click)="setIndex(i)">
          <img [src]="img" alt="Thumbnail">
        </div>
      </div>
    </div>
  `,
  styles: [`
    .gallery-container {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .main-image {
      width: 100%;
      aspect-ratio: 4/5;
      border-radius: var(--border-radius-md);
      overflow: hidden;
      position: relative;
      background: var(--background);
      
      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      
      .nav-btn {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        background: rgba(255,255,255,0.8);
        border: none;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: var(--shadow-sm);
        transition: var(--transition);
        
        &:hover {
          background: #fff;
          box-shadow: var(--shadow-md);
        }
        
        &.prev { left: 1rem; }
        &.next { right: 1rem; }
      }
      
      .pagination-dots {
        position: absolute;
        bottom: 1rem;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 8px;
        background: rgba(0,0,0,0.2);
        padding: 4px 8px;
        border-radius: 12px;
        backdrop-filter: blur(4px);
        
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255,255,255,0.5);
          cursor: pointer;
          transition: var(--transition);
          
          &.active {
            background: #fff;
            transform: scale(1.2);
          }
        }
      }
    }
    
    .thumbnail-list {
      display: flex;
      gap: 1rem;
      overflow-x: auto;
      padding-bottom: 0.5rem;
      justify-content: center;
      
      /* Hide scrollbar for cleaner look */
      &::-webkit-scrollbar { display: none; }
      -ms-overflow-style: none;
      scrollbar-width: none;
      
      .thumb {
        width: 70px;
        height: 70px;
        border-radius: var(--border-radius-sm);
        overflow: hidden;
        cursor: pointer;
        border: 2px solid transparent;
        transition: var(--transition);
        flex-shrink: 0;
        
        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        &.active {
          border-color: #000;
        }
      }
    }
    
    @media (max-width: 768px) {
      .desktop-only { display: none !important; }
      .thumbnail-list { gap: 0.5rem; justify-content: flex-start; }
      .main-image { border-radius: 0; }
    }
    
    @media (min-width: 769px) {
      .mobile-only { display: none !important; }
    }
  `]
})
export class ImageGalleryComponent {
  @Input() images: string[] = [];
  currentIndex = signal<number>(0);

  next() {
    this.currentIndex.update(i => (i + 1) % this.images.length);
  }

  prev() {
    this.currentIndex.update(i => (i - 1 + this.images.length) % this.images.length);
  }

  setIndex(i: number) {
    this.currentIndex.set(i);
  }
}
