import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Resend } from 'resend';
import { generateItemsTable, generateOrderEmailTemplate, generateCancellationEmailTemplate } from './utils/emailTemplate';

admin.initializeApp();

const resend = new Resend('re_ek26zoJD_PkdgAAtsukNA2cZAonPf9H1v');

// Trigger 1: New order created → send order confirmation to admin
export const sendOrderEmail = functions.firestore
  .document('orders-kh/{orderId}')
  .onCreate(async (snap, context) => {
    const order = snap.data();
    const orderId = context.params.orderId;

    if (!order) return;

    try {
      const productsSnapshot = await admin.firestore().collection('products-kh').get();
      const productsMap = new Map();
      productsSnapshot.forEach(doc => {
        productsMap.set(doc.id, doc.data());
      });

      const itemsHtml = generateItemsTable(order, productsMap);
      const emailHtml = generateOrderEmailTemplate(order, orderId, itemsHtml);

      const { data, error } = await resend.emails.send({
        from: 'Khandelwal Cards <onboarding@resend.dev>',
        to: 'rohit@quadralyst.com',
        subject: `New Order Received! #${orderId.substring(0, 8).toUpperCase()}`,
        html: emailHtml
      });

      if (error) { console.error('Resend error:', error); return; }
      console.log('Order email sent! ID:', data?.id);

    } catch (error) {
      console.error('Error sending order email:', error);
    }
  });

// Trigger 2: Order cancelled → send cancellation email to customer
export const sendCancellationEmail = functions.firestore
  .document('orders-kh/{orderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const orderId = context.params.orderId;

    // Only fire when status changes TO 'cancelled'
    if (before?.status === after?.status || after?.status !== 'cancelled') return;
    if (!after?.email) return;

    const reason = after.cancellationReason || 'Insufficient stock';

    try {
      const emailHtml = generateCancellationEmailTemplate(after, orderId, reason);

      const { data, error } = await resend.emails.send({
        from: 'Khandelwal Cards <onboarding@resend.dev>',
        to: after.email,
        subject: `Order Cancelled - #${orderId.substring(0, 8).toUpperCase()}`,
        html: emailHtml
      });

      if (error) { console.error('Resend cancellation error:', error); return; }
      console.log('Cancellation email sent to:', after.email, '| ID:', data?.id);

    } catch (error) {
      console.error('Error sending cancellation email:', error);
    }
  });

