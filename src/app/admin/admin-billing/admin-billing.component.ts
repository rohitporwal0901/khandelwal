import { Component, inject, signal, computed, OnInit, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService, Product, OrderItem, Order } from '../../core/services/data.service';
import { AuthService, UserProfile } from '../../core/services/auth.service';
import { InvoiceService } from '../../core/services/invoice.service';
import { NetworkService } from '../../core/services/network.service';
import { OfflineSyncService } from '../../core/services/offline-sync.service';

interface BillGridItem {
  product: Product;
  quantity: number | string | any;
  availableStock: number;
  purchaseRate: number;
  sellingRate: number | string | any;
}

@Component({
  selector: 'app-admin-billing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-billing.component.html',
  styleUrls: ['./admin-billing.component.css']
})
export class AdminBillingComponent implements OnInit {
  private dataService = inject(DataService);
  private authService = inject(AuthService);
  private invoiceService = inject(InvoiceService);
  private elementRef = inject(ElementRef);

  // ─── Offline / Sync Services ──────────────────────────────────────────────
  networkService = inject(NetworkService);
  offlineSync = inject(OfflineSyncService);

  Math = Math; // For template math

  // Signals for state
  users = signal<UserProfile[]>([]);
  products = computed(() => this.dataService.products());

  customerSearchTerm = signal<string>('');
  productSearchTerm = signal<string>('');
  selectedCustomer = signal<UserProfile | null>(null);
  
  showCustomerDropdown = signal<boolean>(false);
  showProductDropdown = signal<boolean>(false);

  billItems = signal<BillGridItem[]>([]);
  badha = signal<number | string | any>('' as any);
  billNotes = signal<string>('');

  isGenerating = signal<boolean>(false);
  showSuccessModal = signal<boolean>(false);
  lastGeneratedBillNumber = signal<string>('');
  lastBillWasOffline = signal<boolean>(false);  // Track if last bill was offline

  // Toast Notification Signal (Top Sliding UI)
  toastMessage = signal<{ text: string; type: 'error' | 'warning' | 'success' | 'info' } | null>(null);
  private toastTimeout?: any;

