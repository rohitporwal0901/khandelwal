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
  template: `
    <div class="billing-page">
      <!-- Top Header -->
      <div class="page-header flex-align justify-between mb-4 pb-3 border-bottom-sharp">
        <div class="header-title flex-align">
          <div class="icon-box mr-3">
            <span class="material-symbols-outlined">point_of_sale</span>
          </div>
          <div>
            <h1 class="text-xl font-bold mb-1 text-slate-900">POS Billing & Wholesale Invoicing</h1>
            <p class="text-xs text-slate-500 mb-0 font-medium">Fast 6-6 Side-by-Side Selector • Automatic Inventory Deduction • Pink Slip Estimate Generation</p>
          </div>
        </div>
        <div class="header-actions flex-align gap-3">
          <button class="btn-secondary flex-align" (click)="resetBill()" title="Clear Form & Reset">
            <span class="material-symbols-outlined mr-1 text-sm">refresh</span> Reset Bill
          </button>
          <button class="btn-primary flex-align" (click)="openAddCustomerModal()">
            <span class="material-symbols-outlined mr-1 text-sm">person_add</span> + Add New Customer
          </button>
        </div>
      </div>

      <!-- Top Section: 6-6 Equal Columns Grid (50% - 50% for Customer and Product Selection) -->
      <div class="grid-6-6 mb-4">
        <!-- Column 1 (Left): Customer Selection Card -->
        <div class="card-sharp" (click)="$event.stopPropagation()">
          <div class="card-header flex-align justify-between mb-3">
            <div class="flex-align">
              <span class="step-pill mr-2">STEP 1</span>
              <h3 class="card-title mb-0">Customer Selection</h3>
            </div>
            <div>
              <button *ngIf="!selectedCustomer()" class="btn-link-sharp" (click)="openAddCustomerModal(); showCustomerDropdown.set(false)">
                + Register New Customer
              </button>
              <span *ngIf="selectedCustomer()" class="badge-sharp badge-success">Active Member</span>
            </div>
          </div>

          <!-- Search Input -->
          <div class="search-box-sharp" *ngIf="!selectedCustomer()">
            <span class="material-symbols-outlined search-icon">person_search</span>
            <input type="text" 
                   placeholder="Search member by mobile, business name, or city..." 
                   [ngModel]="customerSearchTerm()" 
                   (ngModelChange)="onCustomerSearchChange($event)"
                   (focus)="showCustomerDropdown.set(true); showProductDropdown.set(false)"
                   class="search-input">
            <button class="btn-clear" *ngIf="customerSearchTerm()" (click)="customerSearchTerm.set(''); showCustomerDropdown.set(true)">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <!-- Floating Customer Dropdown Menu -->
          <div class="dropdown-menu-sharp" *ngIf="showCustomerDropdown() && !selectedCustomer()">
            <div class="dropdown-header flex-align justify-between">
              <span>Wholesale Members ({{ filteredCustomers().length }})</span>
              <button class="btn-close-mini" (click)="showCustomerDropdown.set(false)">Close</button>
            </div>
            <div class="dropdown-list">
              <div class="dropdown-item-row" *ngFor="let cust of filteredCustomers()" (click)="selectCustomer(cust)">
                <div class="item-info">
                  <strong class="text-slate-800 d-block">{{ cust.name }}</strong>
                  <div class="flex-align gap-2 mt-1">
                    <span class="phone-badge">+91 {{ cust.phone }}</span>
                    <span class="text-xs text-slate-500" *ngIf="cust.address || cust.pincode">
                      {{ cust.address }} {{ cust.pincode ? '(Pin: ' + cust.pincode + ')' : '' }}
                    </span>
                  </div>
                </div>
                <div class="item-badge">
                  <span *ngIf="(cust.balance || 0) > 0" class="badge-sharp badge-danger">Due: ₹{{ cust.balance }}</span>
                  <span *ngIf="(cust.balance || 0) < 0" class="badge-sharp badge-success">Adv: ₹{{ Math.abs(cust.balance || 0) }} CR</span>
                  <span *ngIf="!(cust.balance)" class="badge-sharp badge-neutral">No Balance</span>
                </div>
              </div>
              <div class="empty-list-msg" *ngIf="filteredCustomers().length === 0">
                No wholesale member found for "{{ customerSearchTerm() }}". 
                <a href="javascript:void(0)" class="d-block mt-1 font-bold text-maroon" (click)="openAddCustomerModal(); showCustomerDropdown.set(false)">+ Register New Customer</a>
              </div>
            </div>
          </div>

          <!-- Selected Customer Compact Banner -->
          <div class="selected-customer-banner" *ngIf="selectedCustomer() as cust">
            <div class="flex-align gap-3">
              <div class="avatar-box">{{ cust.name.charAt(0) | uppercase }}</div>
              <div>
                <h4 class="text-slate-900 font-bold mb-1">{{ cust.name }}</h4>
                <div class="flex-align gap-2">
                  <span class="phone-badge">+91 {{ cust.phone }}</span>
                  <span class="pin-badge" *ngIf="cust.pincode">PIN: {{ cust.pincode }}</span>
                </div>
                <p class="text-xs text-slate-500 mb-0 mt-1" *ngIf="cust.address">{{ cust.address }}</p>
              </div>
            </div>
            
            <div class="text-right">
              <span class="text-xxs text-slate-400 uppercase font-bold d-block mb-1">Current Account</span>
              <div *ngIf="(cust.balance || 0) > 0">
                <strong class="text-danger font-bold text-lg d-block">₹{{ cust.balance | number:'1.2-2' }}</strong>
                <span class="text-xxs font-bold text-danger">Old Due (पुराना बकाया)</span>
              </div>
              <div *ngIf="(cust.balance || 0) < 0">
                <strong class="text-success font-bold text-lg d-block">₹{{ Math.abs(cust.balance || 0) | number:'1.2-2' }} CR</strong>
                <span class="text-xxs font-bold text-success">Advance (अग्रिम राशि)</span>
              </div>
              <div *ngIf="!(cust.balance)">
                <strong class="text-slate-500 font-bold text-lg d-block">₹0.00</strong>
                <span class="text-xxs font-bold text-slate-400">Clear Account</span>
              </div>
              <button class="btn-change-sharp mt-2" (click)="selectedCustomer.set(null); showCustomerDropdown.set(true)">
                <span class="material-symbols-outlined mr-1 text-xs">swap_horiz</span> Change
              </button>
            </div>
          </div>
        </div>

        <!-- Column 2 (Right): Product Catalog Card -->
        <div class="card-sharp" [class.disabled-section]="!selectedCustomer()" (click)="$event.stopPropagation()">
          <div class="card-header flex-align justify-between mb-3">
            <div class="flex-align">
              <span class="step-pill mr-2">STEP 2</span>
              <h3 class="card-title mb-0">Add Products to Bill</h3>
            </div>
            <span class="text-xs text-slate-500 font-medium">{{ filteredProducts().length }} items ready</span>
          </div>

          <!-- Search Input -->
          <div class="search-box-sharp">
            <span class="material-symbols-outlined search-icon">qr_code_scanner</span>
            <input type="text" 
                   placeholder="Search card by Name or SKU Code (e.g. MOCK-1001)..." 
                   [ngModel]="productSearchTerm()" 
                   (ngModelChange)="onProductSearchChange($event)"
                   (focus)="showProductDropdown.set(true); showCustomerDropdown.set(false)"
                   [disabled]="!selectedCustomer()"
                   class="search-input">
            <button class="btn-clear" *ngIf="productSearchTerm()" (click)="productSearchTerm.set(''); showProductDropdown.set(true)">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <!-- Floating Product Catalog Menu -->
          <div class="dropdown-menu-sharp" *ngIf="showProductDropdown() && selectedCustomer()">
            <div class="dropdown-header flex-align justify-between">
              <span>Click product to add to bill table ({{ filteredProducts().length }})</span>
              <button class="btn-close-mini" (click)="showProductDropdown.set(false)">Close</button>
            </div>
            <div class="dropdown-list">
              <div class="dropdown-item-row" *ngFor="let prod of filteredProducts()" (click)="addProductToBill(prod)">
                <div class="flex-align gap-3 flex-1 min-w-0">
                  <div class="prod-thumb">
                    <img *ngIf="prod.images && prod.images.length > 0" [src]="prod.images[0]" alt="Img">
                    <span *ngIf="!prod.images || prod.images.length === 0" class="material-symbols-outlined text-slate-400">image</span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <strong class="text-slate-800 d-block text-sm truncate font-bold">{{ prod.name }}</strong>
                    <div class="flex-align gap-2 mt-1">
                      <span class="sku-badge">{{ prod.sku }}</span>
                      <span class="stock-badge" [class.stock-danger]="prod.stock < 10">Stock: {{ prod.stock }}</span>
                    </div>
                  </div>
                </div>
                
                <div class="flex-align gap-3">
                  <div class="text-right">
                    <div class="text-xxs text-slate-400 font-bold">RATE (₹)</div>
                    <div class="flex-align gap-1 mt-1">
                      <span class="rate-pill-buy" title="Cost Price">Buy ₹{{ prod.purchaseRate || 0 | number:'1.0-2' }}</span>
                      <span class="rate-pill-sell" title="Default Selling Price">Sell ₹{{ prod.sellingRate || 0 | number:'1.0-2' }}</span>
                    </div>
                  </div>
                  <button class="btn-add-icon" title="Add to Bill Table">
                    <span class="material-symbols-outlined">add_circle</span>
                  </button>
                </div>
              </div>
              <div class="empty-list-msg" *ngIf="filteredProducts().length === 0">
                No matching product card found for "{{ productSearchTerm() }}".
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Section (Full Width 100%): Main Billing Table & Estimate Breakdown -->
      <div class="card-sharp" [class.disabled-section]="!selectedCustomer()">
        <!-- Workspace Header -->
        <div class="flex-align justify-between pb-3 mb-4 border-bottom-sharp">
          <div class="flex-align">
            <span class="step-pill mr-2">STEP 3</span>
            <div>
              <h3 class="card-title mb-1">Bill Line Items & Wholesale Estimate Breakdown</h3>
              <p class="text-xs text-slate-500 mb-0 font-medium">Review quantities, customize rates, add Badha freight, and generate instant invoice</p>
            </div>
          </div>
          <div class="flex-align gap-3">
            <span class="badge-sharp badge-primary font-bold px-3 py-1">{{ billItems().length }} Cards Added</span>
            <button class="btn-secondary text-xs py-1 px-3" *ngIf="billItems().length > 0" (click)="billItems.set([])" title="Clear table items">
              Clear Table
            </button>
          </div>
        </div>

        <!-- Full-Width Sharp Table -->
        <div class="table-container-sharp mb-5">
          <table class="table-sharp">
            <thead>
              <tr>
                <th class="col-num">#</th>
                <th class="col-desc">PRODUCT DESCRIPTION & SKU</th>
                <th class="col-avail text-center">AVAIL</th>
                <th class="col-qty text-center">ADD QTY</th>
                <th class="col-rate text-right">SELLING RATE (₹)</th>
                <th class="col-amt text-right">AMOUNT (₹)</th>
                <th class="col-act text-center"></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of billItems(); let i = index">
                <td class="text-center font-bold text-slate-400 text-xs">{{ i + 1 }}</td>
                <td>
                  <div class="font-bold text-slate-900 text-sm">{{ item.product.name }}</div>
                  <div class="flex-align gap-2 mt-1">
                    <span class="sku-badge text-xxs">SKU: {{ item.product.sku }}</span>
                    <span class="rate-pill-buy text-xxs">Cost Reference: ₹{{ item.purchaseRate | number:'1.2-2' }}</span>
                  </div>
                </td>
                <td class="text-center">
                  <span class="badge-sharp" [class.badge-warning]="item.availableStock <= 5" [class.badge-success]="item.availableStock > 5">
                    {{ item.availableStock }}
                  </span>
                </td>
                <td>
                  <div class="flex-align justify-center gap-1">
                    <input type="number" 
                           class="input-table-qty" 
                           [ngModel]="item.quantity" 
                           (ngModelChange)="updateQty(i, $event)"
                           min="1" [max]="item.availableStock">
                    <span class="text-xs font-bold text-slate-500">Pcs</span>
                  </div>
                </td>
                <td class="text-right">
                  <div class="flex-align justify-end gap-1">
                    <span class="text-xs text-slate-400 font-bold">₹</span>
                    <input type="number" 
                           class="input-table-rate" 
                           [ngModel]="item.sellingRate" 
                           (ngModelChange)="updateSellingRate(i, $event)"
                           step="0.01" min="0">
                  </div>
                </td>
                <td class="text-right font-bold text-slate-900 text-base">
                  ₹{{ (item.quantity * item.sellingRate) | number:'1.2-2' }}
                </td>
                <td class="text-center">
                  <button class="btn-delete-sharp" (click)="removeItem(i)" title="Remove Item">
                    <span class="material-symbols-outlined text-base">delete</span>
                  </button>
                </td>
              </tr>
              <tr *ngIf="billItems().length === 0">
                <td colspan="7" class="empty-table-state">
                  <div class="empty-icon-wrap mb-2">
                    <span class="material-symbols-outlined text-4xl text-slate-300">receipt_long</span>
                  </div>
                  <div class="font-bold text-slate-600 mb-1">No cards added to bill table yet</div>
                  <p class="text-xs text-slate-400 mb-0">Use the search box in STEP 2 above to select and add products to this estimate.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 2-Column Footer Grid (Left: Notes & Print Action | Right: Wholesale Financial Estimate Box) -->
        <div class="grid-footer-2col pt-4 border-top-sharp">
          <!-- Left Column: Delivery Instructions & Generate Button -->
          <div class="footer-actions-left flex flex-col justify-between">
            <div>
              <div class="form-group mb-4">
                <label class="label-sharp mb-2 d-block">Bill Note / Delivery Instruction (Optional):</label>
                <input type="text" class="input-sharp w-100" placeholder="e.g. Under Nagda Jurisdiction / Transport delivery via Indore..." [ngModel]="billNotes()" (ngModelChange)="billNotes.set($event)">
              </div>

              <div class="info-banner-sharp mb-4">
                <div class="flex-align gap-3">
                  <span class="material-symbols-outlined text-maroon text-2xl">verified</span>
                  <div>
                    <strong class="text-slate-900 text-xs d-block mb-1">Authentic Wholesale Estimate (KH001 Counter)</strong>
                    <p class="text-xxs text-slate-600 mb-0 leading-normal">Generating this invoice will instantly deduct product stock in real-time and download the official Pink Slip PDF estimate.</p>
                  </div>
                </div>
              </div>
            </div>

            <button class="btn-generate-sharp w-100" 
                    [disabled]="!selectedCustomer() || billItems().length === 0 || isGenerating()" 
                    (click)="onGenerateBill()">
              <span *ngIf="!isGenerating()" class="flex-align justify-center gap-2">
                <span class="material-symbols-outlined">print</span> 
                <span>Generate Bill, Deduct Stock & Print Estimate</span>
              </span>
              <span *ngIf="isGenerating()" class="flex-align justify-center gap-2">
                <span class="spinner-border"></span> 
                <span>Generating KH001 Invoice...</span>
              </span>
            </button>
          </div>

          <!-- Right Column: Sharp Wholesale Financial Estimate Breakdown Panel -->
          <div class="summary-panel-sharp">
            <div class="summary-panel-header flex-align justify-between pb-3 mb-3 border-bottom-sharp">
              <span class="font-bold text-xs uppercase tracking-wider text-slate-600 flex-align gap-1">
                <span class="material-symbols-outlined text-base text-maroon">calculate</span> Financial Estimate Breakdown
              </span>
              <span class="badge-sharp badge-neutral text-xxs">Wholesale Rates</span>
            </div>
            
            <div class="summary-panel-body">
              <!-- Total Quantities -->
              <div class="summary-line">
                <span class="line-label">Total Item Quantity:</span>
                <span class="line-val font-bold text-slate-700">{{ totalItemCount() }} Pcs</span>
              </div>

              <!-- Products Subtotal -->
              <div class="summary-line">
                <span class="line-label">Products Subtotal:</span>
                <span class="line-val font-bold text-slate-900">₹{{ subTotal() | number:'1.2-2' }}</span>
              </div>

              <!-- Badha / Freight Input Row (Sharp & Clean, NOT in a bulky yellow box) -->
              <div class="summary-line-badha my-2 py-2 px-3">
                <span class="line-label flex-align gap-1 font-bold text-amber-800 text-xs">
                  <span class="material-symbols-outlined text-base text-amber-600">local_shipping</span> 
                  Badha (भाड़ा / Freight Charges):
                </span>
                <div class="badha-input-group flex-align">
                  <span class="prefix text-xs font-bold text-slate-400">₹</span>
                  <input type="number" 
                         class="badha-input" 
                         [ngModel]="badha()" 
                         (ngModelChange)="badha.set($event || 0)"
                         placeholder="0.00" step="1" min="0">
                </div>
              </div>

              <!-- Current Bill Amount (Balance) -->
              <div class="summary-line pt-2 mt-1 border-top-sharp">
                <span class="line-label font-bold text-slate-800">Current Bill Amount (Balance):</span>
                <span class="line-val font-bold text-slate-900 text-base">₹{{ currentBillTotal() | number:'1.2-2' }}</span>
              </div>

              <!-- Old Due / Advance Balance -->
              <div class="summary-line" *ngIf="selectedCustomer() as cust">
                <span class="line-label font-medium text-slate-600" *ngIf="(cust.balance || 0) >= 0">
                  Old Balance (पुराना बकाया):
                </span>
                <span class="line-label font-medium text-emerald-700" *ngIf="(cust.balance || 0) < 0">
                  Advance Balance (अग्रिम राशि जमा):
                </span>
                <span class="line-val font-bold" [class.text-danger]="(cust.balance || 0) > 0" [class.text-success]="(cust.balance || 0) < 0">
                  <ng-container *ngIf="(cust.balance || 0) >= 0">₹{{ cust.balance || 0 | number:'1.2-2' }}</ng-container>
                  <ng-container *ngIf="(cust.balance || 0) < 0">- ₹{{ Math.abs(cust.balance || 0) | number:'1.2-2' }} (CR)</ng-container>
                </span>
              </div>

              <div class="divider-line-sharp my-3"></div>

              <!-- Grand Total Balance -->
              <div class="summary-line grand-total-line py-1">
                <span class="line-label font-extrabold text-slate-900 text-sm">Grand Total Balance (कुल देय राशि):</span>
                <span class="line-val font-extrabold text-maroon text-2xl tracking-tight">₹{{ netPayable() | number:'1.2-2' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- + Register New Wholesale Customer Modal -->
    <div class="modal-overlay" *ngIf="isAddCustomerModalOpen()" (click)="closeAddCustomerModal()">
      <div class="modal-card" (click)="$event.stopPropagation()">
        <div class="modal-header flex-align justify-between">
          <h3 class="flex-align gap-2 mb-0 text-slate-900 font-bold text-base">
            <span class="material-symbols-outlined text-maroon">person_add</span> Register Wholesale Customer
          </h3>
          <button class="btn-close-mini" (click)="closeAddCustomerModal()">
            <span class="material-symbols-outlined text-base">close</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="info-banner-sharp mb-4">
            <div class="flex-align gap-2">
              <span class="material-symbols-outlined text-maroon text-lg">info</span>
              <span class="text-xs text-slate-700 font-medium">Mobile number must be unique. Duplicate numbers are restricted.</span>
            </div>
          </div>

          <div class="form-group mb-3">
            <label class="label-sharp mb-1 d-block">Business / Customer Name <span class="text-danger">*</span></label>
            <input type="text" class="input-sharp w-100" [(ngModel)]="newCustName" placeholder="e.g. M/S Alankar (Abhi Enterprises)">
          </div>

          <div class="form-group mb-3">
            <label class="label-sharp mb-1 d-block">Mobile Number (10 Digits) <span class="text-danger">*</span></label>
            <div class="input-group-sharp">
              <span class="prefix">+91</span>
              <input type="text" class="input-sharp flex-1" [(ngModel)]="newCustPhone" placeholder="9826474254" maxlength="10">
            </div>
          </div>

          <div class="grid-2-col mb-3">
            <div class="form-group">
              <label class="label-sharp mb-1 d-block">PIN Code (6 Digits)</label>
              <input type="text" class="input-sharp w-100" [(ngModel)]="newCustPincode" placeholder="e.g. 456335" maxlength="6">
            </div>
            <div class="form-group">
              <label class="label-sharp mb-1 d-block">City / Town</label>
              <input type="text" class="input-sharp w-100" [(ngModel)]="newCustCity" placeholder="e.g. Nagda / Mahidpur">
            </div>
          </div>

          <div class="form-group mb-3">
            <label class="label-sharp mb-1 d-block">Complete Street Address</label>
            <textarea class="input-sharp w-100" [(ngModel)]="newCustAddress" rows="2" placeholder="e.g. 121, Ram Sahay Marg, Nagda"></textarea>
          </div>

          <div class="form-group mb-2">
            <label class="label-sharp mb-2 d-block">Initial Account Balance (Optional)</label>
            <div class="flex-align gap-4 mb-2">
              <label class="radio-label flex-align gap-1 font-bold text-xs text-danger cursor-pointer">
                <input type="radio" name="balType" [(ngModel)]="newCustBalType" value="due"> Old Due (पुराना बकाया)
              </label>
              <label class="radio-label flex-align gap-1 font-bold text-xs text-success cursor-pointer">
                <input type="radio" name="balType" [(ngModel)]="newCustBalType" value="advance"> Advance Credit (अग्रिम राशि)
              </label>
            </div>
            <div class="input-group-sharp">
              <span class="prefix">₹</span>
              <input type="number" class="input-sharp flex-1" [(ngModel)]="newCustBalAmount" placeholder="0.00" min="0">
            </div>
          </div>
        </div>
        <div class="modal-footer flex-align justify-end gap-3">
          <button class="btn-secondary text-xs" (click)="closeAddCustomerModal()" [disabled]="isSavingCust()">Cancel</button>
          <button class="btn-primary text-xs" (click)="submitNewCustomer()" [disabled]="!newCustName || !newCustPhone || isSavingCust()">
            <span *ngIf="!isSavingCust()">Save & Auto-Select</span>
            <span *ngIf="isSavingCust()">Checking & Saving...</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Success Animation Modal -->
    <div class="modal-overlay" *ngIf="showSuccessModal()">
      <div class="success-modal-card">
        <div class="success-icon-wrap mb-3">
          <span class="material-symbols-outlined text-6xl text-success">check_circle</span>
        </div>
        <h3 class="text-slate-900 font-extrabold text-xl mb-2">Estimate Generated!</h3>
        <p class="text-slate-500 text-sm mb-4">Invoice <strong class="text-slate-800">{{ lastGeneratedBillNumber() }}</strong> created successfully. Stock deducted and Pink Slip PDF downloaded.</p>
        <button class="btn-primary w-100 text-sm py-3" (click)="showSuccessModal.set(false)">Create Another Bill</button>
      </div>
    </div>
  `,
  styles: [`
    * { box-sizing: border-box; }

    :host {
      --primary: #800000;
      --primary-hover: #660000;
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

    .billing-page {
      padding: 1.5rem 2.25rem;
      max-width: 1650px;
      margin: 0 auto;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: var(--slate-800);
    }

    /* Sharp Borders & Utilities */
    .border-bottom-sharp { border-bottom: 1px solid var(--slate-200); }
    .border-top-sharp { border-top: 1px solid var(--slate-200); }
    .divider-line-sharp { height: 1px; background-color: var(--slate-200); width: 100%; }

    .flex-align { display: flex; align-items: center; }
    .justify-between { justify-content: space-between; }
    .justify-center { justify-content: center; }
    .justify-end { justify-content: flex-end; }
    .flex-1 { flex: 1; }
    .flex-col { flex-direction: column; }
    .min-w-0 { min-width: 0; }
    .w-100 { width: 100%; }
    .d-block { display: block; }

    .gap-1 { gap: 0.25rem; } .gap-2 { gap: 0.5rem; } .gap-3 { gap: 0.75rem; } .gap-4 { gap: 1rem; }
    .mr-1 { margin-right: 0.25rem; } .mr-2 { margin-right: 0.5rem; } .mr-3 { margin-right: 0.75rem; }
    .mb-0 { margin-bottom: 0; } .mb-1 { margin-bottom: 0.25rem; } .mb-2 { margin-bottom: 0.5rem; } .mb-3 { margin-bottom: 0.75rem; } .mb-4 { margin-bottom: 1rem; } .mb-5 { margin-bottom: 1.25rem; }
    .mt-1 { margin-top: 0.25rem; } .mt-2 { margin-top: 0.5rem; } .mt-3 { margin-top: 0.75rem; } .mt-4 { margin-top: 1rem; }
    .pb-3 { padding-bottom: 0.75rem; } .pt-2 { padding-top: 0.5rem; } .pt-3 { padding-top: 0.75rem; } .pt-4 { padding-top: 1rem; }
    .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; } .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; } .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
    .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }

    .text-xxs { font-size: 0.7rem; }
    .text-xs { font-size: 0.75rem; }
    .text-sm { font-size: 0.85rem; }
    .text-base { font-size: 0.95rem; }
    .text-lg { font-size: 1.125rem; }
    .text-xl { font-size: 1.35rem; }
    .text-2xl { font-size: 1.6rem; }
    .text-4xl { font-size: 2.25rem; }
    .text-6xl { font-size: 3.75rem; }

    .font-medium { font-weight: 500; }
    .font-bold { font-weight: 700; }
    .font-extrabold { font-weight: 800; }
    .tracking-wider { letter-spacing: 0.05em; }
    .tracking-tight { letter-spacing: -0.025em; }
    .uppercase { text-transform: uppercase; }
    .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .text-maroon { color: var(--primary); }
    .text-danger { color: #dc2626; }
    .text-success { color: #16a34a; }
    .text-slate-400 { color: var(--slate-400); }
    .text-slate-500 { color: var(--slate-500); }
    .text-slate-600 { color: var(--slate-600); }
    .text-slate-700 { color: var(--slate-700); }
    .text-slate-800 { color: var(--slate-800); }
    .text-slate-900 { color: var(--slate-900); }
    .text-amber-600 { color: #d97706; }
    .text-amber-800 { color: #92400e; }
    .text-emerald-700 { color: #047857; }

    .cursor-pointer { cursor: pointer; }

    /* Header Icons & Buttons */
    .icon-box {
      width: 44px; height: 44px; border-radius: 10px; background: #fef2f2; color: var(--primary); display: flex; align-items: center; justify-content: center; border: 1px solid #fecaca;
      .material-symbols-outlined { font-size: 1.6rem; }
    }

    .btn-primary {
      background: var(--primary); color: white; border: none; padding: 0 16px; height: 40px; border-radius: 8px; font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: all 0.15s ease; box-shadow: 0 2px 4px rgba(128,0,0,0.15);
      &:hover { background: var(--primary-hover); transform: translateY(-1px); box-shadow: 0 4px 8px rgba(128,0,0,0.25); }
      &:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }
    }

    .btn-secondary {
      background: var(--slate-100); color: var(--slate-700); border: 1px solid var(--slate-200); padding: 0 14px; height: 40px; border-radius: 8px; font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: all 0.15s ease;
      &:hover { background: var(--slate-200); color: var(--slate-900); }
    }

    .btn-link-sharp {
      background: none; border: none; color: var(--primary); font-weight: 700; font-size: 0.8rem; cursor: pointer; padding: 0;
      &:hover { text-decoration: underline; }
    }

    /* Sharp Cards */
    .card-sharp {
      background: #ffffff;
      border: 1px solid var(--slate-200);
      border-radius: 12px;
      padding: 1.25rem 1.5rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.02);
      position: relative;
    }

    .card-title {
      font-size: 1.05rem; font-weight: 700; color: var(--slate-900);
    }

    .step-pill {
      background: #fef2f2; color: var(--primary); border: 1px solid #fecaca; font-size: 0.68rem; font-weight: 800; padding: 2px 8px; border-radius: 6px; letter-spacing: 0.05em;
    }

    .badge-sharp {
      display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 6px; font-size: 0.72rem; font-weight: 700;
      &.badge-primary { background: #fef2f2; color: var(--primary); border: 1px solid #fecaca; }
      &.badge-success { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
      &.badge-danger { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
      &.badge-warning { background: #fffbeb; color: #d97706; border: 1px solid #fde68a; }
      &.badge-neutral { background: var(--slate-100); color: var(--slate-600); border: 1px solid var(--slate-200); }
    }

    .disabled-section {
      opacity: 0.55; pointer-events: none; filter: grayscale(0.15);
    }

    /* Grid Layouts */
    .grid-6-6 {
      display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; align-items: start; position: relative; z-index: 100;
    }

    @media (max-width: 1150px) {
      .grid-6-6 { grid-template-columns: 1fr; }
    }

    /* Search Input Boxes (Sharp & Sleek) */
    .search-box-sharp {
      position: relative; display: flex; align-items: center;
      .search-icon { position: absolute; left: 14px; color: var(--slate-400); font-size: 1.25rem; }
      .search-input {
        width: 100%; height: 44px; padding-left: 42px; padding-right: 38px; border-radius: 8px; border: 1px solid var(--slate-300); background: var(--slate-50); font-size: 0.88rem; font-weight: 500; color: var(--slate-900); transition: all 0.15s ease;
        &:focus { border-color: var(--primary); background: #ffffff; box-shadow: 0 0 0 3px rgba(128, 0, 0, 0.08); outline: none; }
      }
      .btn-clear {
        position: absolute; right: 10px; background: none; border: none; color: var(--slate-400); cursor: pointer; padding: 4px; border-radius: 4px; display: flex; align-items: center;
        &:hover { background: var(--slate-200); color: var(--slate-700); }
      }
    }

    /* Dropdown Menus (Floating over layout) */
    .dropdown-menu-sharp {
      position: absolute; top: calc(100% + 6px); left: 0; width: 100%; background: white; border: 1px solid var(--slate-300); border-radius: 10px; box-shadow: 0 15px 35px rgba(0, 0, 0, 0.15); z-index: 500; max-height: 380px; display: flex; flex-direction: column; overflow: hidden;
      .dropdown-header {
        padding: 0.65rem 1rem; background: var(--slate-50); border-bottom: 1px solid var(--slate-200); font-size: 0.72rem; font-weight: 700; color: var(--slate-500); text-transform: uppercase; letter-spacing: 0.05em;
        .btn-close-mini { background: none; border: 1px solid var(--slate-300); border-radius: 4px; padding: 1px 6px; font-size: 0.7rem; font-weight: 700; color: var(--slate-600); cursor: pointer; &:hover { background: #fee2e2; color: #dc2626; border-color: #fecaca; } }
      }
      .dropdown-list {
        overflow-y: auto; padding: 6px;
        .dropdown-item-row {
          display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0.85rem; margin-bottom: 4px; border-radius: 8px; border: 1px solid transparent; cursor: pointer; transition: all 0.12s ease;
          &:hover { background: #fdfafb; border-color: rgba(128, 0, 0, 0.2); }
          .phone-badge { background: var(--slate-100); color: var(--slate-700); padding: 1px 6px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
        }
        .empty-list-msg { padding: 1.5rem 1rem; text-align: center; color: var(--slate-500); font-size: 0.85rem; }
      }
    }

    /* Product catalog specific item styling */
    .prod-thumb {
      width: 42px; height: 42px; border-radius: 6px; overflow: hidden; background: var(--slate-100); display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid var(--slate-200);
      img { width: 100%; height: 100%; object-fit: cover; }
    }
    .sku-badge { background: #f0f9ff; color: #0369a1; padding: 1px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 600; border: 1px solid #bae6fd; }
    .stock-badge { background: #f0fdf4; color: #15803d; padding: 1px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 600; border: 1px solid #bbf7d0; &.stock-danger { background: #fef2f2; color: #dc2626; border-color: #fecaca; } }
    .rate-pill-buy { background: var(--slate-100); color: var(--slate-600); border: 1px solid var(--slate-200); padding: 1px 6px; border-radius: 4px; font-size: 0.72rem; font-weight: 600; }
    .rate-pill-sell { background: #ecfdf5; color: #047857; border: 1px solid #6ee7b7; padding: 1px 6px; border-radius: 4px; font-size: 0.75rem; font-weight: 700; }
    .btn-add-icon { background: none; border: none; color: var(--primary); cursor: pointer; padding: 2px; display: flex; align-items: center; transition: transform 0.15s ease; &:hover { transform: scale(1.15); } .material-symbols-outlined { font-size: 1.6rem; } }

    /* Selected Customer Banner */
    .selected-customer-banner {
      display: flex; justify-content: space-between; align-items: center; background: #ffffff; border: 1px solid var(--primary); border-radius: 8px; padding: 0.85rem 1rem; box-shadow: 0 2px 6px rgba(128, 0, 0, 0.04);
      .avatar-box { width: 46px; height: 46px; border-radius: 8px; background: var(--primary); color: white; font-weight: 800; font-size: 1.25rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
      .phone-badge { background: var(--slate-100); color: var(--slate-800); padding: 1px 8px; border-radius: 4px; font-size: 0.78rem; font-weight: 700; }
      .pin-badge { background: #fef3c7; color: #92400e; padding: 1px 8px; border-radius: 4px; font-size: 0.78rem; font-weight: 700; border: 1px solid #fde68a; }
      .btn-change-sharp { background: var(--slate-50); border: 1px solid var(--slate-300); color: var(--slate-700); border-radius: 6px; padding: 2px 8px; font-size: 0.72rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; transition: all 0.15s; &:hover { background: var(--slate-200); color: var(--slate-900); } }
    }

    /* Bottom Section: Table & Estimate Breakdown */
    .table-container-sharp {
      border: 1px solid var(--slate-200); border-radius: 8px; overflow: hidden; background: white;
    }

    .table-sharp {
      width: 100%; border-collapse: collapse; text-align: left;
      th { background: var(--slate-50); padding: 10px 14px; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--slate-500); border-bottom: 1px solid var(--slate-200); position: sticky; top: 0; z-index: 5; }
      td { padding: 10px 14px; vertical-align: middle; border-bottom: 1px solid var(--slate-100); }
      tr:last-child td { border-bottom: none; }
      tr:hover td { background: #fafbfc; }
      .col-num { width: 44px; text-align: center; }
      .col-desc { width: auto; }
      .col-avail { width: 80px; }
      .col-qty { width: 120px; }
      .col-rate { width: 150px; }
      .col-amt { width: 140px; }
      .col-act { width: 50px; }
      .input-table-qty { width: 65px; height: 34px; padding: 4px 6px; border-radius: 6px; border: 1px solid var(--slate-300); font-weight: 700; text-align: center; font-size: 0.88rem; color: var(--slate-900); &:focus { border-color: var(--primary); outline: none; } }
      .input-table-rate { width: 105px; height: 34px; padding: 4px 8px; border-radius: 6px; border: 1px solid var(--slate-300); font-weight: 700; text-align: right; font-size: 0.88rem; color: var(--slate-900); &:focus { border-color: var(--primary); outline: none; } }
      .btn-delete-sharp { background: none; border: none; color: #ef4444; cursor: pointer; padding: 4px; border-radius: 4px; display: flex; align-items: center; justify-content: center; transition: background 0.15s; &:hover { background: #fee2e2; } }
    }

    .empty-table-state {
      padding: 3.5rem 1rem !important; text-align: center; background: #fafbfc;
      .empty-icon-wrap { width: 64px; height: 64px; border-radius: 50%; background: var(--slate-100); display: inline-flex; align-items: center; justify-content: center; }
    }

    /* 2-Column Footer Grid inside Workspace (Left: Notes & Actions | Right: Wholesale Financial Estimate) */
    .grid-footer-2col {
      display: grid; grid-template-columns: 1.15fr 1fr; gap: 2.5rem; align-items: stretch;
    }

    @media (max-width: 1100px) {
      .grid-footer-2col { grid-template-columns: 1fr; }
    }

    .label-sharp { font-size: 0.78rem; font-weight: 700; color: var(--slate-700); }
    .input-sharp { height: 42px; padding: 0 12px; border-radius: 6px; border: 1px solid var(--slate-300); font-size: 0.88rem; color: var(--slate-900); background: white; transition: all 0.15s; &:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(128,0,0,0.08); outline: none; } }
    
    .info-banner-sharp {
      background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px 14px;
    }

    .btn-generate-sharp {
      background: var(--primary); color: white; border: none; height: 50px; border-radius: 8px; font-weight: 700; font-size: 0.95rem; cursor: pointer; transition: all 0.15s ease; box-shadow: 0 4px 10px rgba(128, 0, 0, 0.2); letter-spacing: 0.02em;
      &:hover:not([disabled]) { background: var(--primary-hover); transform: translateY(-1px); box-shadow: 0 6px 14px rgba(128, 0, 0, 0.3); }
      &:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
    }

    /* Summary Panel (Clean, Sharp, NO Clunky Yellow Box) */
    .summary-panel-sharp {
      background: var(--slate-50); border: 1px solid var(--slate-200); border-radius: 8px; padding: 1.25rem 1.5rem; display: flex; flex-direction: column; justify-content: space-between;
      .summary-line { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; .line-label { color: var(--slate-600); font-size: 0.88rem; } .line-val { color: var(--slate-900); font-size: 0.95rem; } }
      .summary-line-badha {
        display: flex; justify-content: space-between; align-items: center; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px;
        .badha-input-group {
          position: relative; width: 120px;
          .prefix { position: absolute; left: 10px; top: 7px; }
          .badha-input { width: 100%; height: 32px; padding-left: 24px; padding-right: 8px; text-align: right; font-weight: 700; font-size: 0.92rem; border-radius: 6px; border: 1px solid #cbd5e1; background: white; color: var(--slate-900); &:focus { border-color: var(--primary); outline: none; } }
        }
      }
      .grand-total-line { border-top: 2px solid var(--slate-300); padding-top: 0.75rem; margin-top: 0.25rem; }
    }

    /* Modal Styles */
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-card {
      background: white; border-radius: 12px; width: 520px; max-width: 95vw; overflow: hidden; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2); border: 1px solid var(--slate-200);
      .modal-header { padding: 1rem 1.25rem; background: var(--slate-50); border-bottom: 1px solid var(--slate-200); }
      .modal-body { padding: 1.5rem 1.25rem; }
      .modal-footer { padding: 1rem 1.25rem; background: var(--slate-50); border-top: 1px solid var(--slate-200); }
    }

    .grid-2-col { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    .input-group-sharp {
      display: flex; align-items: center;
      .prefix { background: var(--slate-100); border: 1px solid var(--slate-300); border-right: none; padding: 0 12px; height: 42px; display: flex; align-items: center; border-radius: 6px 0 0 6px; font-weight: 700; color: var(--slate-600); font-size: 0.88rem; }
      .input-sharp { border-radius: 0 6px 6px 0; }
    }

    .success-modal-card {
      background: white; border-radius: 16px; padding: 2.5rem 2rem; text-align: center; width: 420px; box-shadow: 0 25px 60px rgba(0, 0, 0, 0.25); border: 1px solid var(--slate-200);
    }
  `]
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
