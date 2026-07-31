import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DataService, Receipt, Order } from '../../core/services/data.service';
import { InvoiceService, LedgerReportEntry } from '../../core/services/invoice.service';
import { SnackbarService } from '../../core/services/snackbar.service';

interface UILedgerEntry {
  id: string;
  dateStr: string;
  timestamp: number;
  narration: string;
  debit: number;
  credit: number;
  balance: number;
  balanceType: string;
  type: 'bill' | 'receipt';
  sourceItem: any;
}

@Component({
  selector: 'app-user-ledger',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-ledger.component.html',
  styleUrls: ['./user-ledger.component.css']
})
export class UserLedgerComponent implements OnInit {
  router = inject(Router);
  authService = inject(AuthService);
  dataService = inject(DataService);
  invoiceService = inject(InvoiceService);
  snackbar = inject(SnackbarService);

  Math = Math;

  userProfile = this.authService.currentUserProfile;
  isLoading = signal(true);
  isGeneratingLedger = signal(false);

  // Computes a fully chronological ledger statement (newest first) with running balance
  ledgerEntries = computed(() => {
    const cust = this.userProfile();
    if (!cust) return [];

    const rawTxns: UILedgerEntry[] = [];

    // 1. Gather all billed orders (Debits)
    const myOrders = this.dataService.orders().filter(o => o.uid === cust.uid || o.phone === cust.phone);
    myOrders.forEach(o => {
      if (!o.billNumber) return; // Only billed orders
      const time = new Date(o.date).getTime();
      const amt = o.totalAmount !== undefined ? o.totalAmount : ((o.subTotal || 0) + (o.badha || 0));
      rawTxns.push({
        id: o.id,
        dateStr: new Date(o.date).toISOString().split('T')[0],
        timestamp: time,
        narration: `Bill No ${o.billNumber}`,
        debit: amt,
        credit: 0,
        balance: 0,
        balanceType: '',
        type: 'bill',
        sourceItem: o
      });
    });

    // 2. Gather all receipts (Credits)
    const myReceipts = this.dataService.receipts().filter(r => r.customerUid === cust.uid || r.phone === cust.phone);
    myReceipts.forEach(r => {
      const time = new Date(r.date).getTime();
      rawTxns.push({
        id: r.id || r.receiptNumber,
        dateStr: new Date(r.date).toISOString().split('T')[0],
        timestamp: time,
        narration: `Receipt ${r.receiptNumber} (${r.paymentMode})`,
        debit: 0,
        credit: r.receivedAmount,
        balance: 0,
        balanceType: '',
        type: 'receipt',
        sourceItem: r
      });
    });

    // 3. Sort chronologically (oldest first) to calculate running balance
    rawTxns.sort((a, b) => a.timestamp - b.timestamp);

    // Calculate initial balance (Purana Bakaya when customer was added, before any transactions)
    const allTimeDebits = rawTxns.reduce((sum, tx) => sum + tx.debit, 0);
    const allTimeCredits = rawTxns.reduce((sum, tx) => sum + tx.credit, 0);
    const initialAccountBalance = Math.round(((cust.balance || 0) - (allTimeDebits - allTimeCredits)) * 100) / 100;

    let runningBalance = initialAccountBalance;

    // Apply running balance
    rawTxns.forEach(tx => {
      runningBalance = Math.round((runningBalance + (tx.debit - tx.credit)) * 100) / 100;
      tx.balance = Math.abs(runningBalance);
      tx.balanceType = runningBalance > 0 ? 'Dr' : (runningBalance < 0 ? 'Cr' : '');
    });

    // 4. Return sorted newest-first for the UI timeline
    return rawTxns.sort((a, b) => b.timestamp - a.timestamp);
  });

  ngOnInit() {
    this.isLoading.set(false);
  }

  getDay(dateStr: string): string {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '' : d.getDate().toString().padStart(2, '0');
  }

  getMonth(dateStr: string): string {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', { month: 'short' });
  }

  downloadItem(entry: UILedgerEntry, event: Event) {
    event.stopPropagation();
    if (entry.type === 'receipt') {
      this.snackbar.show('Downloading receipt...', 'info');
      this.invoiceService.generateReceipt(entry.sourceItem as Receipt, true);
    } else if (entry.type === 'bill') {
      const products = this.dataService.products();
      this.snackbar.show('Downloading bill...', 'info');
      this.invoiceService.generateInvoice(entry.sourceItem as Order, products, true);
    }
  }

  downloadFullLedger() {
    const cust = this.userProfile();
    if (!cust) return;

    this.isGeneratingLedger.set(true);
    setTimeout(() => {
      try {
        const d = new Date();
        const endStr = d.toISOString().split('T')[0];
        d.setFullYear(d.getFullYear() - 1);
        const startStr = d.toISOString().split('T')[0];

        // Re-calculate chronological entries for the PDF (oldest first)
        const entriesDesc = [...this.ledgerEntries()];
        const entriesAsc = entriesDesc.reverse(); // oldest first

        const reportEntries: LedgerReportEntry[] = entriesAsc.map(e => ({
          date: new Date(e.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: '2-digit' }),
          timestamp: e.timestamp,
          narration: e.narration,
          debit: e.debit,
          credit: e.credit,
          balance: e.balance,
          balanceType: e.balanceType as '' | 'Dr' | 'Cr'
        }));

        // For Opening Balance, we just subtract the net change of the currently shown entries 
        // from the final running balance. (Simplistic approach since we fetch everything).
        const finalBal = cust.balance || 0;
        let periodDebit = 0;
        let periodCredit = 0;
        reportEntries.forEach(e => { periodDebit += e.debit; periodCredit += e.credit; });
        const openingBal = Math.round((finalBal - (periodDebit - periodCredit)) * 100) / 100;

        this.snackbar.show('Generating ledger report...', 'info');
        this.invoiceService.generateLedgerReport(
          cust,
          reportEntries,
          startStr,
          endStr,
          openingBal,
          finalBal,
          true
        );
      } catch (e) {
        console.error('Error generating ledger PDF:', e);
      } finally {
        this.isGeneratingLedger.set(false);
      }
    }, 100);
  }
}