  showToast(text: string, type: 'error' | 'warning' | 'success' | 'info' = 'warning') {
    this.toastMessage.set({ text, type });
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.toastMessage.set(null);
    }, 4500); // 4.5 seconds auto-dismiss
  }

  closeToast() {
    this.toastMessage.set(null);
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
  }

  // Modal New Customer State
  isAddCustomerModalOpen = signal<boolean>(false);
  isSavingCust = signal<boolean>(false);
  newCustName = '';
  newCustPhone = '';
  newCustPincode = '';
  newCustCity = '';
  newCustAddress = '';;
  newCustBalType: 'due' | 'advance' = 'due';
  newCustBalAmount = 0;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.showCustomerDropdown.set(false);
      this.showProductDropdown.set(false);
    }
  }

  ngOnInit() {
    this.loadUsers();
    // Register DataService in NetworkService for auto-sync on reconnect
    this.networkService.registerDataService(this.dataService);
  }

  async loadUsers() {
    const list = await this.authService.getAllUsers();
    this.users.set(list);
  }

  onCustomerSearchChange(term: string) {
    this.customerSearchTerm.set(term);
    this.showCustomerDropdown.set(true);
    this.showProductDropdown.set(false);
  }

  onProductSearchChange(term: string) {
    this.productSearchTerm.set(term);
    this.showProductDropdown.set(true);
    this.showCustomerDropdown.set(false);
  }

  // Filtered lists
  filteredCustomers = computed(() => {
    const term = this.customerSearchTerm().trim().toLowerCase();
    if (!term) return this.users().slice(0, 30);
    return this.users().filter(u => 
      u.name.toLowerCase().includes(term) || 
      u.phone.includes(term) ||
      (u.address && u.address.toLowerCase().includes(term)) ||
      (u.pincode && u.pincode.includes(term))
    ).slice(0, 30);
  });

  filteredProducts = computed(() => {
    const term = this.productSearchTerm().trim().toLowerCase();
    const available = this.products().filter(p => (p.stock || 0) > 0 && p.status === 'active');
    if (!term) return available.slice(0, 50);
    return available.filter(p => 
      p.name.toLowerCase().includes(term) || 
      p.sku.toLowerCase().includes(term)
    ).slice(0, 50);
  });

  // Financial Calculations
  totalItemCount = computed(() => {
    return this.billItems().reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  });

  subTotal = computed(() => {
    return this.billItems().reduce((sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.sellingRate) || 0)), 0);
  });

  currentBillTotal = computed(() => {
    return this.subTotal() + (Number(this.badha()) || 0);
  });

  netPayable = computed(() => {
    const prev = this.selectedCustomer()?.balance || 0;
    return this.currentBillTotal() + prev;
  });

  hasInvalidItems = computed(() => {
    return this.billItems().some(item => !item.quantity || Number(item.quantity) <= 0 || item.sellingRate === '' || item.sellingRate === null || item.sellingRate === undefined || Number(item.sellingRate) < 0);
  });

  // Actions
  selectCustomer(cust: UserProfile) {
    this.selectedCustomer.set(cust);
    this.customerSearchTerm.set('');
    this.showCustomerDropdown.set(false);
    // Ready to select products
    this.showProductDropdown.set(true);
  }

  resetBill() {
    this.selectedCustomer.set(null);
    this.billItems.set([]);
    this.badha.set('' as any);
    this.billNotes.set('');
    this.customerSearchTerm.set('');
    this.productSearchTerm.set('');
    this.showCustomerDropdown.set(false);
    this.showProductDropdown.set(false);
  }

  addProductToBill(prod: Product) {
    if (!prod || (prod.stock || 0) <= 0 || prod.status !== 'active') {
      return;
    }
    const current = [...this.billItems()];
    const existingIndex = current.findIndex(item => item.product.id === prod.id);

    if (existingIndex > -1) {
      const existing = current[existingIndex];
      const currentQty = Number(existing.quantity) || 0;
      if (currentQty < existing.availableStock) {
        existing.quantity = currentQty + 1;
      } else {
        this.showToast(`Stock Limit Reached! Only ${existing.availableStock} units available for "${prod.name}". Cannot add more.`, 'warning');
        return;
      }
    } else {
      current.push({
        product: prod,
        quantity: '' as any, // Default empty so user directly enters value without backspacing
        availableStock: prod.stock,
        purchaseRate: prod.purchaseRate || 0,
        sellingRate: (prod.sellingRate !== null && prod.sellingRate !== undefined && prod.sellingRate > 0) ? prod.sellingRate : ('' as any)
      });
    }

    this.billItems.set(current);
    this.productSearchTerm.set('');
    // Keep product dropdown open so operator can add multiple items rapidly
  }

  removeItem(index: number) {
    const current = [...this.billItems()];
    current.splice(index, 1);
    this.billItems.set(current);
  }

  updateQty(index: number, val: any) {
    const strVal = String(val !== null && val !== undefined ? val : '');
    if (strVal.includes('-') || Number(strVal) < 0) {
      this.showToast('Negative numbers (-) are not allowed! Please enter a valid positive quantity.', 'error');
      const current = [...this.billItems()];
      current[index].quantity = '' as any;
      this.billItems.set(current);
      return;
    }

    if (strVal === '') {
      const current = [...this.billItems()];
      current[index].quantity = '' as any;
      this.billItems.set(current);
      return;
    }

    const num = parseInt(strVal, 10);
    if (isNaN(num) || num <= 0) {
      const current = [...this.billItems()];
      current[index].quantity = '' as any;
      this.billItems.set(current);
      return;
    }

    const current = [...this.billItems()];
    const max = current[index].availableStock;
    if (num > max) {
      this.showToast(`Stock Exceeded! Only ${max} units are available in stock for "${current[index].product.name}". Cannot add more than available stock.`, 'warning');
      current[index].quantity = max;
    } else {
      current[index].quantity = num;
    }
    this.billItems.set(current);
  }

  updateSellingRate(index: number, val: any) {
    const strVal = String(val !== null && val !== undefined ? val : '');
    if (strVal.includes('-') || Number(strVal) < 0) {
      this.showToast('Negative values (-) are not allowed! Please enter a valid positive selling rate.', 'error');
      const current = [...this.billItems()];
      current[index].sellingRate = '' as any;
      this.billItems.set(current);
      return;
    }

    if (strVal === '') {
      const current = [...this.billItems()];
      current[index].sellingRate = '' as any;
      this.billItems.set(current);
      return;
    }

    const num = parseFloat(strVal);
    if (isNaN(num) || num < 0) {
      const current = [...this.billItems()];
      current[index].sellingRate = '' as any;
      this.billItems.set(current);
      return;
    }

    const current = [...this.billItems()];
    current[index].sellingRate = num;
    this.billItems.set(current);
  }

  updateBadha(val: any) {
    const strVal = String(val !== null && val !== undefined ? val : '');
    if (strVal.includes('-') || Number(strVal) < 0) {
      this.showToast('Negative values (-) are not allowed in Freight / Badha charges! Please enter a valid positive amount.', 'error');
      this.badha.set('' as any);
      return;
    }

    if (strVal === '') {
      this.badha.set('' as any);
      return;
    }

    const num = parseFloat(strVal);
    if (isNaN(num) || num < 0) {
      this.badha.set('' as any);
      return;
    }

    this.badha.set(num);
  }

  preventNegativeInput(event: KeyboardEvent) {
    if (event.key === '-' || event.key === 'e' || event.key === 'E' || event.key === '+') {
      event.preventDefault();
      this.showToast('Negative symbols (-) and exponent notation are disabled. Please enter a positive number.', 'error');
    }
  }

  // Modal Handlers
  openAddCustomerModal() {
    this.newCustName = this.customerSearchTerm() || '';
    this.newCustPhone = '';
    this.newCustPincode = '';
    this.newCustCity = '';
    this.newCustAddress = '';
    this.newCustBalType = 'due';
    this.newCustBalAmount = 0;
    this.isAddCustomerModalOpen.set(true);
  }

  closeAddCustomerModal() {
    this.isAddCustomerModalOpen.set(false);
  }

  async submitNewCustomer() {
    if (!this.newCustName || !this.newCustPhone) return;
    const cleanPhone = this.newCustPhone.trim();

    // Check for duplicate phone number!
    const duplicate = this.users().find(u => u.phone === cleanPhone);
    if (duplicate) {
      this.showToast(`Restriction: Mobile number +91-${cleanPhone} is already registered as "${duplicate.name}". Please select them directly from the customer dropdown list!`, 'warning');
      return;
    }

    this.isSavingCust.set(true);
    try {
      let initialBal = this.newCustBalAmount || 0;
      if (this.newCustBalType === 'advance' && initialBal > 0) {
        initialBal = -initialBal; // Negative for advance credit
      }

      const fullAddress = [this.newCustAddress.trim(), this.newCustCity.trim()].filter(Boolean).join(', ');

      const newCust = await this.authService.createCustomerFromAdmin({
        name: this.newCustName,
        phone: cleanPhone,
        address: fullAddress,
        pincode: this.newCustPincode.trim(),
        balance: initialBal
      });

      await this.loadUsers();
      this.selectCustomer(newCust);
      this.closeAddCustomerModal();
    } catch (e) {
      console.error('Error adding customer:', e);
      this.showToast('Failed to add customer. Please check your internet connection and try again.', 'error');
    } finally {
      this.isSavingCust.set(false);
    }
  }

  // ─── Generate Bill & Print ────────────────────────────────────────────────
  async onGenerateBill() {
    const cust = this.selectedCustomer();
    if (!cust || this.billItems().length === 0) return;

    if (this.hasInvalidItems()) {
      this.showToast('Invalid Line Items! Please ensure every item in the table has a valid positive Quantity and Selling Rate.', 'error');
      return;
    }

    const isOnline = this.networkService.isOnline();

    if (isOnline) {
      await this._generateOnlineBill(cust);
    } else {
      await this._generateOfflineBill(cust);
    }
  }

  /** Online path: same as before — hits Firestore directly */
  private async _generateOnlineBill(cust: UserProfile) {
    this.isGenerating.set(true);
    try {
      const orderItems: OrderItem[] = this.billItems().map(item => ({
        productId: item.product.id,
        quantity: Number(item.quantity) || 0,
        purchaseRate: Number(item.purchaseRate) || 0,
        sellingRate: Number(item.sellingRate) || 0,
        total: (Number(item.quantity) || 0) * (Number(item.sellingRate) || 0)
      }));

      const createdOrder = await this.dataService.createAdminBill(
        {
          name: cust.name,
          phone: cust.phone,
          email: cust.email,
          address: cust.address || '',
          pincode: cust.pincode || '',
          uid: cust.uid
        },
        orderItems,
        {
          subTotal: this.subTotal(),
          badha: this.badha(),
          totalAmount: this.currentBillTotal(),
          previousBalance: cust.balance || 0,
          netPayable: this.netPayable()
        },
        this.billNotes()
      );

      // Trigger PDF generation (Pink Slip layout)
      this.invoiceService.generateInvoice(createdOrder, this.products());

      // Update local state
      this.lastGeneratedBillNumber.set(createdOrder.billNumber || createdOrder.id);
      this.lastBillWasOffline.set(false);
      this.showSuccessModal.set(true);
      
      // Refresh users list so balance updates locally
      await this.loadUsers();
      this.resetBill();
    } catch (error) {
      console.error('Failed to generate POS bill:', error);
      this.showToast('Bill generation failed! Please check your internet connection or try again.', 'error');
    } finally {
      this.isGenerating.set(false);
    }
  }

  /**
   * Offline path:
   * 1. Save bill to localStorage queue with temp ID
   * 2. Optimistically update local stock signal (so UI stays accurate)
   * 3. Generate PDF with OFFLINE-XXXX bill number
   * 4. Show success modal — user can keep working normally
   * 5. When internet comes back → NetworkService auto-syncs to Firestore
   */
  private async _generateOfflineBill(cust: UserProfile) {
    this.isGenerating.set(true);
    try {
      const offlineId = this.offlineSync.generateOfflineId();
      const orderItems: OrderItem[] = this.billItems().map(item => ({
        productId: item.product.id,
        quantity: Number(item.quantity) || 0,
        purchaseRate: Number(item.purchaseRate) || 0,
        sellingRate: Number(item.sellingRate) || 0,
        total: (Number(item.quantity) || 0) * (Number(item.sellingRate) || 0)
      }));

      const billingSummary = {
        subTotal: this.subTotal(),
        badha: Number(this.badha()) || 0,
        totalAmount: this.currentBillTotal(),
        previousBalance: cust.balance || 0,
        netPayable: this.netPayable()
      };

      // 1. Enqueue in local offline queue
      this.offlineSync.enqueue({
        offlineId,
        createdAt: new Date().toISOString(),
        customerData: {
          name: cust.name,
          phone: cust.phone,
          email: cust.email,
          address: cust.address || '',
          pincode: cust.pincode || '',
          uid: cust.uid
        },
        items: orderItems,
        billingSummary,
        notes: this.billNotes()
      });

      // 2. Optimistically deduct stock from local products signal
      //    so the next offline bill won't show wrong stock
      this._deductLocalStock(orderItems);

      // 3. Build a fake Order object for PDF generation with offline bill number
      const fakeOrder: any = {
        id: offlineId,
        billNumber: offlineId,
        customerName: cust.name,
        phone: cust.phone,
        address: cust.address || '',
        pincode: cust.pincode || '',
        date: new Date().toISOString(),
        items: orderItems,
        notes: this.billNotes(),
        ...billingSummary
      };

      // 4. Generate PDF normally (OFFLINE number will appear on slip)
      this.invoiceService.generateInvoice(fakeOrder, this.products());

      // 5. Show success modal
      this.lastGeneratedBillNumber.set(offlineId);
      this.lastBillWasOffline.set(true);
      this.showSuccessModal.set(true);

      this.resetBill();

    } catch (error) {
      console.error('[Offline] Failed to save offline bill:', error);
      this.showToast('Offline bill save failed! Please try again.', 'error');
    } finally {
      this.isGenerating.set(false);
    }
  }

  /**
   * Optimistically deduct stock from the in-memory products signal.
   * This prevents the operator from double-selling the same stock
   * in subsequent offline bills during the same offline session.
   */
  private _deductLocalStock(items: OrderItem[]) {
    const currentProducts = [...this.products()];
    let changed = false;

    for (const item of items) {
      const prodIndex = currentProducts.findIndex(p => p.id === item.productId);
      if (prodIndex !== -1) {
        const currentStock = currentProducts[prodIndex].stock || 0;
        currentProducts[prodIndex] = {
          ...currentProducts[prodIndex],
          stock: Math.max(0, currentStock - item.quantity)
        };
        changed = true;
      }
    }

    if (changed) {
      // Update the products signal so the product search shows correct stock immediately
      this.dataService.products.set(currentProducts);
    }
  }
}
