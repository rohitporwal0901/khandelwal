import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Order, Product } from './data.service';

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {
  
  constructor() { }

  generateInvoice(order: Order, products: Product[]) {
    const doc = new jsPDF();
    const primaryMaroon = [128, 0, 0] as [number, number, number];
    const textDark = [30, 41, 59] as [number, number, number];
    const textMuted = [100, 116, 139] as [number, number, number];

    // 1. Top Title Section (Authentic Pink Slip / Wholesale Estimate Style)
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryMaroon);
    doc.text('|| SHRI ||', 105, 14, { align: 'center' });
    
    doc.setFontSize(22);
    doc.text('ESTIMATE / INVOICE', 105, 24, { align: 'center' });
    
    doc.setFontSize(13);
    doc.setTextColor(...textDark);
    doc.text('Khandelwal Cards & Stationery', 105, 32, { align: 'center' });
    
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textMuted);
    doc.text('121, Ram Sahay Marg Nagda / Indore, MP', 105, 38, { align: 'center' });
    doc.text('Phone: 7089731034 | 9826474254', 105, 43, { align: 'center' });

    // Divider Line
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    doc.line(14, 48, 196, 48);

    // 2. Left & Right Metadata Header
    doc.setFontSize(11);
    doc.setTextColor(...textDark);
    
    // Left side: Bill No & Customer Info
    const billNumStr = order.billNumber || order.id.slice(0, 8).toUpperCase();
    doc.setFont('helvetica', 'bold');
    doc.text(`Bill No: ${billNumStr}`, 14, 56);
    doc.setFontSize(11.5);
    doc.text(`M/S ${order.customerName}`, 14, 63);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...textMuted);
    const pinStr = order.pincode ? ` - Pin: ${order.pincode}` : '';
    const fullAddr = (order.address || 'Address not provided') + pinStr;
    const addrLines = doc.splitTextToSize(`Address: ${fullAddr}`, 95);
    doc.text(addrLines, 14, 69);
    doc.text(`Phone: +91 ${order.phone}`, 14, 69 + (addrLines.length * 5));

    // Right side: Date and Type
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('ORIGINAL FOR RECIPIENT', 196, 56, { align: 'right' });
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textDark);
    const orderDate = new Date(order.date).toLocaleDateString('en-IN', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    doc.text(`Date: ${orderDate}`, 196, 63, { align: 'right' });
    doc.text(`Status: ${order.status.toUpperCase()}`, 196, 69, { align: 'right' });

    // 3. Prepare Table Data (With Badha as item if present)
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

    // If Badha / Freight is added, add it as a line item just like in the pink slip!
    const badhaVal = order.badha || 0;
    if (badhaVal > 0) {
      tableData.push([
        (tableData.length + 1).toString(),
        'Badha / Packing & Forwarding Charges',
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
    const startYPos = Math.max(85, 72 + (doc.splitTextToSize(`Address: ${fullAddr}`, 95).length * 5));

    autoTable(doc, {
      startY: startYPos,
      head: [['SNo', 'Item Description', 'Quantity', 'Rate', 'Amount']],
      body: tableData,
      foot: [['', 'Total', `${totalQty} Pcs`, '', `Rs ${totalAmountVal.toFixed(2)}`]],
      theme: 'grid',
      headStyles: { fillColor: primaryMaroon, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10, cellPadding: 6 },
      footStyles: { fillColor: [241, 245, 249], textColor: textDark, fontStyle: 'bold', fontSize: 10.5, cellPadding: 6 },
      styles: { fontSize: 9.5, cellPadding: 5, textColor: textDark },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 32, halign: 'center', fontStyle: 'bold' },
        3: { cellWidth: 35, halign: 'right' },
        4: { cellWidth: 38, halign: 'right', fontStyle: 'bold' }
      }
    });

    // 5. Bottom Financial Summary & Signature Area (Exactly matching Pink Slip layout)
    const finalY = (doc as any).lastAutoTable.finalY || 160;
    let summaryY = finalY + 12;

    // Left Side: Jurisdiction & Signature
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...textMuted);
    doc.text('Under Nagda / Indore Jurisdiction. For - Khandelwal Cards & Stationery', 14, summaryY);
    
    if (order.notes) {
      doc.setFont('helvetica', 'normal');
      doc.text(`Note: ${order.notes}`, 14, summaryY + 6);
    }

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textDark);
    doc.text('Signature Purchaser', 14, summaryY + 28);
    doc.text('Authorized Signatory', 95, summaryY + 28);

    // Right Side Box: Balance & Grand Total Breakdown
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Total (Current Bill):', 130, summaryY);
    doc.text(`Rs ${totalAmountVal.toFixed(2)}`, 196, summaryY, { align: 'right' });
    summaryY += 7;

    if (prevBalVal !== 0) {
      if (prevBalVal > 0) {
        doc.text('Old Balance (Purana Bakaya):', 130, summaryY);
        doc.text(`Rs ${prevBalVal.toFixed(2)}`, 196, summaryY, { align: 'right' });
      } else {
        doc.text('Advance Balance (Agrim Jama):', 130, summaryY);
        doc.text(`Rs ${Math.abs(prevBalVal).toFixed(2)} CR`, 196, summaryY, { align: 'right' });
      }
      summaryY += 7;
    }

    // Divider
    doc.setDrawColor(...primaryMaroon);
    doc.setLineWidth(0.8);
    doc.line(130, summaryY - 2, 196, summaryY - 2);
    summaryY += 4;

    doc.setFontSize(11.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryMaroon);
    doc.text('Grand Total Balance:', 130, summaryY);
    doc.text(`Rs ${netPayableVal.toFixed(2)}`, 196, summaryY, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    // 6. Save / Download PDF
    const safeBillNum = order.billNumber || order.id;
    doc.save(`Estimate_Khandelwal_${safeBillNum}.pdf`);
  }
}
