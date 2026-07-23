import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Resend } from 'resend';
import { generateItemsTable, generateOrderEmailTemplate } from './utils/emailTemplate';

admin.initializeApp();

// 🔑 Replace with your actual Resend API key from resend.com/api-keys
const resend = new Resend('re_ek26zoJD_PkdgAAtsukNA2cZAonPf9H1v');

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

      const { data, error } = await resend.emails.send({
        from: 'Khandelwal Cards <onboarding@resend.dev>',
        to: 'rohit@quadralyst.com',
        subject: `New Order Received! #${orderId.substring(0, 8).toUpperCase()}`,
        html: emailHtml
      });

      if (error) {
        console.error('Resend error:', error);
        return;
      }

      console.log('Order email sent successfully! ID:', data?.id);

    } catch (error) {
      console.error('Error sending order email:', error);
    }
  });
