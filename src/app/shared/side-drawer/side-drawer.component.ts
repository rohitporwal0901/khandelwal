import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-side-drawer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './side-drawer.component.html',
  styleUrls: ['./side-drawer.component.scss']
})
export class SideDrawerComponent {
  @Input() isOpen: boolean = false;
  @Input() title: string = '';
  @Input() width: string = '400px';
  @Output() close = new EventEmitter<void>();

  onClose() {
    this.close.emit();
  }
}
