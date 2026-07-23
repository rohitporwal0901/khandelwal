export const generateOrderEmailTemplate = (order: any, orderId: string, itemsHtml: string) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
      <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #eaeaea;">
        <h1 style="color: #9e1b22; margin: 0;">New Order Alert! 🎉</h1>
        <p style="color: #666; margin-top: 5px;">A new order has been placed on Khandelwal Cards.</p>
        <div style="display: inline-block; background-color: #f1f1f1; padding: 8px 16px; border-radius: 20px; margin-top: 10px; font-weight: bold; color: #333;">
          Order ID: #${orderId.substring(0, 8).toUpperCase()}
        </div>
      </div>
      
      <div style="padding: 20px 0;">
        <h3 style="color: #333; margin-bottom: 15px;">Customer Details</h3>
        <p style="margin: 5px 0;"><strong>Name:</strong> ${order.customerName}</p>
        <p style="margin: 5px 0;"><strong>Phone:</strong> ${order.phone}</p>
        <p style="margin: 5px 0;"><strong>Email:</strong> ${order.email}</p>
        
        <div style="margin: 15px 0; padding: 15px; background-color: #f8f9fa; border-left: 4px solid #9e1b22; border-radius: 4px;">
          <p style="margin: 0; font-weight: bold; color: #555;">Delivery Address:</p>
          <p style="margin: 5px 0 0 0; color: #333; line-height: 1.5;">${order.address}</p>
        </div>
        
        ${order.notes ? `
        <div style="margin: 15px 0; padding: 15px; background-color: #fff9e6; border-left: 4px solid #f5c6cb; border-radius: 4px;">
          <p style="margin: 0; font-weight: bold; color: #856404;">Additional Notes:</p>
          <p style="margin: 5px 0 0 0; color: #666; line-height: 1.5;">${order.notes}</p>
        </div>
        ` : ''}
        
        <h3 style="color: #333; margin-top: 30px; margin-bottom: 10px;">Order Summary</h3>
        ${itemsHtml}
      </div>
      
      <div style="text-align: center; padding-top: 20px; border-top: 1px solid #eaeaea; color: #888; font-size: 12px;">
        <p>This is an automated notification from your Firebase Database.</p>
      </div>
    </div>
  `;
};

export const generateItemsTable = (order: any, productsMap: Map<string, any>) => {
  let itemsHtml = `
    <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
      <thead>
        <tr style="background-color: #f8f9fa; border-bottom: 2px solid #ddd;">
          <th style="padding: 12px; text-align: left; color: #333;">Item</th>
          <th style="padding: 12px; text-align: center; color: #333;">Qty</th>
        </tr>
      </thead>
      <tbody>
  `;

  order.items.forEach((item: any) => {
    const prodData = productsMap.get(item.productId);
    const prodName = prodData ? prodData.name : 'Unknown Product';
    const prodSku = prodData ? prodData.sku : 'N/A';
    
    itemsHtml += `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 12px;">
          <div style="font-weight: bold; color: #444;">${prodName}</div>
          <div style="font-size: 12px; color: #888;">SKU: ${prodSku}</div>
        </td>
        <td style="padding: 12px; text-align: center; font-weight: bold; color: #666;">
          ${item.quantity}
        </td>
      </tr>
    `;
  });

  itemsHtml += `
      </tbody>
    </table>
  `;
  
  return itemsHtml;
};
