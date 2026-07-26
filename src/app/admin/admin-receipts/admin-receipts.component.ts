import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService, Order, Receipt } from '../../core/services/data.service';
import { InvoiceService } from '../../core/services/invoice.service';
import { AuthService, UserProfile } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin-receipts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="receipts-page">
      <!-- Top Executive Header (Matching POS Invoicing Style) -->
      <div class="page-header flex-align justify-between mb-4 pb-3 border-bottom-sharp">
        <div class="header-title flex-align">
          <div class="icon-box mr-3">
            <span class="material-symbols-outlined">receipt_long</span>
          </div>
          <div>
            <h1 class="text-xl font-bold mb-1 text-slate-900">Generate Receipt & Ledger Settlement</h1>
            <p class="text-xs text-slate-500 mb-0 font-medium">Record Customer Payments • Adjust Due & Advance Ledger Balances • Generate PDF Receipt Vouchers</p>
          </div>
        </div>
        <div class="header-actions flex-align gap-3">
          <button class="btn-secondary flex-align" (click)="clearFilters()" title="Reset all filters & form">
            <span class="material-symbols-outlined mr-1 text-sm">refresh</span> Reset Filters
          </button>
        </div>
      </div>

      <!-- STEP 1: Date Range & Ledger Customer Selector Card -->
      <div class="card-sharp mb-4">
        <div class="card-header flex-align justify-between mb-3 pb-3 border-bottom-sharp">
          <div class="flex-align">
            <span class="step-pill mr-2" style="background: #ecfdf5; color: #047857; border-color: #a7f3d0;">STEP 1</span>
            <h3 class="card-title mb-0">Select Date Range & Ledger Customer</h3>
          </div>
          <div class="flex-align gap-2">
            <span *ngIf="selectedCustomer()" class="badge-sharp badge-success">Active Member Ledger</span>
            <button class="btn-secondary flex-align" (click)="clearFilters()" style="height: 34px; padding: 0 12px; font-size: 0.78rem;">
              <span class="material-symbols-outlined mr-1" style="font-size: 16px;">close</span> Clear
            </button>
          </div>
        </div>

        <!-- Row 1: Date Range Pills & Custom Picker -->
        <div class="filter-row-top mb-3 pb-3 border-bottom-sharp flex-align justify-between flex-wrap gap-3">
          <div class="flex-align gap-2 flex-wrap">
            <span class="label-sharp mr-1 text-xs uppercase text-slate-500">Date Filter:</span>
            <button class="date-pill-sharp" [class.active]="dateFilter() === 'today'" (click)="setDateFilter('today')">Today</button>
            <button class="date-pill-sharp" [class.active]="dateFilter() === 'yesterday'" (click)="setDateFilter('yesterday')">Yesterday</button>
            <button class="date-pill-sharp" [class.active]="dateFilter() === 'week'" (click)="setDateFilter('week')">This Week</button>
            <button class="date-pill-sharp" [class.active]="dateFilter() === 'month'" (click)="setDateFilter('month')">This Month</button>
            <button class="date-pill-sharp" [class.active]="dateFilter() === 'last_month'" (click)="setDateFilter('last_month')">Last Month</button>
            <button class="date-pill-sharp custom-pill" [class.active]="dateFilter() === 'custom'" (click)="setDateFilter('custom')">
              Custom <span class="material-symbols-outlined ml-1" style="font-size: 14px;">calendar_today</span>
            </button>
          </div>

          <!-- Inline Custom Date Range Boxes -->
          <div class="custom-date-box flex-align gap-2 px-3 py-1 rounded" *ngIf="dateFilter() === 'custom'" style="background: #f8fafc; border: 1px solid #cbd5e1;">
            <label class="text-xs font-bold text-slate-600">From:</label>
            <input type="date" class="input-sharp" style="height: 32px; padding: 0 8px; font-size: 0.8rem;" [ngModel]="customStartDate()" (ngModelChange)="customStartDate.set($event)">
            <label class="text-xs font-bold text-slate-600 ml-1">To:</label>
            <input type="date" class="input-sharp" style="height: 32px; padding: 0 8px; font-size: 0.8rem;" [ngModel]="customEndDate()" (ngModelChange)="customEndDate.set($event)">
          </div>
        </div>

        <!-- Row 2: Customer Selector & Bill Type Dropdowns -->
        <div class="filter-row-bottom flex-align gap-4 flex-wrap">
          <div class="dropdown-group flex-1" style="min-width: 360px;">
            <label class="label-sharp text-xs uppercase text-slate-500 d-block mb-1">Select Customer to Inspect & Settle Ledger:</label>
            <div class="select-box-sharp">
              <span class="material-symbols-outlined select-icon" style="color: #047857;">person_search</span>
              <select class="custom-select-sharp w-100" [ngModel]="selectedCustId()" (ngModelChange)="onSelectCustomer($event)">
                <option value="">All Customers (Choose a wholesale member to settle ledger balance)</option>
                <option *ngFor="let u of users()" [value]="u.uid">
                  {{ u.name }} (+91-{{ u.phone }}) — [{{ u.balance || 0 > 0 ? 'Due: ₹' + (u.balance | number:'1.2-2') : ((u.balance || 0) < 0 ? 'Adv Credit: ₹' + (Math.abs(u.balance!) | number:'1.2-2') : '₹0') }}]
                </option>
              </select>
            </div>
          </div>

          <div class="dropdown-group" style="min-width: 260px;">
            <label class="label-sharp text-xs uppercase text-slate-500 d-block mb-1">Filter by Bill Type:</label>
            <div class="select-box-sharp">
              <span class="material-symbols-outlined select-icon" style="color: #64748b;">filter_list</span>
              <select class="custom-select-sharp w-100" [ngModel]="orderTypeFilter()" (ngModelChange)="orderTypeFilter.set($event)">
                <option value="all">All Bill Types</option>
                <option value="admin_pos">POS / Store Estimate Only</option>
                <option value="app">Online App Order Only</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Filter Applied Subtitle Bar -->
        <div class="filter-applied-bar mt-3 pt-2 flex-align justify-between border-top-sharp">
          <div class="flex-align gap-2 text-xs text-slate-500 font-medium">
            <span class="material-symbols-outlined text-sm" style="color: #64748b;">event</span>
            <span>Active Date Bounds: <strong class="text-slate-800">{{ filterSubtitle() }}</strong></span>
          </div>
          <div *ngIf="selectedCustomer()" class="badge-sharp badge-success font-bold text-xs">
            <span class="material-symbols-outlined mr-1" style="font-size: 14px;">verified_user</span>
            Ledger Active: {{ selectedCustomer()?.name }} (+91 {{ selectedCustomer()?.phone }})
          </div>
        </div>
      </div>

      <!-- Main Workspace 2-Column Grid (Proportional & Spacious like POS Invoicing) -->
      <div class="grid-workspace-2col">
        <!-- Left Column: Step 2 Unpaid Bills Table & Step 3 Receipts History -->
        <div class="workspace-left">
          <!-- STEP 2: Customer Bills in Date Range -->
          <div class="card-sharp p-0 mb-4 overflow-hidden">
            <div class="card-header p-4 border-bottom-sharp flex-align justify-between" style="background: #fafbfc;">
              <div class="flex-align">
                <span class="step-pill mr-2" style="background: #fef3c7; color: #b45309; border-color: #fde68a;">STEP 2</span>
                <h3 class="card-title mb-0">Unpaid & Ledger Bills {{ selectedCustomer() ? 'for ' + selectedCustomer()?.name : 'in Date Range' }}</h3>
              </div>
              <span class="badge-sharp badge-neutral">{{ filteredOrders().length }} Bills Found</span>
            </div>

            <div class="table-container-sharp">
              <table class="table-sharp m-0">
                <thead>
                  <tr>
                    <th style="width: 120px;">Bill / Order #</th>
                    <th style="width: 140px;">Timestamp</th>
                    <th *ngIf="!selectedCustomer()">Wholesale Customer</th>
                    <th style="width: 130px;">Type</th>
                    <th class="text-right" style="width: 130px;">Bill Total (₹)</th>
                    <th class="text-center" style="width: 110px;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let order of filteredOrders()">
                    <td>
                      <strong class="text-slate-900 font-bold">{{ order.billNumber || order.id.slice(0, 8).toUpperCase() }}</strong>
                    </td>
                    <td class="text-slate-500 text-xs font-medium">{{ order.date | date:'dd/MM/yy hh:mm a' }}</td>
                    <td *ngIf="!selectedCustomer()">
                      <div class="cust-info-block">
                        <div class="font-bold text-slate-800 text-sm">{{ order.customerName }}</div>
                        <div class="text-slate-500 text-xs font-medium mt-1">+91 {{ order.phone }}</div>
                      </div>
                    </td>
                    <td>
                      <span class="badge-sharp" [ngClass]="order.billType === 'admin_pos' ? 'badge-warning' : 'badge-primary'">
                        {{ order.billType === 'admin_pos' ? 'POS Estimate' : 'Online App' }}
                      </span>
                    </td>
                    <td class="text-right font-extrabold text-slate-900 text-sm">₹{{ (order.netPayable || order.totalAmount || 0) | number:'1.2-2' }}</td>
                    <td class="text-center">
                      <span class="badge-sharp" [ngClass]="order.status === 'completed' ? 'badge-success' : (order.status === 'pending' ? 'badge-warning' : 'badge-danger')">
                        {{ order.status | titlecase }}
                      </span>
                    </td>
                  </tr>
                  <tr *ngIf="filteredOrders().length === 0">
                    <td [attr.colspan]="selectedCustomer() ? 5 : 6" class="empty-table-state">
                      <div class="empty-icon-wrap">
                        <span class="material-symbols-outlined text-4xl text-slate-300">receipt</span>
                      </div>
                      <div class="font-bold text-slate-700 text-base mb-1">No Invoices Found</div>
                      <p class="text-xs text-slate-400 m-0">No wholesale estimate bills or app orders match the selected date bounds.</p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- STEP 3: Recent Receipts History Table -->
          <div class="card-sharp p-0 overflow-hidden">
            <div class="card-header p-4 border-bottom-sharp flex-align justify-between" style="background: #fafbfc;">
              <div class="flex-align">
                <span class="step-pill mr-2" style="background: #f0fdf4; color: #16a34a; border-color: #bbf7d0;">STEP 3</span>
                <h3 class="card-title mb-0 flex-align">
                  <span class="material-symbols-outlined mr-2" style="font-size: 20px; color: #047857;">history</span>
                  Recent Receipt Vouchers {{ selectedCustomer() ? 'for ' + selectedCustomer()?.name : 'Log' }}
                </h3>
              </div>
              <span class="badge-sharp badge-success">{{ filteredReceipts().length }} Receipts Logged</span>
            </div>

            <div class="table-container-sharp">
              <table class="table-sharp m-0">
                <thead>
                  <tr>
                    <th style="width: 110px;">Receipt #</th>
                    <th style="width: 135px;">Timestamp</th>
                    <th>Wholesale Member</th>
                    <th class="text-right" style="width: 125px;">Paid Amount</th>
                    <th style="width: 150px;">Mode & Ref</th>
                    <th style="width: 185px;">Ledger Impact (Old ➔ New)</th>
                    <th class="text-center" style="width: 95px;">Voucher</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let rec of filteredReceipts()">
                    <td>
                      <strong style="color: #047857; font-size: 0.92rem;">{{ rec.receiptNumber }}</strong>
                    </td>
                    <td class="text-slate-500 text-xs font-medium">{{ rec.date | date:'dd/MM/yy hh:mm a' }}</td>
                    <td>
                      <div class="cust-info-block">
                        <div class="font-bold text-slate-800 text-sm">{{ rec.customerName }}</div>
                        <div class="text-slate-500 text-xs font-medium mt-1">+91 {{ rec.phone }}</div>
                      </div>
                    </td>
                    <td class="text-right font-extrabold text-sm" style="color: #047857;">
                      ₹{{ rec.receivedAmount | number:'1.2-2' }}
                    </td>
                    <td>
                      <span class="badge-sharp badge-success mb-1">{{ rec.paymentMode }}</span>
                      <div class="text-xs text-slate-500 font-medium truncate" *ngIf="rec.referenceNumber" title="Ref: {{ rec.referenceNumber }}">Ref: {{ rec.referenceNumber }}</div>
                    </td>
                    <td style="font-size: 0.82rem;">
                      <span [style.color]="rec.previousBalance > 0 ? '#dc2626' : '#047857'" class="font-bold">₹{{ Math.abs(rec.previousBalance) | number:'1.0-0' }} {{ rec.previousBalance > 0 ? 'Due' : 'Adv' }}</span>
                      <span class="mx-1 text-slate-400">➔</span>
                      <strong [style.color]="rec.newBalance > 0 ? '#dc2626' : '#047857'">₹{{ Math.abs(rec.newBalance) | number:'1.0-0' }} {{ rec.newBalance > 0 ? 'Due' : (rec.newBalance < 0 ? 'Adv Credit' : 'Cleared') }}</strong>
                    </td>
                    <td class="text-center">
                      <button class="btn-change-sharp flex-align justify-center mx-auto" (click)="downloadReceiptPDF(rec)" title="Download Official PDF Receipt Voucher">
                        <span class="material-symbols-outlined mr-1" style="font-size: 15px;">download</span> PDF
                      </button>
                    </td>
                  </tr>
                  <tr *ngIf="filteredReceipts().length === 0">
                    <td colspan="7" class="empty-table-state">
                      <div class="empty-icon-wrap">
                        <span class="material-symbols-outlined text-4xl text-slate-300">inbox</span>
                      </div>
                      <div class="font-bold text-slate-700 text-base mb-1">No Receipts Recorded Yet</div>
                      <p class="text-xs text-slate-400 m-0">When you settle ledger due or record advance payments, voucher logs will appear here.</p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Right Column: Settle & Generate Payment Receipt Card -->
        <div class="workspace-right">
          <div class="card-sharp settlement-card-sharp" [class.disabled-section]="!selectedCustomer()">
            <div class="card-header pb-3 mb-4 border-bottom-sharp flex-align justify-between">
              <div class="flex-align">
                <span class="step-pill mr-2" style="background: #ecfdf5; color: #047857; border-color: #a7f3d0;">SETTLE</span>
                <div>
                  <h3 class="card-title mb-0 flex-align" style="color: #047857;">
                    <span class="material-symbols-outlined mr-2" style="font-size: 22px;">payments</span>
                    Payment Receipt Voucher
                  </h3>
                  <p class="text-xs text-slate-500 m-0 mt-1">Settle outstanding due or record advance payment</p>
                </div>
              </div>
              <span class="badge-sharp badge-success" *ngIf="selectedCustomer()">Ready</span>
            </div>

            <div *ngIf="selectedCustomer(); else noCustSelected">
              <!-- Selected Customer Ledger Overview Panel (Sleek & Sharp) -->
              <div class="summary-panel-sharp mb-4" [ngClass]="(selectedCustomer()?.balance || 0) > 0 ? 'due-panel' : ((selectedCustomer()?.balance || 0) < 0 ? 'adv-panel' : 'zero-panel')">
                <div class="flex-align justify-between mb-2">
                  <span class="text-xs font-bold uppercase tracking-wider text-slate-500">CURRENT LEDGER BALANCE</span>
                  <span class="badge-sharp" [ngClass]="(selectedCustomer()?.balance || 0) > 0 ? 'badge-danger' : ((selectedCustomer()?.balance || 0) < 0 ? 'badge-success' : 'badge-neutral')">
                    {{ (selectedCustomer()?.balance || 0) > 0 ? 'Old Due (बकाया)' : ((selectedCustomer()?.balance || 0) < 0 ? 'Advance Credit (अग्रिम)' : 'Cleared (चुकता)') }}
                  </span>
                </div>
                <div class="balance-amount font-extrabold mb-2">
                  ₹{{ Math.abs(selectedCustomer()?.balance || 0) | number:'1.2-2' }}
                </div>
                <div class="text-xs text-slate-600 pt-2 border-top-sharp flex-align justify-between">
                  <span>Member: <strong class="text-slate-900">{{ selectedCustomer()?.name }}</strong></span>
                  <span class="font-medium">+91 {{ selectedCustomer()?.phone }}</span>
                </div>
              </div>

              <!-- Payment Settlement Form -->
              <form (ngSubmit)="onGenerateReceipt()" #recForm="ngForm">
                <div class="form-group mb-4">
                  <label class="label-sharp text-xs uppercase text-slate-700 d-block mb-1">
                    Amount Received / Paid (₹) <span class="text-danger">*</span>
                  </label>
                  <div class="input-group-sharp">
                    <span class="prefix text-slate-500 font-bold">₹</span>
                    <input type="number" class="amount-input-sharp" 
                           [ngModel]="receivedAmount()" 
                           (ngModelChange)="receivedAmount.set($event)" 
                           name="receivedAmount" 
                           required 
                           min="0.01" 
                           step="0.01"
                           placeholder="0.00">
                  </div>
                  <div class="info-banner-sharp mt-2 flex-align gap-2 text-xs text-slate-600" *ngIf="receivedAmount() !== null && receivedAmount() !== undefined">
                    <span class="material-symbols-outlined text-base" style="color: #047857;">calculate</span>
                    <span>
                      New Projected Balance: 
                      <strong [style.color]="projectedBalance() > 0 ? '#dc2626' : (projectedBalance() < 0 ? '#047857' : '#475569')">
                        ₹{{ Math.abs(projectedBalance()) | number:'1.2-2' }} 
                        {{ projectedBalance() > 0 ? '(Remaining Due)' : (projectedBalance() < 0 ? '(Advance Credit 🎉)' : '(Fully Settled 0)') }}
                      </strong>
                    </span>
                  </div>
                </div>

                <div class="grid-2-col mb-4">
                  <div class="form-group">
                    <label class="label-sharp text-xs uppercase text-slate-700 d-block mb-1">Payment Mode <span class="text-danger">*</span></label>
                    <select class="input-sharp w-100 font-medium" [ngModel]="paymentMode()" (ngModelChange)="paymentMode.set($event)" name="paymentMode">
                      <option value="Cash">Cash (नकद)</option>
                      <option value="Online / UPI">Online / UPI (PhonePe/GPay)</option>
                      <option value="Bank Transfer">Bank Transfer / NEFT</option>
                      <option value="Cheque">Cheque (चेक)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="label-sharp text-xs uppercase text-slate-700 d-block mb-1">Txn Ref / Cheque #</label>
                    <input type="text" class="input-sharp w-100" [ngModel]="referenceNumber()" (ngModelChange)="referenceNumber.set($event)" name="refNo" placeholder="UTR / Cheque #">
                  </div>
                </div>

                <div class="form-group mb-4">
                  <label class="label-sharp text-xs uppercase text-slate-700 d-block mb-1">Remarks / Note (Optional)</label>
                  <textarea class="input-sharp w-100 pt-2" style="height: 64px; resize: none;" [ngModel]="notes()" (ngModelChange)="notes.set($event)" name="notes" placeholder="e.g. Payment received against invoice KH001, KH002..."></textarea>
                </div>

                <button type="submit" class="btn-generate-sharp w-100 flex-align justify-center" 
                        [disabled]="!receivedAmount() || receivedAmount()! <= 0 || isGenerating()">
                  <span class="material-symbols-outlined mr-2" style="font-size: 22px;">receipt_long</span>
                  {{ isGenerating() ? 'Generating Voucher PDF...' : 'Generate Receipt & Update Ledger' }}
                </button>
              </form>
            </div>

            <ng-template #noCustSelected>
              <div class="empty-table-state py-5 my-3 rounded">
                <div class="empty-icon-wrap" style="background: #ecfdf5; width: 80px; height: 80px;">
                  <span class="material-symbols-outlined text-5xl" style="color: #047857;">person_search</span>
                </div>
                <h4 class="font-bold text-slate-800 text-lg mb-2">Select a Customer in Step 1</h4>
                <p class="text-xs text-slate-500 m-0 px-3" style="line-height: 1.6;">
                  Choose a wholesale member from the dropdown selector in STEP 1 to inspect their ledger, view unpaid bills, and record payment receipts.
                </p>
              </div>
            </ng-template>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --primary: #800000;
      --primary-hover: #990000;
      --slate-50: #f8fafc;
      --slate-100: #f1f5f9;
      --slate-200: #e2e8f0;
      --slate-300: #cbd5e1;
      --slate-400: #94a3b8;
      --slate-500: #64748b;
      --slate-600: #475569;
      --slate-700: #334155;
      --slate-800: #1e293b;
      --slate-900: #0f172a;
    }

    .receipts-page { padding: 0.5rem 0; }
    .flex-align { display: flex; align-items: center; }
    .justify-between { justify-content: space-between; }
    .justify-center { justify-content: center; }
    .flex-wrap { flex-wrap: wrap; }
    .gap-2 { gap: 0.5rem; }
    .gap-3 { gap: 0.75rem; }
    .gap-4 { gap: 1rem; }
    .d-block { display: block; }
    .d-inline-block { display: inline-block; }
    .w-100 { width: 100%; }
    .flex-1 { flex: 1; }
    .m-0 { margin: 0; }
    .mb-0 { margin-bottom: 0; }
    .mb-1 { margin-bottom: 0.25rem; }
    .mb-2 { margin-bottom: 0.5rem; }
    .mb-3 { margin-bottom: 0.75rem; }
    .mb-4 { margin-bottom: 1.25rem; }
    .mt-1 { margin-top: 0.25rem; }
    .mt-2 { margin-top: 0.5rem; }
    .mt-3 { margin-top: 0.75rem; }
    .mr-1 { margin-right: 0.25rem; }
    .mr-2 { margin-right: 0.5rem; }
    .mr-3 { margin-right: 0.75rem; }
    .ml-1 { margin-left: 0.25rem; }
    .ml-auto { margin-left: auto; }
    .mx-1 { margin-left: 0.25rem; margin-right: 0.25rem; }
    .mx-auto { margin-left: auto; margin-right: auto; }
    .p-0 { padding: 0 !important; }
    .p-4 { padding: 1.25rem !important; }
    .pb-3 { padding-bottom: 0.75rem; }
    .pt-2 { padding-top: 0.5rem; }
    .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
    .py-5 { padding-top: 2.5rem; padding-bottom: 2.5rem; }
    .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
    .rounded { border-radius: 6px; }
    .overflow-hidden { overflow: hidden; }

    .text-xs { font-size: 0.75rem; }
    .text-sm { font-size: 0.85rem; }
    .text-base { font-size: 0.95rem; }
    .text-lg { font-size: 1.125rem; }
    .text-xl { font-size: 1.35rem; }
    .text-4xl { font-size: 2.25rem; }
    .text-5xl { font-size: 3rem; }
    .font-medium { font-weight: 500; }
    .font-bold { font-weight: 700; }
    .font-extrabold { font-weight: 800; }
    .tracking-wider { letter-spacing: 0.05em; }
    .uppercase { text-transform: uppercase; }
    .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .text-danger { color: #dc2626; }
    .text-success { color: #16a34a; }
    .text-slate-300 { color: var(--slate-300); }
    .text-slate-400 { color: var(--slate-400); }
    .text-slate-500 { color: var(--slate-500); }
    .text-slate-600 { color: var(--slate-600); }
    .text-slate-700 { color: var(--slate-700); }
    .text-slate-800 { color: var(--slate-800); }
    .text-slate-900 { color: var(--slate-900); }

    .border-bottom-sharp { border-bottom: 1px solid var(--slate-200); }
    .border-top-sharp { border-top: 1px solid var(--slate-200); }

    /* Header Icons & Buttons */
    .icon-box {
      width: 46px; height: 46px; border-radius: 10px; background: #ecfdf5; color: #047857; display: flex; align-items: center; justify-content: center; border: 1px solid #a7f3d0;
      .material-symbols-outlined { font-size: 1.75rem; }
    }

    .btn-secondary {
      background: var(--slate-100); color: var(--slate-700); border: 1px solid var(--slate-200); padding: 0 16px; height: 40px; border-radius: 8px; font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: all 0.15s ease;
      &:hover { background: var(--slate-200); color: var(--slate-900); }
    }

    /* Sharp Executive Cards */
    .card-sharp {
      background: #ffffff; border: 1px solid var(--slate-200); border-radius: 12px; padding: 1.5rem 1.75rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.02); position: relative;
    }
    .card-title { font-size: 1.08rem; font-weight: 700; color: var(--slate-900); }
    .step-pill { background: #fef2f2; color: var(--primary); border: 1px solid #fecaca; font-size: 0.68rem; font-weight: 800; padding: 2px 8px; border-radius: 6px; letter-spacing: 0.05em; }

    .badge-sharp {
      display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 6px; font-size: 0.74rem; font-weight: 700;
      &.badge-primary { background: #f0f9ff; color: #0284c7; border: 1px solid #bae6fd; }
      &.badge-success { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
      &.badge-danger { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
      &.badge-warning { background: #fffbeb; color: #d97706; border: 1px solid #fde68a; }
      &.badge-neutral { background: var(--slate-100); color: var(--slate-600); border: 1px solid var(--slate-200); }
    }

    .disabled-section { opacity: 0.55; pointer-events: none; filter: grayscale(0.15); }

    /* Date Pills & Select Boxes */
    .date-pill-sharp {
      background: var(--slate-100); border: 1px solid var(--slate-200); color: var(--slate-700); padding: 0 16px; height: 36px; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.15s ease; display: inline-flex; align-items: center;
      &:hover { background: var(--slate-200); color: var(--slate-900); }
      &.active { background: var(--slate-900); border-color: var(--slate-900); color: white; box-shadow: 0 2px 4px rgba(15, 23, 42, 0.2); }
    }
    .custom-pill { padding: 0 14px; }

    .select-box-sharp {
      position: relative; display: flex; align-items: center;
      .select-icon { position: absolute; left: 14px; font-size: 1.3rem; pointer-events: none; }
    }
    .custom-select-sharp {
      height: 46px; padding-left: 44px; padding-right: 16px; border-radius: 8px; border: 1px solid var(--slate-300); background: var(--slate-50); font-size: 0.9rem; font-weight: 600; color: var(--slate-900); transition: all 0.15s ease; cursor: pointer;
      &:focus { border-color: #047857; background: #ffffff; box-shadow: 0 0 0 3px rgba(4, 120, 87, 0.08); outline: none; }
    }

    /* Main Workspace Layout (2-Column Proportional Grid) */
    .grid-workspace-2col {
      display: grid; grid-template-columns: 1.25fr 450px; gap: 2rem; align-items: start;
    }
    @media (max-width: 1150px) {
      .grid-workspace-2col { grid-template-columns: 1fr; }
    }

    /* Table Container & Sharp Tables */
    .table-container-sharp {
      border-radius: 0; overflow-x: auto; background: white;
    }
    .table-sharp {
      width: 100%; border-collapse: collapse; text-align: left;
      th { background: #f8fafc; padding: 14px 18px; font-size: 0.74rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--slate-500); border-bottom: 2px solid var(--slate-200); position: sticky; top: 0; z-index: 5; }
      td { padding: 16px 18px; vertical-align: middle; border-bottom: 1px solid var(--slate-100); font-size: 0.92rem; color: var(--slate-800); }
      tr:last-child td { border-bottom: none; }
      tr:hover td { background: #fafbfc; }
    }
    .empty-table-state {
      padding: 4.5rem 1.5rem !important; text-align: center; background: #fafbfc;
      .empty-icon-wrap { width: 72px; height: 72px; border-radius: 50%; background: var(--slate-100); display: inline-flex; align-items: center; justify-content: center; margin-bottom: 1rem; }
    }
    .btn-change-sharp {
      background: var(--slate-50); border: 1px solid var(--slate-300); color: var(--slate-700); border-radius: 6px; padding: 4px 10px; font-size: 0.78rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; transition: all 0.15s;
      &:hover { background: var(--slate-200); color: var(--slate-900); }
    }

    /* Right Settlement Card & Form */
    .settlement-card-sharp {
      position: sticky; top: 20px;
    }
    .summary-panel-sharp {
      background: var(--slate-50); border: 1px solid var(--slate-200); border-radius: 10px; padding: 1.25rem 1.5rem; display: flex; flex-direction: column; justify-content: space-between;
      &.due-panel { background: #fef2f2; border-color: #fecaca; .balance-amount { color: #dc2626; } }
      &.adv-panel { background: #ecfdf5; border-color: #a7f3d0; .balance-amount { color: #047857; } }
      &.zero-panel { background: #f8fafc; border-color: #e2e8f0; .balance-amount { color: var(--slate-700); } }
      .balance-amount { font-size: 2rem; }
    }

    .label-sharp { font-size: 0.78rem; font-weight: 700; color: var(--slate-700); }
    .input-sharp {
      height: 44px; padding: 0 14px; border-radius: 8px; border: 1px solid var(--slate-300); font-size: 0.92rem; color: var(--slate-900); background: white; transition: all 0.15s;
      &:focus { border-color: #047857; box-shadow: 0 0 0 3px rgba(4, 120, 87, 0.08); outline: none; }
    }

    .input-group-sharp {
      position: relative; display: flex; align-items: center;
      .prefix { position: absolute; left: 16px; font-size: 1.25rem; }
      .amount-input-sharp {
        width: 100%; height: 50px; padding-left: 36px; padding-right: 16px; border-radius: 8px; border: 1px solid var(--slate-300); background: white; font-size: 1.25rem; font-weight: 800; color: #047857; transition: all 0.15s;
        &:focus { border-color: #047857; box-shadow: 0 0 0 3px rgba(4, 120, 87, 0.12); outline: none; }
      }
    }

    .info-banner-sharp {
      background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 10px 14px;
    }

    .grid-2-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }

    .btn-generate-sharp {
      background: #047857; color: white; border: none; height: 52px; border-radius: 8px; font-weight: 700; font-size: 1rem; cursor: pointer; transition: all 0.15s ease; box-shadow: 0 4px 12px rgba(4, 120, 87, 0.25); letter-spacing: 0.02em;
      &:hover:not([disabled]) { background: #065f46; transform: translateY(-1px); box-shadow: 0 6px 16px rgba(4, 120, 87, 0.35); }
      &:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
    }
  `]
})
export class AdminReceiptsComponent implements OnInit {
  dataService = inject(DataService);
  invoiceService = inject(InvoiceService);
  authService = inject(AuthService);

  Math = Math; // Make Math available in template

  users = signal<UserProfile[]>([]);
  orders = this.dataService.orders;
  receipts = this.dataService.receipts;

  // Filter Bar State
  dateFilter = signal<'today' | 'yesterday' | 'week' | 'month' | 'last_month' | 'custom'>('month');
  customStartDate = signal<string>(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  customEndDate = signal<string>(new Date().toISOString().slice(0, 10));
  selectedCustId = signal<string>('');
  selectedCustomer = signal<UserProfile | null>(null);
  orderTypeFilter = signal<'all' | 'admin_pos' | 'app'>('all');

  // Form State
  receivedAmount = signal<number | null>(null);
  paymentMode = signal<'Cash' | 'Online / UPI' | 'Bank Transfer' | 'Cheque'>('Cash');
  referenceNumber = signal<string>('');
  notes = signal<string>('');
  isGenerating = signal<boolean>(false);

  ngOnInit() {
    this.loadUsers();
  }

  async loadUsers() {
    try {
      const list = await this.authService.getAllUsers();
      // Sort alphabetically by name
      const sorted = list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      this.users.set(sorted);
    } catch (err) {
      console.error('Failed to load customers for receipt settlement:', err);
    }
  }

  setDateFilter(filter: 'today' | 'yesterday' | 'week' | 'month' | 'last_month' | 'custom') {
    this.dateFilter.set(filter);
  }

  clearFilters() {
    this.dateFilter.set('month');
    this.selectedCustId.set('');
    this.selectedCustomer.set(null);
    this.orderTypeFilter.set('all');
    this.receivedAmount.set(null);
  }

  onSelectCustomer(uid: string) {
    this.selectedCustId.set(uid);
    if (!uid) {
      this.selectedCustomer.set(null);
      this.receivedAmount.set(null);
      return;
    }
    const cust = this.users().find(u => u.uid === uid);
    if (cust) {
      this.selectedCustomer.set(cust);
      // Auto-suggest due balance as received amount (if > 0)
      const dueBal = cust.balance || 0;
      this.receivedAmount.set(dueBal > 0 ? dueBal : null);
    } else {
      this.selectedCustomer.set(null);
      this.receivedAmount.set(null);
    }
  }

  // Calculate Date Bounds in MS
  dateBoundsMs = computed(() => {
    const filter = this.dateFilter();
    const now = new Date();
    let startMs = 0;
    let endMs = now.getTime();

    if (filter === 'today') {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      startMs = d.getTime();
    } else if (filter === 'yesterday') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
      startMs = start.getTime();
      endMs = end.getTime();
    } else if (filter === 'week') {
      // Last 7 days
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0);
      startMs = d.getTime();
    } else if (filter === 'month') {
      const d = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      startMs = d.getTime();
    } else if (filter === 'last_month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      startMs = start.getTime();
      endMs = end.getTime();
    } else if (filter === 'custom') {
      const sStr = this.customStartDate();
      const eStr = this.customEndDate();
      startMs = sStr ? new Date(sStr + 'T00:00:00').getTime() : 0;
      endMs = eStr ? new Date(eStr + 'T23:59:59.999').getTime() : now.getTime();
    }

    return { startMs, endMs };
  });

  filterSubtitle = computed(() => {
    const filter = this.dateFilter();
    const { startMs, endMs } = this.dateBoundsMs();
    if (filter === 'today') return `Today (${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })})`;
    if (filter === 'yesterday') return `Yesterday (${new Date(startMs).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })})`;
    if (filter === 'week') return `Last 7 Days`;
    if (filter === 'month') return `This Month (${new Date(startMs).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })})`;
    if (filter === 'last_month') return `Last Month (${new Date(startMs).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })})`;
    return `${new Date(startMs).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} - ${new Date(endMs).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`;
  });

  filteredOrders = computed(() => {
    const { startMs, endMs } = this.dateBoundsMs();
    const cust = this.selectedCustomer();
    const type = this.orderTypeFilter();

    return this.orders().filter(o => {
      // Date check
      const oMs = new Date(o.date).getTime();
      if (oMs < startMs || oMs > endMs) return false;

      // Customer check
      if (cust) {
        const matchUid = o.uid && o.uid === cust.uid;
        const matchPhone = o.phone && o.phone === cust.phone;
        if (!matchUid && !matchPhone) return false;
      }

      // Type check
      if (type !== 'all' && o.billType !== type) {
        if (type === 'app' && o.billType === 'admin_pos') return false;
        if (type === 'admin_pos' && o.billType !== 'admin_pos') return false;
      }

      return true;
    });
  });

  filteredReceipts = computed(() => {
    const cust = this.selectedCustomer();
    if (!cust) return this.receipts().slice(0, 20); // Show recent 20 overall
    return this.receipts().filter(r => r.customerUid === cust.uid || r.phone === cust.phone);
  });

  projectedBalance = computed(() => {
    const cust = this.selectedCustomer();
    if (!cust) return 0;
    const prev = cust.balance || 0;
    const recv = this.receivedAmount() || 0;
    return prev - recv;
  });

  async onGenerateReceipt() {
    const cust = this.selectedCustomer();
    const amount = this.receivedAmount();
    if (!cust || !amount || amount <= 0) return;

    this.isGenerating.set(true);
    try {
      const prevBal = cust.balance || 0;
      const newBal = prevBal - amount;

      const receipt = await this.dataService.createReceipt({
        customerUid: cust.uid,
        customerName: cust.name,
        phone: cust.phone,
        previousBalance: prevBal,
        receivedAmount: amount,
        newBalance: newBal,
        paymentMode: this.paymentMode(),
        referenceNumber: this.referenceNumber().trim(),
        notes: this.notes().trim()
      });

      // Trigger PDF Receipt Voucher generation & download
      this.invoiceService.generateReceipt(receipt);

      // Reload customers from Firestore to sync balance
      await this.loadUsers();
      const updatedCust = this.users().find(u => u.uid === cust.uid);
      if (updatedCust) {
        this.selectedCustomer.set(updatedCust);
      }

      // Reset fields
      this.receivedAmount.set(Math.max(0, newBal));
      this.referenceNumber.set('');
      this.notes.set('');

      alert(`✅ Payment Receipt Voucher (${receipt.receiptNumber}) generated successfully!\n\nOld Balance: ₹${prevBal.toFixed(2)}\nAmount Received: ₹${amount.toFixed(2)}\nNew Balance: ₹${Math.abs(newBal).toFixed(2)} (${newBal < 0 ? 'Advance Credit 🎉' : 'Remaining Due'})`);
    } catch (err) {
      console.error('Failed to generate receipt:', err);
      alert('⚠️ Error generating receipt. Please check console.');
    } finally {
      this.isGenerating.set(false);
    }
  }

  downloadReceiptPDF(rec: Receipt) {
    this.invoiceService.generateReceipt(rec);
  }
}
