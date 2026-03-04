import { CartSessionManager } from './cart-session-manager';

// Cart utilities for session management and cart operations
export class CartSession {
  
  // Get or create session ID using centralized manager
  static getSessionId(): string {
    return CartSessionManager.getSessionId();
  }
  
  // Clear session (useful for testing or logout)
  static clearSession(): void {
    CartSessionManager.clearSession();
  }
  
  // Get session info for debugging
  static getSessionInfo() {
    return CartSessionManager.getSessionInfo();
  }
}

import { Database } from '@/app/types/database';

// Cart item types from Database
export type CartItemRow = Database['public']['Tables']['cart_items']['Row'];
export type CartItemInsert = Database['public']['Tables']['cart_items']['Insert'];
export type CartItemUpdate = Database['public']['Tables']['cart_items']['Update'];

// Cart item interface with joined product data
export interface CartItemData extends CartItemRow {
  // Customer notes for the item
  notes?: string | null;
  // Custom image URL for clone products
  custom_image_url?: string | null;
  // Joined product data
  products?: {
    name: string;
    product_code: string | null;
    main_image_url: string | null;
  };
}

// Memory cache for cart data (no localStorage usage as per requirements)
export class CartCache {
  private static cache: Map<string, CartItemData[]> = new Map();
  private static TTL_MS = 5 * 60 * 1000; // 5 minutes TTL
  private static timestamps: Map<string, number> = new Map();
  
  static set(key: string, data: CartItemData[]): void {
    this.cache.set(key, data);
    this.timestamps.set(key, Date.now());
  }
  
  static get(key: string): CartItemData[] | null {
    const timestamp = this.timestamps.get(key);
    if (!timestamp || Date.now() - timestamp > this.TTL_MS) {
      this.cache.delete(key);
      this.timestamps.delete(key);
      return null;
    }
    return this.cache.get(key) || null;
  }
  
  static clear(key?: string): void {
    if (key) {
      this.cache.delete(key);
      this.timestamps.delete(key);
    } else {
      this.cache.clear();
      this.timestamps.clear();
    }
  }
  
  static isExpired(key: string): boolean {
    const timestamp = this.timestamps.get(key);
    return !timestamp || Date.now() - timestamp > this.TTL_MS;
  }
}