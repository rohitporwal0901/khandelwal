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
   * Generates Estimate / Bill matching physical wholesale stationery layout
   * Adapts dynamically to page width/height (A5/A4 safe)
   */
  generateInvoice(order: Order, products: Product[], isDirectDownload: boolean = false) {
    const doc = new jsPDF({ format: 'a5', unit: 'mm', orientation: 'portrait' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const m = 5; // global margin
    const leftX = m + 3;
    const rightX = pageWidth - m - 3;
    const centerX = pageWidth / 2;
    
    const textBlack = [0, 0, 0] as [number, number, number];
    
    // Draw outer border
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.rect(m, m, pageWidth - 2 * m, pageHeight - 2 * m);

    // 1. Top Title Section
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textBlack);
    doc.setFontSize(22);
    doc.text('ESTIMATE', centerX, m + 10, { align: 'center' });
    
    doc.setFontSize(13);
    doc.text('KHANDELWAL STATIONERY', centerX, m + 17, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('121, Rama Sahy Marg Nagda', centerX, m + 22, { align: 'center' });
    doc.text('Phone: 7089731034', centerX, m + 26, { align: 'center' });

    // Divider Line
    doc.setLineWidth(0.3);
    doc.line(m, m + 29, pageWidth - m, m + 29);

    // 2. Metadata Header
    let currentY = m + 35;
    doc.setFontSize(9);
    
    const billNumStr = order.billNumber || order.id.slice(0, 8).toUpperCase();
    
    // Left side
    doc.setFont('helvetica', 'bold');
    doc.text('Bill No.', leftX, currentY);
    doc.text(':', leftX + 15, currentY);
    doc.text(billNumStr, leftX + 18, currentY);

    doc.text('M/S', leftX, currentY + 6);
    doc.text(':', leftX + 15, currentY + 6);
    doc.text(order.customerName, leftX + 18, currentY + 6);

    doc.text('Address', leftX, currentY + 12);
    doc.text(':', leftX + 15, currentY + 12);
    
    const pinStr = order.pincode ? ` ${order.pincode}` : '';
    const fullAddr = (order.address || '') + pinStr + (order.phone ? ` ${order.phone}` : '');
    const splitAddr = doc.splitTextToSize(fullAddr, centerX - 20);
    doc.text(splitAddr, leftX + 18, currentY + 12);

    // Right side
    doc.setFont('helvetica', 'bold');
    doc.text('ORIGINAL FOR RECIPIENT', rightX, currentY, { align: 'right' });
    
    const orderDateObj = new Date(order.date);
    const dateStr = orderDateObj.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    const timeStr = orderDateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    doc.text('Date', rightX - 35, currentY + 6);
    doc.text(':', rightX - 25, currentY + 6);
    doc.text(dateStr, rightX, currentY + 6, { align: 'right' });

    doc.text('Time', rightX - 35, currentY + 12);
    doc.text(':', rightX - 25, currentY + 12);
    doc.text(timeStr, rightX, currentY + 12, { align: 'right' });

    // 3. Table Data
    let calculatedSubTotal = 0;
    let totalQty = 0;

    const tableData: any[][] = order.items.map((item, index) => {
      const prod = products.find(p => p.id === item.productId);
      const rate = item.sellingRate !== undefined ? item.sellingRate : (prod?.sellingRate || 0);
      const amount = item.total !== undefined ? item.total : (item.quantity * rate);
      calculatedSubTotal += amount;
      totalQty += item.quantity;

      const prodName = prod ? `${prod.name}` : 'Wedding Card';
      return [
        (index + 1).toString(),
        prodName,
        `${item.quantity} Pcs`,
        rate.toFixed(2),
        amount.toFixed(2)
      ];
    });

    const badhaVal = order.badha || 0;
    if (badhaVal > 0) {
      tableData.push([
        (tableData.length + 1).toString(),
        'Packing & Forwarding',
        '1 Pcs',
        badhaVal.toFixed(2),
        badhaVal.toFixed(2)
      ]);
      totalQty += 1;
    }
    
    // Add empty rows to match the visual padding of a physical estimate book
    const minRows = 7;
    while (tableData.length < minRows) {
      tableData.push(['', '', '', '', '']);
    }

    const subTotalVal = order.subTotal !== undefined ? order.subTotal : calculatedSubTotal;
    const totalAmountVal = order.totalAmount !== undefined ? order.totalAmount : (subTotalVal + badhaVal);
    const prevBalVal = order.previousBalance || 0;
    const netPayableVal = order.netPayable !== undefined ? order.netPayable : (totalAmountVal + prevBalVal);

    currentY = Math.max(currentY + 12 + (splitAddr.length * 3.5), currentY + 16);

    autoTable(doc, {
      startY: currentY,
      head: [['S.No.', 'Item', 'Quantity', 'Rate', 'Amount']],
      body: tableData,
      foot: [['Total', '', totalQty.toString(), '', totalAmountVal.toFixed(2)]],
      theme: 'grid',
      margin: { left: m, right: m, bottom: m },
      headStyles: { fillColor: [255, 255, 255], textColor: textBlack, fontStyle: 'bold', fontSize: 9, cellPadding: 2, lineWidth: 0.3, lineColor: [0, 0, 0], halign: 'center' },
      footStyles: { fillColor: [255, 255, 255], textColor: textBlack, fontStyle: 'bold', fontSize: 9, cellPadding: 2, lineWidth: 0.3, lineColor: [0, 0, 0] },
      bodyStyles: { fontSize: 9, cellPadding: 2, textColor: textBlack, lineWidth: { top: 0, bottom: 0, left: 0.3, right: 0.3 }, lineColor: [0, 0, 0] },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 'auto', halign: 'left' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 18, halign: 'center' },
        4: { cellWidth: 24, halign: 'center' }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    
    // Left text
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Under Nagda Jurisdiction. For - Estimate', leftX, finalY + 6);
    
    // Signature Box
    doc.setLineWidth(0.3);
    doc.rect(m, finalY + 8, 65, 18);
    doc.setFont('helvetica', 'bold');
    doc.text('Signature Purchaser', m + 3, finalY + 12);

    // Right table
    autoTable(doc, {
      startY: finalY + 3,
      margin: { left: pageWidth - m - 62, right: m },
      body: [
        ['Balance', totalAmountVal.toFixed(2)],
        ['Old Balance', prevBalVal.toFixed(2)],
        ['Grand Total Balance', netPayableVal.toFixed(2)]
      ],
      theme: 'grid',
      bodyStyles: { fillColor: [255, 255, 255], fontSize: 9, cellPadding: 2.5, textColor: textBlack, lineWidth: 0.3, lineColor: [0, 0, 0], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 38, halign: 'left' },
        1: { cellWidth: 24, halign: 'center' } // matches Amount column width perfectly
      }
    });

    if (isDirectDownload) {
      const fileName = `Bill_${order.billNumber || order.id}.pdf`;
      doc.save(fileName);
    } else {
      doc.autoPrint();
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    }
  }

  /**
   * Generates Landscape Account Report / Customer Ledger
   * Clean aesthetic matching the invoice layout
   */
  generateLedgerReport(
    customer: UserProfile, 
    entries: LedgerReportEntry[], 
    startDateStr: string, 
    endDateStr: string,
    openingBalance: number,
    closingBalance: number,
    isDirectDownload: boolean = false
  ) {
    const doc = new jsPDF({ format: 'a5', unit: 'mm', orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const m = 5;
    const leftX = m + 3;
    const rightX = pageWidth - m - 3;
    const centerX = pageWidth / 2;
    const textBlack = [0, 0, 0] as [number, number, number];

    // Draw outer border
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.rect(m, m, pageWidth - 2 * m, pageHeight - 2 * m);

    // 1. Title Header
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textBlack);
    doc.setFontSize(16);
    doc.text('ACCOUNT REPORT / LEDGER STATEMENT', centerX, m + 10, { align: 'center' });
    
    doc.setFontSize(11);
    doc.text('KHANDELWAL STATIONERY', centerX, m + 16, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('121, Rama Sahy Marg Nagda | Phone: 7089731034', centerX, m + 21, { align: 'center' });

    // Divider Line
    doc.setLineWidth(0.3);
    doc.line(m, m + 24, pageWidth - m, m + 24);

    // Customer & Date Info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`M/S: ${customer.name} (${customer.phone || 'No Phone'})`, leftX, m + 31);
    
    const formatDate = (s: string) => {
      if (!s) return '';
      const parts = s.split('-');
      if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
      return s;
    };
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Period: ${formatDate(startDateStr)} to ${formatDate(endDateStr)}`, rightX, m + 31, { align: 'right' });

    // 2. Prepare Table Rows
    const tableData: any[][] = [];

    const openBalType = openingBalance > 0 ? 'Dr' : (openingBalance < 0 ? 'Cr' : '');
    const openBalStr = openingBalance !== 0 ? `${Math.abs(openingBalance).toFixed(2)} ${openBalType}` : '0.00';
    tableData.push([
      formatDate(startDateStr),
      'Opening Ledger Balance (Purana Bakaya)',
      openingBalance > 0 ? openingBalance.toFixed(2) : '-',
      openingBalance < 0 ? Math.abs(openingBalance).toFixed(2) : '-',
      openBalStr
    ]);

    entries.forEach(item => {
      const drStr = item.debit > 0 ? item.debit.toFixed(2) : '-';
      const crStr = item.credit > 0 ? item.credit.toFixed(2) : '-';
      const balStr = `${item.balance.toFixed(2)} ${item.balanceType}`;
      tableData.push([item.date, item.narration, drStr, crStr, balStr]);
    });

    autoTable(doc, {
      startY: m + 35,
      head: [['Date', 'Narration / Particulars', 'Dr (Bills)', 'Cr (Receipts)', 'Balance']],
      body: tableData,
      theme: 'grid',
      margin: { left: m, right: m, top: m + 5, bottom: m + 5 },
      headStyles: { fillColor: [255, 255, 255], textColor: textBlack, fontStyle: 'bold', fontSize: 9, cellPadding: 4, lineWidth: 0.3, lineColor: [0, 0, 0] },
      bodyStyles: { fontSize: 9, cellPadding: 4, textColor: textBlack, lineWidth: 0.3, lineColor: [0, 0, 0] },
      columnStyles: {
        0: { cellWidth: 25, halign: 'center' },
        1: { cellWidth: 'auto', fontStyle: 'normal' },
        2: { cellWidth: 30, halign: 'center' },
        3: { cellWidth: 30, halign: 'center' },
        4: { cellWidth: 35, halign: 'center', fontStyle: 'bold' }
      },
      didDrawPage: function(data) {
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.3);
        doc.rect(m, m, pageWidth - 2 * m, pageHeight - 2 * m);
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    
    // Bottom Summary Table
    const closeBalType = closingBalance > 0 ? 'Dr (Bakaya)' : (closingBalance < 0 ? 'Cr (Advance)' : 'Settled');
    
    autoTable(doc, {
      startY: finalY + 5,
      margin: { left: pageWidth - m - 80, right: m },
      body: [
        ['Closing Balance as on ' + formatDate(endDateStr), `${Math.abs(closingBalance).toFixed(2)} ${closeBalType}`]
      ],
      theme: 'grid',
      bodyStyles: { fillColor: [255, 255, 255], fontSize: 9, cellPadding: 4, textColor: textBlack, lineWidth: 0.3, lineColor: [0, 0, 0], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 45, halign: 'left' },
        1: { cellWidth: 35, halign: 'center' }
      }
    });

    const finalY2 = (doc as any).lastAutoTable.finalY;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('Note: This is a computer-generated wholesale account ledger statement from Khandelwal Stationery.', leftX, finalY2 + 10);

    if (isDirectDownload) {
      const fileName = `Ledger_${customer.name.replace(/\s+/g, '_')}_${startDateStr}_to_${endDateStr}.pdf`;
      doc.save(fileName);
    } else {
      doc.autoPrint();
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    }
  }

  /**
   * Generates Portrait Payment Receipt Voucher
   * Clean aesthetic matching the invoice layout
   */
  generateReceipt(receipt: Receipt, isDirectDownload: boolean = false) {
    const doc = new jsPDF({ format: 'a5', unit: 'mm', orientation: 'portrait' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const m = 5;
    const leftX = m + 3;
    const rightX = pageWidth - m - 3;
    const centerX = pageWidth / 2;
    const textBlack = [0, 0, 0] as [number, number, number];

    // Draw outer border
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.rect(m, m, pageWidth - 2 * m, pageHeight - 2 * m);

    // 1. Top Title Section
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textBlack);
    doc.setFontSize(20);
    doc.text('PAYMENT RECEIPT', centerX, m + 10, { align: 'center' });
    
    doc.setFontSize(13);
    doc.text('KHANDELWAL STATIONERY', centerX, m + 17, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('121, Rama Sahy Marg Nagda', centerX, m + 22, { align: 'center' });
    doc.text('Phone: 7089731034', centerX, m + 26, { align: 'center' });

    // Divider Line
    doc.setLineWidth(0.3);
    doc.line(m, m + 29, pageWidth - m, m + 29);

    // 2. Metadata Header
    let currentY = m + 35;
    doc.setFontSize(9);
    
    // Left side
    doc.setFont('helvetica', 'bold');
    doc.text('Receipt No.', leftX, currentY);
    doc.text(':', leftX + 22, currentY);
    doc.text(receipt.receiptNumber, leftX + 25, currentY);

    doc.text('Received From', leftX, currentY + 6);
    doc.text(':', leftX + 22, currentY + 6);
    doc.text(`M/S ${receipt.customerName}`, leftX + 25, currentY + 6);

    doc.text('Phone', leftX, currentY + 12);
    doc.text(':', leftX + 22, currentY + 12);
    doc.text(`+91 ${receipt.phone}`, leftX + 25, currentY + 12);
    
    if (receipt.referenceNumber) {
      doc.text('Ref / Cheque', leftX, currentY + 18);
      doc.text(':', leftX + 22, currentY + 18);
      doc.text(receipt.referenceNumber, leftX + 25, currentY + 18);
    }

    // Right side
    doc.setFont('helvetica', 'bold');
    doc.text('ORIGINAL FOR RECIPIENT', rightX, currentY, { align: 'right' });
    
    const recDateObj = new Date(receipt.date);
    const dateStr = recDateObj.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    const timeStr = recDateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    doc.text('Date', rightX - 35, currentY + 6);
    doc.text(':', rightX - 25, currentY + 6);
    doc.text(dateStr, rightX, currentY + 6, { align: 'right' });

    doc.text('Time', rightX - 35, currentY + 12);
    doc.text(':', rightX - 25, currentY + 12);
    doc.text(timeStr, rightX, currentY + 12, { align: 'right' });

    doc.text('Mode', rightX - 35, currentY + 18);
    doc.text(':', rightX - 25, currentY + 18);
    doc.text(receipt.paymentMode.toUpperCase(), rightX, currentY + 18, { align: 'right' });

    // 3. Settlement Breakdown Table
    const prevBalStr = receipt.previousBalance > 0 
      ? `${receipt.previousBalance.toFixed(2)} (Due)` 
      : `${Math.abs(receipt.previousBalance).toFixed(2)} (Advance)`;

    const newBalStr = receipt.newBalance > 0 
      ? `${receipt.newBalance.toFixed(2)} (Due)` 
      : (receipt.newBalance < 0 
        ? `${Math.abs(receipt.newBalance).toFixed(2)} (Advance)` 
        : `0.00 (Settled)`);

    const tableData = [
      ['Old Ledger Balance', prevBalStr],
      ['Amount Received', `${receipt.receivedAmount.toFixed(2)}`],
      ['New Ledger Balance', newBalStr]
    ];

    currentY = receipt.referenceNumber ? currentY + 25 : currentY + 25;

    autoTable(doc, {
      startY: currentY,
      head: [['Description / Particulars', 'Amount / Status']],
      body: tableData,
      theme: 'grid',
      margin: { left: m, right: m },
      headStyles: { fillColor: [255, 255, 255], textColor: textBlack, fontStyle: 'bold', fontSize: 10, cellPadding: 5, lineWidth: 0.3, lineColor: [0, 0, 0] },
      bodyStyles: { fontSize: 10, cellPadding: 5, textColor: textBlack, lineWidth: 0.3, lineColor: [0, 0, 0] },
      columnStyles: {
        0: { cellWidth: 'auto', fontStyle: 'bold' },
        1: { cellWidth: 50, halign: 'center', fontStyle: 'bold' }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    let summaryY = finalY + 15;

    // Signature Area
    doc.setLineWidth(0.3);
    doc.rect(rightX - 55, summaryY, 55, 22);
    doc.setFontSize(9);
    doc.text('For Khandelwal Stationery', rightX - 27.5, summaryY + 28, { align: 'center' });
    
    doc.rect(m, summaryY, 55, 22);
    doc.text('Customer Signature', m + 27.5, summaryY + 28, { align: 'center' });

    if (receipt.notes) {
      doc.setFont('helvetica', 'normal');
      doc.text(`Notes: ${receipt.notes}`, leftX, summaryY + 35);
    }

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('Thank you for your payment! This is a computer-generated receipt voucher.', leftX, pageHeight - m - 5);

    if (isDirectDownload) {
      const fileName = `Receipt_${receipt.receiptNumber}.pdf`;
      doc.save(fileName);
    } else {
      doc.autoPrint();
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    }
  }
}
