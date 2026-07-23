import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';
import { generateItemsTable, generateOrderEmailTemplate } from './utils/emailTemplate';

admin.initializeApp();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'chindichorarts@gmail.com',
    pass: 'tydl enit plgt ravo'
  }
});

export const sendOrderEmail = functions.firestore
  .document('orders-kh/{orderId}')
  .onCreate(async (snap, context) => {
    const order = snap.data();
    const orderId = context.params.orderId;

    if (!order) return;

    console.log("order", order);


    try {
      // Fetch product details for the email
      const productsSnapshot = await admin.firestore().collection('products-kh').get();
      const productsMap = new Map();
      productsSnapshot.forEach(doc => {
        productsMap.set(doc.id, doc.data());
      });

      // Build HTML
      const itemsHtml = generateItemsTable(order, productsMap);
      const emailHtml = generateOrderEmailTemplate(order, orderId, itemsHtml);

      const mailOptions = {
        from: '"Khandelwal Cards" <chindichorarts@gmail.com>',
        to: 'rohit@quadralyst.com',
        subject: `New Order Received! #${orderId.substring(0, 8).toUpperCase()}`,
        html: emailHtml
      };

      await transporter.sendMail(mailOptions);
      console.log('Order email sent successfully for order:', orderId);

    } catch (error) {
      console.error('Error sending order email:', error);
    }
  });
