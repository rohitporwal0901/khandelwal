import { Component, OnInit, inject, signal, computed, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService, Order, Receipt } from '../../core/services/data.service';
import { InvoiceService } from '../../core/services/invoice.service';
import { AuthService, UserProfile } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin-receipts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-receipts.component.html',
  styleUrls: ['./admin-receipts.component.css']
})
export class AdminReceiptsComponent implements OnInit {
  dataService = inject(DataService);
  invoiceService = inject(InvoiceService);
  authService = inject(AuthService);
  elementRef = inject(ElementRef);

  Math = Math; // Make Math available in template

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.showCustomerDropdown.set(false);
    }
  }

  users = signal<UserProfile[]>([]);
  orders = this.dataService.orders;
  receipts = this.dataService.receipts;

  // Filter & Search State
  customerSearchTerm = signal('');
  showCustomerDropdown = signal(false);
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
      const all = await this.authService.getAllUsers();
      const sorted = [...all].sort((a, b) => a.name.localeCompare(b.name));
      this.users.set(sorted);
    } catch (err) {
      console.error('Failed to load customers for receipt settlement:', err);
    }
  }

  filteredCustomers = computed(() => {
    const term = this.customerSearchTerm().toLowerCase().trim();
    if (!term) return this.users().slice(0, 30);
    return this.users().filter(u => 
      u.name.toLowerCase().includes(term) ||
      (u.phone && u.phone.includes(term)) ||
      (u.address && u.address.toLowerCase().includes(term)) ||
      (u.pincode && u.pincode.includes(term))
    ).slice(0, 30);
  });

  selectCustomer(cust: UserProfile) {
    this.selectedCustomer.set(cust);
    this.selectedCustId.set(cust.uid);
    this.showCustomerDropdown.set(false);
    this.customerSearchTerm.set('');
    const dueBal = cust.balance || 0;
    this.receivedAmount.set(dueBal > 0 ? dueBal : null);
  }

  setDateFilter(filter: 'today' | 'yesterday' | 'week' | 'month' | 'last_month' | 'custom') {
    this.dateFilter.set(filter);
  }

  clearFilters() {
    this.selectedCustId.set('');
    this.selectedCustomer.set(null);
    this.customerSearchTerm.set('');
    this.showCustomerDropdown.set(false);
    this.dateFilter.set('month');
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
      this.selectCustomer(cust);
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
    const cust = this.selectedCustomer();
    const type = this.orderTypeFilter();

    return this.orders().filter(o => {
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
