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

  users          = signal<UserProfile[]>([]);
  loading        = signal<boolean>(true);
  filterStatus   = signal<'all' | 'pending' | 'approved' | 'rejected'>('all');
  updatingUid    = signal<string>('');
  currentPage    = signal(1);
  pageSize       = signal(10);
  isPaginating   = signal(false);
  searchQuery    = signal<string>('');

  // ─── Inline Discount Edit ─────────────────────────────────
  editingUid         = signal<string>('');   // uid of row currently being edited
  editDiscountValue  = 0;                    // two-way bound number input
  isSavingDiscount   = signal<boolean>(false);
  discountError      = signal<string>('');
  saveSuccess        = signal<boolean>(false);
  private toastTimer?: any;

  ngOnInit() { this.loadUsers(); }

  // ─── Load ────────────────────────────────────────────────
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

  // ─── Filter / Search / Pagination ────────────────────────
  getCount(status: 'pending' | 'approved' | 'rejected') {
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
    const query  = this.searchQuery().toLowerCase().trim();
    let list = this.users();
    if (status !== 'all') list = list.filter(u => u.status === status);
    if (query) list = list.filter(u =>
      (u.name || '').toLowerCase().includes(query) ||
      (u.phone || '').includes(query)
    );
    return list;
  });

  paginatedUsers = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredUsers().slice(start, start + this.pageSize());
  });

  totalPages = computed(() =>
    Math.ceil(this.filteredUsers().length / this.pageSize())
  );

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.isPaginating.set(true);
      setTimeout(() => { this.currentPage.update(p => p + 1); this.isPaginating.set(false); }, 400);
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.isPaginating.set(true);
      setTimeout(() => { this.currentPage.update(p => p - 1); this.isPaginating.set(false); }, 400);
    }
  }

  // ─── Status (Approve / Decline) ──────────────────────────
  async changeStatus(user: UserProfile, newStatus: 'approved' | 'rejected') {
    this.updatingUid.set(user.uid);
    try {
      await this.authService.updateUserStatus(user.uid, newStatus);
      this.users.update(list => list.map(u =>
        u.uid === user.uid ? { ...u, status: newStatus } : u
      ));
    } catch (e) {
      alert('Failed to update member status. Please try again.');
    } finally {
      this.updatingUid.set('');
    }
  }

  // ─── Inline Discount Edit ─────────────────────────────────

  /** Open inline edit for a row */
  startEdit(user: UserProfile) {
    // Cancel any previous edit first
    this.editingUid.set(user.uid);
    this.editDiscountValue = Math.min(100, Math.max(0, Number(user.discountPercent) || 0));
    this.discountError.set('');
  }

  /** Cancel without saving */
  cancelEdit() {
    this.editingUid.set('');
    this.discountError.set('');
  }

  preventInvalidInput(event: KeyboardEvent) {
    if (['-', '+', 'e', 'E'].includes(event.key)) {
      event.preventDefault();
    }
  }

  enforceMax100(event: any) {
    const el = event.target as HTMLInputElement;
    if (Number(el.value) > 100) {
      el.value = '100';
      this.editDiscountValue = 100;
    }
  }

  /** Clamp value to 0-100 while user types */
  clampDiscount() {
    let n = Number(this.editDiscountValue);
    if (isNaN(n))  { this.editDiscountValue = 0; return; }
    if (n < 0)     { this.editDiscountValue = Math.abs(n); n = this.editDiscountValue; } // Force positive
    if (n > 100)   { this.editDiscountValue = 100; }
    this.discountError.set('');
  }

  /** Save discount to Firestore */
  async saveDiscount(user: UserProfile) {
    const val = Math.min(100, Math.max(0, Number(this.editDiscountValue) || 0));

    // Validate
    if (isNaN(val) || val < 0 || val > 100) {
      this.discountError.set('Enter a value between 0 and 100');
      return;
    }

    this.isSavingDiscount.set(true);
    this.discountError.set('');
    try {
      await this.authService.updateCustomerProfileAdmin(user.uid, { discountPercent: val });

      // Optimistic local update
      this.users.update(list => list.map(u =>
        u.uid === user.uid ? { ...u, discountPercent: val } : u
      ));

      this.editingUid.set('');
      this.flashSuccess();
    } catch (e) {
      console.error('Discount save failed:', e);
      this.discountError.set('Save failed. Check connection.');
    } finally {
      this.isSavingDiscount.set(false);
    }
  }

  private flashSuccess() {
    this.saveSuccess.set(true);
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.saveSuccess.set(false), 3000);
  }
}
