import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, UserProfile } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin-customers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <div>
        <h2>Member Applications & Customers</h2>
        <p class="text-muted">Review, verify, and manage store access for all registered wholesale users</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-outline flex-align" (click)="loadUsers()" [disabled]="loading()">
          <span class="material-symbols-outlined mr-1">refresh</span> Refresh List
        </button>
      </div>
    </div>

    <!-- Filter Tabs -->
    <div class="filter-tabs mb-4">
      <button class="tab-btn" [class.active]="filterStatus() === 'all'" (click)="filterStatus.set('all')">
        All Members <span class="tab-count">{{ users().length }}</span>
      </button>
      <button class="tab-btn tab-pending" [class.active]="filterStatus() === 'pending'" (click)="filterStatus.set('pending')">
        ⏳ Pending Verification <span class="tab-count count-pending">{{ getCount('pending') }}</span>
      </button>
      <button class="tab-btn" [class.active]="filterStatus() === 'approved'" (click)="filterStatus.set('approved')">
        ✅ Approved Access <span class="tab-count">{{ getCount('approved') }}</span>
      </button>
      <button class="tab-btn" [class.active]="filterStatus() === 'rejected'" (click)="filterStatus.set('rejected')">
        ❌ Declined <span class="tab-count">{{ getCount('rejected') }}</span>
      </button>
    </div>

    <div class="glass-panel" style="padding: 0;">
      <div class="loading-wrap" *ngIf="loading()">
        <div class="spinner"></div>
        <span>Loading members from database...</span>
      </div>

      <table class="table w-100" *ngIf="!loading()">
        <thead>
          <tr>
            <th>Member / Business</th>
            <th>Contact Number</th>
            <th>Status</th>
            <th>Registration Date</th>
            <th class="text-right">Access Verification</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let user of filteredUsers()">
            <td>
              <div class="customer-info">
                <div class="avatar">
                  <img *ngIf="user.photoUrl" [src]="user.photoUrl" alt="Avatar" class="avatar-img">
                  <span *ngIf="!user.photoUrl">{{ user.name.charAt(0).toUpperCase() }}</span>
                </div>
                <div>
                  <strong>{{ user.name }}</strong>
                  <span class="uid-tag">UID: {{ user.uid.slice(0, 8) }}...</span>
                </div>
              </div>
            </td>
            <td>
              <span class="phone-tag">+91 {{ user.phone }}</span>
            </td>
            <td>
              <span class="badge" [ngClass]="{
                'badge-warning': user.status === 'pending',
                'badge-success': user.status === 'approved',
                'badge-danger': user.status === 'rejected'
              }">
                <span class="dot"></span>
                {{ (user.status || 'approved') | uppercase }}
              </span>
            </td>
            <td>
              <span class="date-text">{{ user.createdAt | date:'medium' }}</span>
            </td>
            <td class="text-right">
              <div class="action-buttons justify-end">
                <button *ngIf="user.status !== 'approved'" 
                        class="btn-action btn-approve"
                        (click)="changeStatus(user, 'approved')"
                        [disabled]="updatingUid() === user.uid"
                        title="Approve access to wholesale store">
                  <span class="material-symbols-outlined icon">check_circle</span>
                  <span>Approve Access</span>
                </button>

                <button *ngIf="user.status !== 'rejected'" 
                        class="btn-action btn-reject"
                        (click)="changeStatus(user, 'rejected')"
                        [disabled]="updatingUid() === user.uid"
                        title="Decline access">
                  <span class="material-symbols-outlined icon">cancel</span>
                  <span>Decline</span>
                </button>
              </div>
            </td>
          </tr>

          <tr *ngIf="filteredUsers().length === 0">
            <td colspan="5" class="text-center empty-state">
              <span class="material-symbols-outlined empty-icon">group_off</span>
              <p>No members found matching the selected status filter.</p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      h2 { margin: 0; font-weight: 800; color: var(--text-main); }
      p { margin: 4px 0 0; }
    }
    .header-actions { display: flex; gap: 10px; }
    .flex-align { display: flex; align-items: center; }
    .mr-1 { margin-right: 6px; }
    .mb-4 { margin-bottom: 1.5rem; }

    /* ─── Filter Tabs ───────────────────────── */
    .filter-tabs {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .tab-btn {
      background: white;
      border: 1.5px solid rgba(0,0,0,0.08);
      border-radius: 12px;
      padding: 10px 16px;
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text-secondary);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
      
      &:hover { background: rgba(0,0,0,0.02); }
      &.active {
        background: var(--primary);
        color: white;
        border-color: var(--primary);
        box-shadow: 0 4px 14px rgba(139,0,0,0.25);
        
        .tab-count { background: white; color: var(--primary); }
      }
    }
    .tab-count {
      background: rgba(0,0,0,0.08);
      color: var(--text-main);
      font-size: 0.75rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 999px;
    }
    .count-pending {
      background: #FFF0C2;
      color: #9A7B1C;
    }

    /* ─── Table ─────────────────────────────── */
    .table {
      width: 100%;
      border-collapse: collapse;
      
      th, td {
        padding: 1.1rem 1.5rem;
        text-align: left;
        border-bottom: 1px solid rgba(0,0,0,0.06);
        vertical-align: middle;
      }
      th {
        font-weight: 700;
        color: var(--text-muted);
        font-size: 0.78rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        background: rgba(0,0,0,0.025);
      }
      tbody tr {
        transition: background 0.15s;
        &:hover { background: rgba(139,0,0,0.015); }
      }
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .w-100 { width: 100%; }

    /* ─── Customer Cell ─────────────────────── */
    .customer-info {
      display: flex;
      align-items: center;
      gap: 12px;
      
      .avatar {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: linear-gradient(135deg, #D4AF37, #B8860B);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 1.2rem;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        
        .avatar-img { width: 100%; height: 100%; object-fit: cover; }
      }
      strong { display: block; font-size: 1rem; color: var(--text-main); }
      .uid-tag { font-size: 0.72rem; color: var(--text-muted); }
    }
    .phone-tag {
      font-weight: 600;
      color: var(--text-main);
      font-size: 0.95rem;
    }
    .date-text {
      font-size: 0.85rem;
      color: var(--text-secondary);
    }

    /* ─── Badges ────────────────────────────── */
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 800;
      letter-spacing: 0.3px;
      
      .dot { width: 6px; height: 6px; border-radius: 50%; }
    }
    .badge-warning {
      background: #FFF9E6; color: #B8860B; border: 1px solid rgba(212,175,55,0.4);
      .dot { background: #D4AF37; box-shadow: 0 0 6px #D4AF37; }
    }
    .badge-success {
      background: #E8F5E9; color: #2E7D32; border: 1px solid rgba(46,125,50,0.25);
      .dot { background: #2E7D32; }
    }
    .badge-danger {
      background: #FFEBEE; color: #C62828; border: 1px solid rgba(198,40,40,0.25);
      .dot { background: #C62828; }
    }

    /* ─── Action Buttons ────────────────────── */
    .action-buttons {
      display: flex;
      gap: 8px;
    }
    .justify-end { justify-content: flex-end; }

    .btn-action {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 10px;
      font-size: 0.82rem;
      font-weight: 700;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.15s ease;
      border: 1.5px solid transparent;

      .icon { font-size: 1.1rem; }
      &:active { transform: scale(0.96); }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }
    .btn-approve {
      background: #2E7D32;
      color: white;
      box-shadow: 0 2px 8px rgba(46,125,50,0.3);
      &:hover:not(:disabled) { background: #1B5E20; }
    }
    .btn-reject {
      background: white;
      color: #C62828;
      border-color: rgba(198,40,40,0.3);
      &:hover:not(:disabled) { background: #FFEBEE; }
    }

    /* ─── Loading & Empty State ─────────────── */
    .loading-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem 2rem;
      color: var(--text-secondary);
      gap: 12px;
    }
    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid rgba(0,0,0,0.1);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .empty-state {
      padding: 4rem 2rem !important;
      color: var(--text-muted);
      
      .empty-icon { font-size: 3rem; opacity: 0.4; margin-bottom: 8px; }
      p { margin: 0; font-size: 0.95rem; }
    }
  `]
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
