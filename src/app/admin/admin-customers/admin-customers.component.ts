import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, UserProfile } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin-customers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-customers.component.html',
  styleUrls: ['./admin-customers.component.css']
})
export class AdminCustomersComponent implements OnInit {
  authService = inject(AuthService);

  users = signal<UserProfile[]>([]);
  loading = signal<boolean>(true);
  filterStatus = signal<'all' | 'pending' | 'approved' | 'rejected'>('all');
  updatingUid = signal<string>('');

  ngOnInit() {
    this.loadUsers();
  }

  async loadUsers() {
    this.loading.set(true);
    try {
      const list = await this.authService.getAllUsers();
      this.users.set(list);
    } catch (e) {
      console.error(e);
    } finally {
      this.loading.set(false);
    }
  }

  getCount(status: 'pending' | 'approved' | 'rejected'): number {
    return this.users().filter(u => u.status === status).length;
  }

  filteredUsers = computed(() => {
    const status = this.filterStatus();
    if (status === 'all') return this.users();
    return this.users().filter(u => u.status === status);
  });

  async changeStatus(user: UserProfile, newStatus: 'approved' | 'rejected') {
    this.updatingUid.set(user.uid);
    try {
      await this.authService.updateUserStatus(user.uid, newStatus);
      // Update local signal immediately for responsive UX
      const updated = this.users().map(u => u.uid === user.uid ? { ...u, status: newStatus } : u);
      this.users.set(updated);
    } catch (e) {
      alert('Failed to update member status. Please try again.');
    } finally {
      this.updatingUid.set('');
    }
  }
}
