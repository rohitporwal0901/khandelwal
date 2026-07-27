import { Component, inject, signal, computed, OnInit, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService, Product, OrderItem, Order } from '../../core/services/data.service';
import { AuthService, UserProfile } from '../../core/services/auth.service';
import { InvoiceService } from '../../core/services/invoice.service';

interface BillGridItem {
  product: Product;
  quantity: number;
  availableStock: number;
  purchaseRate: number;
  sellingRate: number;
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
  badha = signal<number>(0);
  billNotes = signal<string>('');

  isGenerating = signal<boolean>(false);
  showSuccessModal = signal<boolean>(false);
  lastGeneratedBillNumber = signal<string>('');

  // Modal New Customer State
  isAddCustomerModalOpen = signal<boolean>(false);
  isSavingCust = signal<boolean>(false);
  newCustName = '';
  newCustPhone = '';
  newCustPincode = '';
  newCustCity = '';
  newCustAddress = '';
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
    return this.billItems().reduce((sum, item) => sum + item.quantity, 0);
  });

  subTotal = computed(() => {
    return this.billItems().reduce((sum, item) => sum + (item.quantity * item.sellingRate), 0);
  });

  currentBillTotal = computed(() => {
    return this.subTotal() + (this.badha() || 0);
  });

  netPayable = computed(() => {
    const prev = this.selectedCustomer()?.balance || 0;
    return this.currentBillTotal() + prev;
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
    this.badha.set(0);
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
      if (existing.quantity < existing.availableStock) {
        existing.quantity += 1;
      }
    } else {
      current.push({
        product: prod,
        quantity: 1,
        availableStock: prod.stock,
        purchaseRate: prod.purchaseRate || 0,
        sellingRate: prod.sellingRate || 0
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
    const num = parseInt(val, 10) || 1;
    const current = [...this.billItems()];
    const max = current[index].availableStock;
    current[index].quantity = Math.min(Math.max(1, num), max > 0 ? max : 1);
    this.billItems.set(current);
  }

  updateSellingRate(index: number, val: any) {
    const num = parseFloat(val) || 0;
    const current = [...this.billItems()];
    current[index].sellingRate = Math.max(0, num);
    this.billItems.set(current);
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
      alert(`⚠️ Restriction: Mobile number +91-${cleanPhone} is already registered as "${duplicate.name}".\n\nPlease select them directly from the customer dropdown list!`);
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
    } finally {
      this.isSavingCust.set(false);
    }
  }

  // Generate Bill & Print
  async onGenerateBill() {
    const cust = this.selectedCustomer();
    if (!cust || this.billItems().length === 0) return;

    this.isGenerating.set(true);
    try {
      const orderItems: OrderItem[] = this.billItems().map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        purchaseRate: item.purchaseRate,
        sellingRate: item.sellingRate,
        total: item.quantity * item.sellingRate
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
      this.showSuccessModal.set(true);
      
      // Refresh users list so balance updates locally
      await this.loadUsers();
      this.resetBill();
    } catch (error) {
      console.error('Failed to generate POS bill:', error);
    } finally {
      this.isGenerating.set(false);
    }
  }
}
