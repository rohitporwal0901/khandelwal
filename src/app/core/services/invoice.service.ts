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
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text('INVOICE', 105, 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.text('Khandelwal Cards', 14, 35);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Premium Printing Products', 14, 42);
    doc.text('Indore, MP, India', 14, 47);
    
    // Order Details
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    doc.text(`Order ID: ${order.id}`, 14, 60);
    const orderDate = new Date(order.date).toLocaleDateString();
    doc.text(`Date: ${orderDate}`, 14, 66);
    doc.text(`Status: ${order.status.toUpperCase()}`, 14, 72);
    
    // Customer Details
    doc.text('Bill To:', 130, 35);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(order.customerName, 130, 42);
    doc.text(order.phone, 130, 47);
    doc.text(order.email, 130, 52);
    
    const addressLines = doc.splitTextToSize(order.address, 65);
    doc.text(addressLines, 130, 57);

    // Items Table
    const tableData = order.items.map((item, index) => {
      const prod = products.find(p => p.id === item.productId);
      return [
        index + 1,
        prod ? prod.name : 'Unknown Product',
        prod ? prod.sku : '-',
        item.quantity,
        'N/A' // Pricing is not available in this mockup
      ];
    });

    autoTable(doc, {
      startY: 85,
      head: [['#', 'Item Description', 'SKU', 'Quantity', 'Amount']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 40] },
      styles: { fontSize: 10, cellPadding: 5 },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 35 },
        3: { cellWidth: 30, halign: 'center' },
        4: { cellWidth: 30, halign: 'right' }
      }
    });

    // Footer
    const finalY = (doc as any).lastAutoTable.finalY || 150;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    
    if (order.notes) {
      doc.text('Notes:', 14, finalY + 15);
      const noteLines = doc.splitTextToSize(order.notes, 180);
      doc.text(noteLines, 14, finalY + 22);
    }
    
    doc.text('Thank you for your business!', 105, 280, { align: 'center' });
    
    // Output PDF
    const filename = `Invoice_${order.id}.pdf`;
    doc.save(filename);
    
    console.log(`[InvoiceService] Generated and downloaded ${filename}`);
    
    // Simulate sending email via NodeMailer
    this.simulateEmailSending(order, filename);
  }
  
  private simulateEmailSending(order: Order, filename: string) {
    console.log(`[EmailService] Preparing to send email to ${order.email} and rohit@quadralyst.com...`);
    console.log(`[EmailService] Attaching invoice: ${filename}`);
    
    setTimeout(() => {
      console.log(`[EmailService] ✅ Email successfully sent to rohit@quadralyst.com with order details and PDF attached.`);
    }, 2000);
  }
}
