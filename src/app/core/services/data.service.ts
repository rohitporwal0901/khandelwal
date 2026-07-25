import { Injectable, inject, signal } from '@angular/core';
import { Firestore, collection, collectionData, addDoc, doc, updateDoc, getDoc, writeBatch, query, where, getDocs } from '@angular/fire/firestore';

export interface Category {
  id: string;
  name: string;
  image: string;
  description: string;
  status: 'active' | 'disabled';
  createdAt?: string;
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
  createdAt?: string;
}

export interface OrderItem {
  productId: string;
  quantity: number;
}

export interface StockCheckResult {
  sufficient: boolean;
  issues: { productId: string; productName: string; ordered: number; available: number }[];
}

export interface HomeSlide {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  bg: string;
  img: string;
  status: 'active' | 'inactive';
  order: number;
}

export interface Order {
  id: string;
  customerName: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  items: OrderItem[];
  status: 'pending' | 'completed' | 'cancelled';
  cancellationReason?: string;
  date: string;
  uid?: string; // Firebase Auth UID — stored at order time
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
  isProductsLoaded = signal<boolean>(false);
  homeSlides = signal<HomeSlide[]>([]);

  constructor() {
    this.initFirestoreListeners();
  }

  private initFirestoreListeners() {
    const categoriesRef = collection(this.firestore, 'categories-kh');
    collectionData(categoriesRef, { idField: 'id' }).subscribe((data: any[]) => {
      const sortedCategories = (data as Category[]).sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
      this.categories.set(sortedCategories);
    });

    const productsRef = collection(this.firestore, 'products-kh');
    collectionData(productsRef, { idField: 'id' }).subscribe((data: any[]) => {
      const sortedProducts = (data as Product[]).sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
      this.products.set(sortedProducts);
      this.isProductsLoaded.set(true);
    });

    const ordersRef = collection(this.firestore, 'orders-kh');
    collectionData(ordersRef, { idField: 'id' }).subscribe((data: any[]) => {
      // Sort orders by date descending
      const sortedOrders = (data as Order[]).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      this.orders.set(sortedOrders);
    });

    const homeSlidesRef = collection(this.firestore, 'home-slides-kh');
    collectionData(homeSlidesRef, { idField: 'id' }).subscribe((data: any[]) => {
      const sortedSlides = (data as HomeSlide[]).sort((a, b) => a.order - b.order);
      this.homeSlides.set(sortedSlides);
    });

    // Initialize cart from localStorage if exists
    try {
      if (typeof localStorage !== 'undefined') {
        const savedCart = localStorage.getItem('khandelwal_cart');
        if (savedCart) {
          this.cart.set(JSON.parse(savedCart));
        }
      }
    } catch (e) {
      console.error('Failed to parse cart from local storage', e);
    }
  }

