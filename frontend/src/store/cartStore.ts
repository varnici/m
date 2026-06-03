import { create } from 'zustand';

export interface CartItem {
  id: string;
  name: string;
  sku: string;
  price_kobo: number;
  quantity: number;
  image_url?: string;
}

interface CartState {
  items: CartItem[];
  addItem: (product: any) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPriceKobo: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  
  addItem: (product) => {
    const items = get().items;
    const existingItem = items.find((i) => i.id === product.id);
    
    if (existingItem) {
      set({
        items: items.map((i) =>
          i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        ),
      });
    } else {
      set({
        items: [
          ...items,
          {
            id: product.id,
            name: product.name,
            sku: product.sku,
            price_kobo: product.selling_price_kobo,
            quantity: 1,
            image_url: product.image_url,
          },
        ],
      });
    }
  },
  
  removeItem: (productId) => {
    set({ items: get().items.filter((i) => i.id !== productId) });
  },
  
  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }
    set({
      items: get().items.map((i) =>
        i.id === productId ? { ...i, quantity } : i
      ),
    });
  },
  
  clearCart: () => set({ items: [] }),
  
  getTotalItems: () => {
    return get().items.reduce((total, item) => total + item.quantity, 0);
  },
  
  getTotalPriceKobo: () => {
    return get().items.reduce((total, item) => total + (item.price_kobo * item.quantity), 0);
  },
}));
