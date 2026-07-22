import { Injectable, signal, inject } from '@angular/core';
import { Firestore, collection, collectionData, addDoc, doc, updateDoc, getDoc } from '@angular/fire/firestore';

export interface Category {
  id: string;
  name: string;
  image: string;
  description: string;
  status: 'active' | 'disabled';
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  categoryId: string;
  description: string;
  stock: number;
  status: 'active' | 'disabled';
  images: string[];
}

export interface OrderItem {
  productId: string;
  quantity: number;
}

export interface Order {
  id: string;
  customerName: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  items: OrderItem[];
  status: 'pending' | 'completed';
  date: string;
}

@Injectable({
  providedIn: 'root'
})
export class DataService {
  firestore = inject(Firestore);

  // Signals for state management (initialized empty, hydrated from Firestore)
  categories = signal<Category[]>([]);
  products = signal<Product[]>([]);
  orders = signal<Order[]>([]);
  cart = signal<OrderItem[]>([]);

  constructor() {
    this.initFirestoreListeners();
  }

  private initFirestoreListeners() {
    const categoriesRef = collection(this.firestore, 'categories');
    collectionData(categoriesRef, { idField: 'id' }).subscribe((data: any[]) => {
      this.categories.set(data as Category[]);
    });

    const productsRef = collection(this.firestore, 'products');
    collectionData(productsRef, { idField: 'id' }).subscribe((data: any[]) => {
      this.products.set(data as Product[]);
    });

    const ordersRef = collection(this.firestore, 'orders');
    collectionData(ordersRef, { idField: 'id' }).subscribe((data: any[]) => {
      // Sort orders by date descending
      const sortedOrders = (data as Order[]).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      this.orders.set(sortedOrders);
    });
  }

  // Cart Actions (Local State)
  addToCart(productId: string, quantity: number) {
    const currentCart = this.cart();
    const existing = currentCart.find(item => item.productId === productId);
    if (existing) {
      existing.quantity += quantity;
      this.cart.set([...currentCart]);
    } else {
      this.cart.set([...currentCart, { productId, quantity }]);
    }
  }

  removeFromCart(productId: string) {
    this.cart.set(this.cart().filter(item => item.productId !== productId));
  }

  clearCart() {
    this.cart.set([]);
  }

  async placeOrder(customerDetails: Omit<Order, 'id' | 'items' | 'status' | 'date'>) {
    const newOrder = {
      ...customerDetails,
      items: [...this.cart()],
      status: 'pending',
      date: new Date().toISOString()
    };
    
    const ordersRef = collection(this.firestore, 'orders');
    const docRef = await addDoc(ordersRef, newOrder);
    
    // We add the id property onto the object for immediate return since addDoc doesn't include it in the returned object, 
    // although collectionData listener will update the list with the correct ID.
    const completeOrder: Order = { ...newOrder, id: docRef.id } as Order;
    
    this.clearCart();
    return completeOrder;
  }

  async generateBill(orderId: string) {
    try {
      // 1. Update order status
      const orderRef = doc(this.firestore, `orders/${orderId}`);
      await updateDoc(orderRef, { status: 'completed' });
      
      // 2. Reduce stock for each product in the order
      // Note: In a production app, this should be done via a Firestore transaction or Cloud Function
      // to avoid race conditions. We're using standard updates here for simplicity.
      const orderDoc = await getDoc(orderRef);
      if (orderDoc.exists()) {
        const orderData = orderDoc.data() as Order;
        
        for (const item of orderData.items) {
          const productRef = doc(this.firestore, `products/${item.productId}`);
          const productDoc = await getDoc(productRef);
          
          if (productDoc.exists()) {
            const currentStock = productDoc.data()['stock'] || 0;
            const newStock = Math.max(0, currentStock - item.quantity);
            await updateDoc(productRef, { stock: newStock });
          }
        }
      }
    } catch (error) {
      console.error("Error generating bill and updating stock:", error);
    }
  }

  // Generic CRUD for Admin
  async addCategory(category: Omit<Category, 'id'>) {
    const categoriesRef = collection(this.firestore, 'categories');
    await addDoc(categoriesRef, category);
  }
  
  async addProduct(product: Omit<Product, 'id'>) {
    const productsRef = collection(this.firestore, 'products');
    await addDoc(productsRef, product);
  }
}