  private saveCartToStorage() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('khandelwal_cart', JSON.stringify(this.cart()));
      }
    } catch (e) {
      console.error('Failed to save cart to local storage', e);
    }
  }

  // Cart Actions (Local State)
  addToCart(productId: string, quantity: number) {
    const currentCart = this.cart();
    const existing = currentCart.find(item => item.productId === productId);
    const product = this.products().find(p => p.id === productId);
    const maxStock = product ? product.stock : 0;

    if (existing) {
      const newQty = existing.quantity + quantity;
      existing.quantity = newQty > maxStock ? maxStock : newQty;
      this.cart.set([...currentCart]);
    } else {
      const newQty = quantity > maxStock ? maxStock : quantity;
      this.cart.set([...currentCart, { productId, quantity: newQty }]);
    }
    this.saveCartToStorage();
  }

  removeFromCart(productId: string) {
    this.cart.set(this.cart().filter(item => item.productId !== productId));
    this.saveCartToStorage();
  }

  clearCart() {
    this.cart.set([]);
    this.saveCartToStorage();
  }

  async placeOrder(customerDetails: Omit<Order, 'id' | 'items' | 'status' | 'date'>) {
    const newOrder = {
      ...customerDetails,
      items: [...this.cart()],
      status: 'pending',
      date: new Date().toISOString()
    };

    const ordersRef = collection(this.firestore, 'orders-kh');
    const docRef = await addDoc(ordersRef, newOrder);

    const completeOrder: Order = { ...newOrder, id: docRef.id } as Order;

    this.clearCart();
    return completeOrder;
  }

  // Fetch orders for a specific user by uid
  async getUserOrders(uid: string): Promise<Order[]> {
    const ordersRef = collection(this.firestore, 'orders-kh');
    const q = query(ordersRef, where('uid', '==', uid));
    const snap = await getDocs(q);
    const orders = snap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
    return orders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async checkStockForOrder(orderId: string): Promise<StockCheckResult> {
    const orderRef = doc(this.firestore, `orders-kh/${orderId}`);
    const orderDoc = await getDoc(orderRef);
    const issues: StockCheckResult['issues'] = [];

    if (orderDoc.exists()) {
      const orderData = orderDoc.data() as Order;
      for (const item of orderData.items) {
        const productRef = doc(this.firestore, `products-kh/${item.productId}`);
        const productDoc = await getDoc(productRef);
        if (productDoc.exists()) {
          const stock = productDoc.data()['stock'] || 0;
          const name = productDoc.data()['name'] || 'Unknown Product';
          if (stock < item.quantity) {
            issues.push({ productId: item.productId, productName: name, ordered: item.quantity, available: stock });
          }
        }
      }
    }
    return { sufficient: issues.length === 0, issues };
  }

  async cancelOrder(orderId: string, reason: string) {
    const orderRef = doc(this.firestore, `orders-kh/${orderId}`);
    await updateDoc(orderRef, { status: 'cancelled', cancellationReason: reason });
  }

  async updateOrder(orderId: string, data: Partial<Order>) {
    const orderRef = doc(this.firestore, `orders-kh/${orderId}`);
    await updateDoc(orderRef, data);
  }

  async generateBill(orderId: string) {
    try {
      // 1. Update order status
      const orderRef = doc(this.firestore, `orders-kh/${orderId}`);
      await updateDoc(orderRef, { status: 'completed' });

      // 2. Reduce stock for each product in the order
      const orderDoc = await getDoc(orderRef);
      if (orderDoc.exists()) {
        const orderData = orderDoc.data() as Order;

        for (const item of orderData.items) {
          const productRef = doc(this.firestore, `products-kh/${item.productId}`);
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
    const categoriesRef = collection(this.firestore, 'categories-kh');
    const payload = {
      ...category,
      createdAt: new Date().toISOString()
    };
    await addDoc(categoriesRef, payload);
  }

  async updateCategory(id: string, category: Partial<Category>) {
    const categoryRef = doc(this.firestore, `categories-kh/${id}`);
    await updateDoc(categoryRef, category);
  }

  async deleteCategory(id: string) {
    const categoryRef = doc(this.firestore, `categories-kh/${id}`);
    const { deleteDoc } = await import('@angular/fire/firestore');
    await deleteDoc(categoryRef);
  }

  async addProduct(product: Omit<Product, 'id'>) {
    const productsRef = collection(this.firestore, 'products-kh');
    const payload = {
      ...product,
      createdAt: new Date().toISOString()
    };
    await addDoc(productsRef, payload);
  }

  async updateProduct(id: string, product: Partial<Product>) {
    const productRef = doc(this.firestore, `products-kh/${id}`);
    await updateDoc(productRef, product);
  }

  async deleteProduct(id: string) {
    const productRef = doc(this.firestore, `products-kh/${id}`);
    const { deleteDoc } = await import('@angular/fire/firestore');
    await deleteDoc(productRef);
  }

  async bulkAddMockProducts() {
    const batch = writeBatch(this.firestore);
    const productsRef = collection(this.firestore, 'products-kh');
    const categoryId = "m15O9WnOtpBSyhD4yGG5";
    const images = [
      "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80&w=1500",
      "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&q=80&w=1500",
      "https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&q=80&w=1500"
    ];

    for (let i = 1; i <= 100; i++) {
      const newDocRef = doc(productsRef);
      const skuNumber = (1000 + i).toString();
      const product: Omit<Product, 'id'> = {
        name: `Premium Wedding Card - Model ${skuNumber}`,
        sku: `MOCK-${skuNumber}`,
        categoryId: categoryId,
        description: `Exquisite premium printing card for special occasions. Featuring glassmorphism design cues. Item number ${skuNumber}.`,
        images: images,
        stock: Math.floor(Math.random() * 500) + 10,
        status: 'active',
        createdAt: new Date().toISOString()
      };
      batch.set(newDocRef, product);
    }

    await batch.commit();
  }

  // Home Slide CRUD
  async addHomeSlide(slide: Omit<HomeSlide, 'id'>) {
    const slidesRef = collection(this.firestore, 'home-slides-kh');
    await addDoc(slidesRef, slide);
  }

  async updateHomeSlide(id: string, slide: Partial<HomeSlide>) {
    const slideRef = doc(this.firestore, `home-slides-kh/${id}`);
    await updateDoc(slideRef, slide);
  }

  async deleteHomeSlide(id: string) {
    const slideRef = doc(this.firestore, `home-slides-kh/${id}`);
    const { deleteDoc } = await import('@angular/fire/firestore');
    await deleteDoc(slideRef);
  }
}
