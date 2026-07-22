import { Injectable, signal } from '@angular/core';

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
  // Signals for state management
  categories = signal<Category[]>([
    { id: 'c1', name: 'Wedding Cards', image: 'assets/images/card1.png', description: 'Premium Indian Wedding Cards', status: 'active' },
    { id: 'c2', name: 'Greeting Cards', image: 'assets/images/card2.png', description: 'Elegant Greeting Cards', status: 'active' },
    { id: 'c3', name: 'Religious Cards', image: 'assets/images/card3.png', description: 'Traditional Religious Invites', status: 'active' }
  ]);

  products = signal<Product[]>([
    {
      id: 'p1',
      name: 'Royal Maroon Floral Invite',
      sku: 'W-001',
      categoryId: 'c1',
      description: 'A luxurious maroon wedding card with gold floral motifs and an elegant envelope.',
      stock: 5000,
      status: 'active',
      images: ['assets/images/card1.png', 'assets/images/card2.png', 'assets/images/card3.png']
    },
    {
      id: 'p2',
      name: 'Modern Geometric Gold Cream',
      sku: 'G-001',
      categoryId: 'c2',
      description: 'A contemporary cream greeting card featuring gold geometric patterns and a premium seal.',
      stock: 2500,
      status: 'active',
      images: ['assets/images/card2.png', 'assets/images/card1.png']
    },
    {
      id: 'p3',
      name: 'Traditional Ganesha Red Card',
      sku: 'R-001',
      categoryId: 'c3',
      description: 'Traditional Hindu wedding invitation with a prominent gold Ganesha design on a red background.',
      stock: 1200,
      status: 'active',
      images: ['assets/images/card3.png', 'assets/images/card1.png']
    }
  ]);

  orders = signal<Order[]>([
    {
      id: 'ORD-1001',
      customerName: 'Rahul Sharma',
      phone: '+91 9876543210',
      email: 'rahul.s@example.com',
      address: '123, MG Road, New Delhi, India',
      notes: 'Please ensure high quality packaging.',
      items: [{ productId: 'p1', quantity: 500 }],
      status: 'pending',
      date: new Date().toISOString()
    }
  ]);

  cart = signal<OrderItem[]>([]);

  constructor() { }

  // Actions
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

  placeOrder(customerDetails: Omit<Order, 'id' | 'items' | 'status' | 'date'>) {
    const newOrder: Order = {
      ...customerDetails,
      id: 'ORD-' + Math.floor(1000 + Math.random() * 9000),
      items: [...this.cart()],
      status: 'pending',
      date: new Date().toISOString()
    };
    this.orders.update(orders => [newOrder, ...orders]);
    this.clearCart();
    return newOrder;
  }

  generateBill(orderId: string) {
    // Update order status and reduce stock
    const currentOrders = this.orders();
    const orderIndex = currentOrders.findIndex(o => o.id === orderId);
    if (orderIndex > -1) {
      const order = currentOrders[orderIndex];
      order.status = 'completed';
      
      const currentProducts = [...this.products()];
      order.items.forEach(item => {
        const productIndex = currentProducts.findIndex(p => p.id === item.productId);
        if (productIndex > -1) {
          currentProducts[productIndex].stock = Math.max(0, currentProducts[productIndex].stock - item.quantity);
        }
      });
      
      this.orders.set([...currentOrders]);
      this.products.set(currentProducts);
    }
  }

  // Generic CRUD for Admin
  addCategory(category: Omit<Category, 'id'>) {
    const newCat = { ...category, id: 'c' + Date.now() };
    this.categories.update(cats => [newCat, ...cats]);
  }
  
  addProduct(product: Omit<Product, 'id'>) {
    const newProd = { ...product, id: 'p' + Date.now() };
    this.products.update(prods => [newProd, ...prods]);
  }
}
