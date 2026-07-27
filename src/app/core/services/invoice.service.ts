import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Order, Product, Receipt } from './data.service';
import { UserProfile } from './auth.service';

export interface LedgerReportEntry {
  date: string;
  timestamp: number;
  narration: string;
  debit: number;  // Bill amount (Dr)
  credit: number; // Receipt amount (Cr)
  balance: number;
  balanceType: 'Dr' | 'Cr' | '';
}

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {
  
  constructor() { }

  /**
   * Generates A5 Portrait Estimate / Bill matching physical wholesale stationery layout (Screenshot 2)
   * Dimensions: 148mm (width) × 210mm (height)
   */
  generateInvoice(order: Order, products: Product[]) {
    const doc = new jsPDF({ format: 'a5', unit: 'mm', orientation: 'portrait' });
    const textBlack = [0, 0, 0] as [number, number, number];
    const textDark = [20, 20, 20] as [number, number, number];
    const textMuted = [80, 80, 80] as [number, number, number];

    // Page Width is 148mm -> Center is 74mm, Right margin is 138mm, Left margin is 10mm
    const centerX = 74;
    const rightX = 138;
    const leftX = 10;

    // 1. Top Title Section (Authentic Pink Slip / Wholesale Estimate Style)
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textBlack);
    doc.text('|| SHRI ||', centerX, 11, { align: 'center' });
    
    doc.setFontSize(18);
    doc.text('Estimate', centerX, 19, { align: 'center' });
    
    doc.setFontSize(11.5);
    doc.setTextColor(...textDark);
    doc.text('Khandelwal Stationery', centerX, 25, { align: 'center' });
    
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textMuted);
    doc.text('121, Ram Sahay Marg Nagda / Indore, MP', centerX, 30, { align: 'center' });
    doc.text('Phone: 7089731034 | 9826474254', centerX, 34, { align: 'center' });

    // Divider Line
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.4);
    doc.line(leftX, 38, rightX, 38);

    // 2. Left & Right Metadata Header
    doc.setFontSize(9.5);
    doc.setTextColor(...textDark);
    
    // Left side: Bill No & Customer Info
    const billNumStr = order.billNumber || order.id.slice(0, 8).toUpperCase();
    doc.setFont('helvetica', 'bold');
    doc.text(`Bill No: ${billNumStr}`, leftX, 44);
    doc.setFontSize(10);
    doc.text(`M/S ${order.customerName}`, leftX, 50);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...textMuted);
    const pinStr = order.pincode ? ` - Pin: ${order.pincode}` : '';
    const fullAddr = (order.address || 'Address not provided') + pinStr;
    const addrLines = doc.splitTextToSize(`Address: ${fullAddr}`, 65);
    doc.text(addrLines, leftX, 55);
    doc.text(`Phone: +91 ${order.phone}`, leftX, 55 + (addrLines.length * 4));

    // Right side: Date and Type
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text('ORIGINAL FOR RECIPIENT', rightX, 44, { align: 'right' });
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textDark);
    const orderDate = new Date(order.date).toLocaleDateString('en-IN', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    doc.text(`Date: ${orderDate}`, rightX, 50, { align: 'right' });
    doc.text(`Status: ${order.status.toUpperCase()}`, rightX, 55, { align: 'right' });

    // 3. Prepare Table Data
    let calculatedSubTotal = 0;
    let totalQty = 0;

    const tableData = order.items.map((item, index) => {
      const prod = products.find(p => p.id === item.productId);
      const rate = item.sellingRate !== undefined ? item.sellingRate : (prod?.sellingRate || 0);
      const amount = item.total !== undefined ? item.total : (item.quantity * rate);
      calculatedSubTotal += amount;
      totalQty += item.quantity;

      const prodName = prod ? `${prod.name} (${prod.sku})` : 'Wedding Card / Printing Item';
      return [
        (index + 1).toString(),
        prodName,
        `${item.quantity} Pcs`,
        `Rs ${rate.toFixed(2)}`,
        `Rs ${amount.toFixed(2)}`
      ];
    });

    const badhaVal = order.badha || 0;
    if (badhaVal > 0) {
      tableData.push([
        (tableData.length + 1).toString(),
        'Badha / Packing & Forwarding',
        '1 Pcs',
        `Rs ${badhaVal.toFixed(2)}`,
        `Rs ${badhaVal.toFixed(2)}`
      ]);
      totalQty += 1;
    }

    const subTotalVal = order.subTotal !== undefined ? order.subTotal : calculatedSubTotal;
    const totalAmountVal = order.totalAmount !== undefined ? order.totalAmount : (subTotalVal + badhaVal);
    const prevBalVal = order.previousBalance || 0;
    const netPayableVal = order.netPayable !== undefined ? order.netPayable : (totalAmountVal + prevBalVal);

    // 4. Generate Table with Total Footer
    const startYPos = Math.max(68, 57 + (addrLines.length * 4));

    autoTable(doc, {
      startY: startYPos,
      head: [['SNo', 'Item Description', 'Quantity', 'Rate', 'Amount']],
      body: tableData,
      foot: [['', 'Total', `${totalQty} Pcs`, '', `Rs ${totalAmountVal.toFixed(2)}`]],
      theme: 'grid',
      headStyles: { fillColor: [255, 255, 255], textColor: textBlack, fontStyle: 'bold', fontSize: 8.5, cellPadding: 3.5, lineWidth: 0.3, lineColor: [0, 0, 0] },
      footStyles: { fillColor: [255, 255, 255], textColor: textBlack, fontStyle: 'bold', fontSize: 8.5, cellPadding: 3.5, lineWidth: 0.3, lineColor: [0, 0, 0] },
      bodyStyles: { fontSize: 8, cellPadding: 3, textColor: textBlack, lineWidth: 0.15, lineColor: [150, 150, 150] },
      styles: { fontSize: 8, cellPadding: 3, textColor: textBlack },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
        3: { cellWidth: 23, halign: 'right' },
        4: { cellWidth: 26, halign: 'right', fontStyle: 'bold' }
      }
    });

    // 5. Bottom Financial Summary & Signature Area (Exactly matching Screenshot 2 layout)
    const finalY = (doc as any).lastAutoTable.finalY || 130;
    let summaryY = finalY + 8;

    // Right Side Box: Balance & Grand Total Breakdown
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text('Balance (Current Bill):', 85, summaryY);
    doc.text(`Rs ${totalAmountVal.toFixed(2)}`, rightX, summaryY, { align: 'right' });
    summaryY += 5.5;

    if (prevBalVal !== 0) {
      if (prevBalVal > 0) {
        doc.text('Old Balance:', 85, summaryY);
        doc.text(`Rs ${prevBalVal.toFixed(2)}`, rightX, summaryY, { align: 'right' });
      } else {
        doc.text('Advance Balance:', 85, summaryY);
        doc.text(`Rs ${Math.abs(prevBalVal).toFixed(2)} CR`, rightX, summaryY, { align: 'right' });
      }
      summaryY += 5.5;
    }

    // Divider
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.4);
    doc.line(85, summaryY - 1.5, rightX, summaryY - 1.5);
    summaryY += 3;

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textBlack);
    doc.text('Grand Total Balance:', 85, summaryY);
    doc.text(`Rs ${netPayableVal.toFixed(2)}`, rightX, summaryY, { align: 'right' });

    // Left Side: Jurisdiction & Signature (positioned near bottom left of table)
    const leftSigY = finalY + 10;
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...textMuted);
    doc.text('Under Nagda Jurisdiction. For - Estimate', leftX, leftSigY);
    
    if (order.notes) {
      doc.setFont('helvetica', 'normal');
      doc.text(`Note: ${order.notes}`, leftX, leftSigY + 4);
    }

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textDark);
    doc.text('Signature Purchaser', leftX, leftSigY + 22);

    // 6. Save / Download PDF
    doc.autoPrint();
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }

  /**
   * Generates A5 Landscape Account Report / Customer Ledger (Screenshot 1)
   * Dimensions: 210mm (width) × 148mm (height)
   */
  generateLedgerReport(
    customer: UserProfile, 
    entries: LedgerReportEntry[], 
    startDateStr: string, 
    endDateStr: string,
    openingBalance: number,
    closingBalance: number
  ) {
    const doc = new jsPDF({ format: 'a5', unit: 'mm', orientation: 'landscape' });
    const textBlack = [0, 0, 0] as [number, number, number];
    const textDark = [20, 20, 20] as [number, number, number];
    const textMuted = [80, 80, 80] as [number, number, number];

    // Page Width is 210mm -> Center is 105mm, Right margin is 196mm, Left margin is 14mm
    const centerX = 105;
    const rightX = 196;
    const leftX = 14;

    // 1. Title Header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textBlack);
    doc.text('ACCOUNT REPORT / LEDGER STATEMENT', centerX, 12, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(...textDark);
    doc.text('Khandelwal Stationery Wholesaler • Nagda / Indore', centerX, 18, { align: 'center' });

    // Customer Subtitle
    doc.setFontSize(11.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`${customer.name} (${customer.phone || 'No Phone'})`, centerX, 26, { align: 'center' });
    
    // Date Range Subtitle
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textMuted);
    const formatDate = (s: string) => {
      if (!s) return '';
      const parts = s.split('-');
      if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
      return s;
    };
    doc.text(`Statement Period: ${formatDate(startDateStr)} to ${formatDate(endDateStr)}`, centerX, 31, { align: 'center' });

    // Divider Line
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.4);
    doc.line(leftX, 35, rightX, 35);

    // 2. Prepare Table Rows
    const tableData: any[][] = [];

    // Opening Balance Row
    const openBalType = openingBalance > 0 ? 'Dr' : (openingBalance < 0 ? 'Cr' : '');
    const openBalStr = openingBalance !== 0 ? `Rs ${Math.abs(openingBalance).toFixed(2)} ${openBalType}` : 'Rs 0.00';
    tableData.push([
      formatDate(startDateStr),
      'Opening Ledger Balance (Purana Bakaya)',
      openingBalance > 0 ? `Rs ${openingBalance.toFixed(2)}` : '-',
      openingBalance < 0 ? `Rs ${Math.abs(openingBalance).toFixed(2)}` : '-',
      openBalStr
    ]);

    // Transaction Rows
    entries.forEach(item => {
      const drStr = item.debit > 0 ? `Rs ${item.debit.toFixed(2)}` : '-';
      const crStr = item.credit > 0 ? `Rs ${item.credit.toFixed(2)}` : '-';
      const balStr = `Rs ${item.balance.toFixed(2)} ${item.balanceType}`;
      tableData.push([
        item.date,
        item.narration,
        drStr,
        crStr,
        balStr
      ]);
    });

    // 3. Generate Table
    autoTable(doc, {
      startY: 40,
      head: [['Date', 'Narration / Particulars', 'Dr (Bills)', 'Cr (Receipts)', 'Balance']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [255, 255, 255], textColor: textBlack, fontStyle: 'bold', fontSize: 8.5, cellPadding: 3.5, lineWidth: 0.3, lineColor: [0, 0, 0] },
      bodyStyles: { fontSize: 8, cellPadding: 3, textColor: textBlack, lineWidth: 0.15, lineColor: [150, 150, 150] },
      columnStyles: {
        0: { cellWidth: 25, halign: 'center' },
        1: { cellWidth: 'auto', fontStyle: 'normal' },
        2: { cellWidth: 32, halign: 'right', textColor: textBlack },
        3: { cellWidth: 32, halign: 'right', textColor: textBlack },
        4: { cellWidth: 35, halign: 'right', fontStyle: 'bold' }
      }
    });

    // 4. Closing Balance Summary Footer
    const finalY = (doc as any).lastAutoTable.finalY || 110;
    let summaryY = finalY + 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textBlack);
    
    const closeBalType = closingBalance > 0 ? 'Dr (Bakaya Due)' : (closingBalance < 0 ? 'Cr (Agrim Advance)' : 'Settled');
    doc.text(`Closing Balance as on ${formatDate(endDateStr)}:`, leftX, summaryY);
    
    doc.setTextColor(...textBlack);
    doc.text(`Rs ${Math.abs(closingBalance).toFixed(2)} ${closeBalType}`, rightX, summaryY, { align: 'right' });

    summaryY += 12;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...textMuted);
    doc.text('Note: This is a computer-generated wholesale account ledger statement from Khandelwal Stationery Nagda.', leftX, summaryY);

    // Save PDF / Open in Print Dialog
    doc.autoPrint();
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }

  /**
   * Generates A5 Portrait Payment Receipt Voucher
   */
  generateReceipt(receipt: Receipt) {
    const doc = new jsPDF({ format: 'a5', unit: 'mm', orientation: 'portrait' });
    const textBlack = [0, 0, 0] as [number, number, number];
    const textDark = [20, 20, 20] as [number, number, number];
    const textMuted = [80, 80, 80] as [number, number, number];

    const centerX = 74;
    const rightX = 138;
    const leftX = 10;

    // 1. Top Title Section
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textBlack);
    doc.text('|| SHRI ||', centerX, 11, { align: 'center' });

    doc.setFontSize(15);
    doc.text('PAYMENT RECEIPT VOUCHER', centerX, 19, { align: 'center' });

    doc.setFontSize(11);
    doc.setTextColor(...textDark);
    doc.text('Khandelwal Stationery', centerX, 25, { align: 'center' });

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textMuted);
    doc.text('121, Ram Sahay Marg Nagda / Indore, MP', centerX, 30, { align: 'center' });
    doc.text('Phone: 7089731034 | 9826474254', centerX, 34, { align: 'center' });

    // Divider Line
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.4);
    doc.line(leftX, 38, rightX, 38);

    // 2. Receipt Metadata
    doc.setFontSize(9);
    doc.setTextColor(...textDark);
    doc.setFont('helvetica', 'bold');
    doc.text(`Receipt No: ${receipt.receiptNumber}`, leftX, 45);
    doc.setFontSize(9.5);
    doc.text(`Received From: M/S ${receipt.customerName}`, leftX, 51);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...textMuted);
    doc.text(`Phone: +91 ${receipt.phone}`, leftX, 56);
    if (receipt.referenceNumber) {
      doc.text(`Txn Ref / Cheque No: ${receipt.referenceNumber}`, leftX, 61);
    }

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text('ORIGINAL FOR RECIPIENT', rightX, 45, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textDark);
    const recDate = new Date(receipt.date).toLocaleDateString('en-IN', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    doc.text(`Date: ${recDate}`, rightX, 51, { align: 'right' });
    doc.text(`Mode: ${receipt.paymentMode.toUpperCase()}`, rightX, 56, { align: 'right' });

    // 3. Settlement Breakdown Table
    const prevBalStr = receipt.previousBalance > 0 
      ? `Rs ${receipt.previousBalance.toFixed(2)} (Due / बकाया)` 
      : `Rs ${Math.abs(receipt.previousBalance).toFixed(2)} (Advance / अग्रिम)`;

    const newBalStr = receipt.newBalance > 0 
      ? `Rs ${receipt.newBalance.toFixed(2)} (Remaining Due / शेष बकाया)` 
      : (receipt.newBalance < 0 
        ? `Rs ${Math.abs(receipt.newBalance).toFixed(2)} (Advance Credit / अग्रिम जमा)` 
        : `Rs 0.00 (Settled / चुकता)`);

    const tableData = [
      ['Old Ledger Balance', prevBalStr],
      ['Amount Received (जमा राशि)', `Rs ${receipt.receivedAmount.toFixed(2)} (${receipt.paymentMode})`],
      ['New Ledger Balance', newBalStr]
    ];

    const startYPos = receipt.referenceNumber ? 67 : 62;

    autoTable(doc, {
      startY: startYPos,
      head: [['Description / Particulars', 'Amount / Status (Rs)']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [255, 255, 255], textColor: textBlack, fontStyle: 'bold', fontSize: 8.5, cellPadding: 3.5, lineWidth: 0.3, lineColor: [0, 0, 0] },
      bodyStyles: { fontSize: 8, cellPadding: 4, textColor: textBlack, lineWidth: 0.15, lineColor: [150, 150, 150] },
      columnStyles: {
        0: { cellWidth: 55, fontStyle: 'bold' },
        1: { cellWidth: 'auto', halign: 'right', fontStyle: 'bold' }
      }
    });

    // 4. Footer Section
    const finalY = (doc as any).lastAutoTable.finalY || 110;
    let summaryY = finalY + 10;

    if (receipt.notes) {
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textDark);
      doc.text(`Remarks / Notes: ${receipt.notes}`, leftX, summaryY);
      summaryY += 8;
    }

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...textMuted);
    doc.text('Thank you for your payment! This is a computer-generated receipt voucher.', leftX, summaryY);

    summaryY += 18;
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textDark);
    doc.text('Customer Signature', leftX, summaryY);
    doc.text('For - Khandelwal Stationery', 85, summaryY);

    doc.autoPrint();
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }
}
