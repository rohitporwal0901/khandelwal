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

  currentPage = signal(1);
  pageSize = signal(10);
  isPaginating = signal(false);
  searchQuery = signal<string>('');

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

  setFilter(status: 'all' | 'pending' | 'approved' | 'rejected') {
    this.filterStatus.set(status);
    this.currentPage.set(1);
  }

  onSearch(val: string) {
    this.searchQuery.set(val);
    this.currentPage.set(1);
  }

  filteredUsers = computed(() => {
    const status = this.filterStatus();
    const query = this.searchQuery().toLowerCase().trim();
    let list = this.users();
    
    if (status !== 'all') {
      list = list.filter(u => u.status === status);
    }

    if (query) {
      list = list.filter(u => 
        (u.name || '').toLowerCase().includes(query) ||
        (u.phone || '').includes(query)
      );
    }
    return list;
  });

  paginatedUsers = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    const end = start + this.pageSize();
    return this.filteredUsers().slice(start, end);
  });

  totalPages = computed(() => {
    return Math.ceil(this.filteredUsers().length / this.pageSize());
  });

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.isPaginating.set(true);
      setTimeout(() => {
        this.currentPage.update(p => p + 1);
        this.isPaginating.set(false);
      }, 400); // simulate network delay
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.isPaginating.set(true);
      setTimeout(() => {
        this.currentPage.update(p => p - 1);
        this.isPaginating.set(false);
      }, 400); // simulate network delay
    }
  }

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
