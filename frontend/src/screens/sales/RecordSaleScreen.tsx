import React, { useState, useMemo, useCallback } from 'react';
import { 
  View, 
  Text, 
  StatusBar, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import LottieView from 'lottie-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { FlashList } from '@shopify/flash-list';
const TypedFlashList = FlashList as any;
import Animated, { 
  FadeIn, 
  FadeOut, 
  SlideInDown, 
  SlideOutDown,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  useSharedValue
} from 'react-native-reanimated';
import { 
  ChevronLeft, 
  Package, 
  Plus, 
  Minus, 
  Search, 
  X, 
  Check, 
  CreditCard,
  Banknote,
  RefreshCw,
  ShoppingCart,
  User,
  Phone,
  Trash2,
  Scan,
  Ticket,
  LayoutGrid,
  List as ListIcon
} from 'lucide-react-native';
import { colors } from '@/theme/colors';
import { useQuery, useMutation } from '@tanstack/react-query';
import { inventoryService } from '@/services/inventoryService';
import { salesService } from '@/services/salesService';
import { useAuth } from '@/context/AuthContext';
import Toast from 'react-native-toast-message';
import type { RootStackScreenProps } from '@/navigation/types';

const { width, height } = Dimensions.get('window');

// ─── TYPES ───────────────────────────────────────────────────
interface CartItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  price_kobo: number; // Normalized to Kobo
  stock: number;
  reserved: number;
}

import { useCartStore } from '@/store/cartStore';
import { retailCategoriesData } from '@/data/retailCategories';

// Helper to find parent category icon for items/subcategories
const getCategoryInfo = (categoryId?: string) => {
  if (!categoryId) return null;
  const cat = retailCategoriesData.find(c => c.id === categoryId);
  if (cat) return cat;
  
  // Look in subcategories
  for (const c of retailCategoriesData) {
    if (c.subcategories) {
      const sub = c.subcategories.find(s => s.id === categoryId);
      if (sub) return c;
    }
  }
  return null;
};

const RecordSaleScreen = ({
  navigation,
  route,
}: RootStackScreenProps<'RecordSale'>) => {
  const { saleId } = (route.params as any) || {};
  const isEditing = !!saleId;

  // ─── GLOBAL CART ─────────────────────────────────────────────
  const { items: globalCartItems, clearCart: clearGlobalCart } = useCartStore();

  // ─── STATE ───────────────────────────────────────────────────
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isCheckoutVisible, setIsCheckoutVisible] = useState(false);
  const [isCartVisible, setIsCartVisible] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  
  // Checkout Info
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discount, setDiscount] = useState('0');
  const [notes, setNotes] = useState('');
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isStoreModalVisible, setIsStoreModalVisible] = useState(false);
  const [lastScannedItem, setLastScannedItem] = useState<any>(null);

  const clearCart = () => {
    setCart({});
    Toast.show({
      type: 'info',
      text1: 'Cart Cleared',
      text2: 'All items removed from cart.'
    });
  };
  
  // ─── CAMERA / SCANNING ───────────────────────────────────────
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);

  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  React.useEffect(() => {
    if (isScanning) {
      requestCameraPermission();
    }
  }, [isScanning]);

  const scanFeedbackY = useSharedValue(50);
  const scanFeedbackOpacity = useSharedValue(0);

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    setScanned(true);
    
    // 1. Try local lookup first for zero-latency
    let foundProduct = products.find((p: any) => 
      p.barcode === data || p.qr_code === data || p.sku === data
    );

    try {
      // 2. If not found locally, hit API
      if (!foundProduct) {
        foundProduct = await inventoryService.scanBarcode(data, selectedStoreId || 'default');
      }

      if (foundProduct) {
        // 3. Feedback & Add
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        addToCart(foundProduct);
        setLastScannedItem(foundProduct);
        
        // Show feedback overlay
        scanFeedbackY.value = withSpring(0);
        scanFeedbackOpacity.value = withTiming(1);
        
        // Hide feedback after delay
        setTimeout(() => {
          scanFeedbackY.value = withSpring(50);
          scanFeedbackOpacity.value = withTiming(0);
        }, 1500);

        // 4. Continuous Mode - Reset scanner after 1.5s to allow next scan
        setTimeout(() => setScanned(false), 1500);
      } else {
        throw new Error("Not found");
      }
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Toast.show({
        type: 'error',
        text1: 'Unknown Barcode',
        text2: `Item with barcode ${data} not found.`
      });
      setTimeout(() => setScanned(false), 2000);
    }
  };

  // Animation for scanner line
  const scanLineY = useSharedValue(0);

  React.useEffect(() => {
    if (isScanning) {
      scanLineY.value = withRepeat(
        withTiming(280, { duration: 1500 }),
        -1,
        true
      );
      setScanned(false);
    } else {
      scanLineY.value = 0;
    }
  }, [isScanning]);

  const animatedScanLine = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLineY.value }]
  }));

  const animatedFeedback = useAnimatedStyle(() => ({
    opacity: scanFeedbackOpacity.value,
    transform: [{ translateY: scanFeedbackY.value }]
  }));

  const { user } = useAuth();

  // ─── DATA FETCHING ──────────────────────────────────────────
  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['products', selectedStoreId],
    queryFn: () => inventoryService.getProducts(0, 200, undefined, undefined, selectedStoreId || undefined),
    enabled: !!user,
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => inventoryService.getStores(),
    enabled: !!user,
  });

  React.useEffect(() => {
    if (stores.length > 0 && !selectedStoreId) {
      setSelectedStoreId(stores[0].id);
    }
  }, [stores, selectedStoreId]);

  // Fetch sale data if editing
  const { data: saleData, isLoading: loadingSale } = useQuery({
    queryKey: ['sale', saleId],
    queryFn: () => salesService.getSale(saleId!),
    enabled: !!saleId,
  });

  React.useEffect(() => {
    if (saleData) {
      setCustomerName(saleData.customer_name || '');
      setCustomerPhone(saleData.customer_phone || '');
      setPaymentMethod(saleData.payment_method as any || 'cash');
      setDiscount((saleData.discount_amount_kobo / 100).toString());
      setNotes(saleData.notes || '');
      setSelectedStoreId(saleData.store_id);
      
      const newCart: Record<string, CartItem> = {};
      saleData.items.forEach((item: any) => {
        // Find matching product to get name/sku if possible
        const product = products.find((p: any) => p.id === item.product_id);
        newCart[item.product_id] = {
          id: item.product_id,
          name: product?.name || 'Item',
          sku: product?.sku || 'N/A',
          quantity: item.quantity_sold,
          unitPrice: item.unit_price_kobo / 100,
          stock: product?.total_quantity_on_hand || 0,
          reserved: product?.total_reserved_quantity || 0
        };
      });
      setCart(newCart);
    }
  }, [saleData, products]);

  const saleMutation = useMutation({
    mutationFn: (data: any) => {
      console.log('RecordSaleScreen: Mutating with payload:', JSON.stringify(data, null, 2));
      return isEditing ? salesService.updateSale(saleId!, data) : salesService.processSale(data);
    },
    onSuccess: (data) => {
      console.log('RecordSaleScreen: Sale mutation successful:', data);
      setIsSuccess(true);
      
      // Clear both local and global cart on success
      setCart({});
      clearGlobalCart();
      
      setTimeout(() => {
        setIsSuccess(false);
        setIsCheckoutVisible(false);
        navigation.navigate('Receipt', { saleId: data.id });
      }, 2500);
    },
    onError: (error: any) => {
      console.error('RecordSaleScreen: Sale mutation failed:', error);
      
      const errorMessage = error.message || 'Something went wrong on the server.';
      const isInsufficientStock = errorMessage.toLowerCase().includes('insufficient stock');
      
      Toast.show({
        type: 'error',
        text1: isInsufficientStock ? 'Insufficient Stock' : 'Recording Failed',
        text2: isInsufficientStock 
          ? 'One or more items exceed available inventory. Please adjust quantities.'
          : errorMessage,
        visibilityTime: 4000,
      });
    }
  });

  // ─── LOGIC ────────────────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    const query = searchQuery.toLowerCase();
    return products.filter((p: any) => 
      p.name.toLowerCase().includes(query) || 
      p.sku?.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  const cartItems = useMemo(() => Object.values(cart), [cart]);
  const cartCount = useMemo(() => cartItems.reduce((acc, item) => acc + item.quantity, 0), [cartItems]);
  const subtotalKobo = useMemo(() => cartItems.reduce((acc, item) => acc + (item.quantity * item.price_kobo), 0), [cartItems]);
  const discountKobo = (parseFloat(discount) || 0) * 100;
  const totalValueKobo = Math.max(0, subtotalKobo - discountKobo);

  const addToCart = useCallback((product: any) => {
    const availableStock = (product.total_quantity_on_hand || 0) - (product.total_reserved_quantity || 0);
    const existingQty = cart[product.id]?.quantity || 0;

    if (existingQty + 1 > availableStock) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Toast.show({
        type: 'error',
        text1: 'Insufficient Stock',
        text2: `Only ${availableStock} units available.`
      });
      return;
    }

    setCart(prev => {
      const existing = prev[product.id];
      if (existing) {
        return {
          ...prev,
          [product.id]: { ...existing, quantity: existing.quantity + 1 }
        };
      }
      return {
        ...prev,
        [product.id]: {
          id: product.id,
          name: product.name,
          sku: product.sku || 'N/A',
          quantity: 1,
          price_kobo: product.selling_price_kobo || 0,
          stock: product.total_quantity_on_hand || 0,
          reserved: product.total_reserved_quantity || 0
        }
      };
    });
  }, [cart]);

  const updateCartQty = useCallback((id: string, delta: number) => {
    const item = cart[id];
    if (!item) return;

    const newQty = item.quantity + delta;
    const availableStock = item.stock - item.reserved;

    if (newQty > availableStock) {
      Toast.show({
        type: 'error',
        text1: 'Insufficient Stock',
        text2: `Only ${availableStock} units available.`
      });
      return;
    }

    setCart(prev => {
      const prevItem = prev[id];
      if (!prevItem) return prev;
      
      const updatedQty = prevItem.quantity + delta;
      if (updatedQty <= 0) {
        const newCart = { ...prev };
        delete newCart[id];
        return newCart;
      }
      return {
        ...prev,
        [id]: { ...prevItem, quantity: updatedQty }
      };
    });
  }, [cart]);

  const handleConfirmSale = () => {
    if (cartItems.length === 0) {
      Toast.show({ type: 'info', text1: 'Empty Cart', text2: 'Please add items to your cart first.' });
      return;
    }

    Toast.show({
      type: 'info',
      text1: 'Processing...',
      text2: 'Recording your transaction',
      autoHide: false
    });

    const payload = {
      store_id: selectedStoreId || (stores[0]?.id) || 'default_store',
      customer_name: customerName || 'Guest',
      customer_phone: customerPhone || null,
      payment_method: paymentMethod,
      discount_amount_kobo: Math.round(discountKobo),
      notes: notes,
      items: cartItems.map(item => ({
        product_id: item.id,
        quantity_sold: item.quantity,
        unit_price_kobo: item.price_kobo
      }))
    };

    saleMutation.mutate(payload);
  };

  // ─── RENDER COMPONENTS ───────────────────────────────────────
  
  const renderProductItem = useCallback(({ item }: { item: any }) => {
    const category = getCategoryInfo(item.category_id);
    const availableQty = Math.max(0, (item.total_quantity_on_hand || 0) - (item.total_reserved_quantity || 0));
    const cartItem = cart[item.id];
    const isInCart = !!cartItem;

    if (viewMode === 'grid') {
      return (
        <TouchableOpacity 
          onPress={() => {
            Haptics.selectionAsync();
            if (!isInCart) addToCart(item);
          }}
          activeOpacity={0.7}
          className="bg-white rounded-[28px] p-4 m-2 border border-gray-100 shadow-md flex-1"
          style={{
            shadowColor: colors.ventureroot.green,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.05,
            shadowRadius: 10,
          }}
        >
          {/* Badge top-left */}
          {availableQty < 10 && (
            <View className="absolute top-3 left-3 z-10 px-2 py-0.5 rounded-lg bg-red-50 border border-red-100">
               <Text className="text-red-600 text-[8px] font-black uppercase">Low Stock</Text>
            </View>
          )}

          <View 
            className="w-full aspect-square rounded-2xl items-center justify-center mb-3"
            style={{ backgroundColor: category?.backgroundColor || '#F8FAFC' }}
          >
            {item.image_url ? (
              <Image source={{ uri: item.image_url }} className="w-full h-full rounded-2xl" resizeMode="cover" />
            ) : category?.icon ? (
              <Image source={category.icon} className="w-12 h-12" resizeMode="contain" />
            ) : (
              <Package size={40} color={colors.ventureroot.green} />
            )}
          </View>
          
          <Text className="text-gray-900 text-sm font-black leading-tight mb-1" numberOfLines={1}>{item.name}</Text>
          <Text className="text-ventureroot-green font-black text-base">₦{(item.selling_price_kobo / 100).toLocaleString()}</Text>
          
          <View className="mt-3 flex-row items-center justify-between">
            <Text className="text-gray-400 text-[9px] font-bold tracking-widest uppercase">
              {availableQty} IN STOCK
            </Text>
            
            {isInCart ? (
              <View className="flex-row items-center bg-gray-50 rounded-xl px-1 py-1 border border-gray-100">
                 <TouchableOpacity onPress={() => updateCartQty(item.id, -1)} className="w-6 h-6 items-center justify-center bg-white rounded-lg">
                    <Minus size={12} color="#475569" strokeWidth={3} />
                 </TouchableOpacity>
                 <Text className="mx-2 text-gray-900 font-black text-xs">{cartItem.quantity}</Text>
                 <TouchableOpacity onPress={() => updateCartQty(item.id, 1)} className="w-6 h-6 items-center justify-center bg-white rounded-lg">
                    <Plus size={12} color="#475569" strokeWidth={3} />
                 </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                onPress={() => addToCart(item)}
                className="bg-ventureroot-green w-8 h-8 rounded-xl items-center justify-center shadow-md shadow-emerald-200"
              >
                <Plus size={16} color="white" strokeWidth={4} />
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity 
        onPress={() => {
          Haptics.selectionAsync();
          if (!isInCart) addToCart(item);
        }}
        activeOpacity={0.7}
        className="bg-white rounded-[32px] p-5 mb-4 mx-1 border border-gray-100 shadow-md flex-row items-center"
        style={{
          shadowColor: colors.ventureroot.green,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
        }}
      >
        <View 
          className="w-20 h-20 rounded-3xl items-center justify-center mr-5"
          style={{ backgroundColor: category?.backgroundColor || '#F8FAFC' }}
        >
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} className="w-full h-full rounded-3xl" resizeMode="cover" />
          ) : category?.icon ? (
            <Image source={category.icon} className="w-10 h-10" resizeMode="contain" />
          ) : (
            <Package size={36} color={colors.ventureroot.green} />
          )}
        </View>

        <View className="flex-1">
          <Text className="text-gray-900 text-lg font-black leading-tight" numberOfLines={1}>{item.name}</Text>
          <View className="flex-row items-center mt-1">
             <Text className="text-ventureroot-green font-black text-base mr-3">₦{(item.selling_price_kobo / 100).toLocaleString()}</Text>
             <View className={`px-2 py-0.5 rounded-md ${availableQty < 10 ? 'bg-red-50' : 'bg-emerald-50'}`}>
                <Text className={`text-[8px] font-black uppercase tracking-tighter ${availableQty < 10 ? 'text-red-600' : 'text-emerald-700'}`}>
                  {availableQty} Stock
                </Text>
             </View>
          </View>
          <Text className="text-gray-400 text-[10px] font-bold mt-2 tracking-wider uppercase">SKU: {item.sku || 'N/A'}</Text>
        </View>

        <View className="items-end ml-2">
          {isInCart ? (
            <View className="flex-row items-center bg-gray-50 rounded-2xl px-2 py-2 border border-gray-100">
               <TouchableOpacity onPress={() => updateCartQty(item.id, -1)} className="w-8 h-8 items-center justify-center bg-white rounded-xl shadow-sm">
                  <Minus size={14} color="#475569" strokeWidth={3} />
               </TouchableOpacity>
               <Text className="mx-3 text-gray-900 font-black text-base">{cartItem.quantity}</Text>
               <TouchableOpacity onPress={() => updateCartQty(item.id, 1)} className="w-8 h-8 items-center justify-center bg-white rounded-xl shadow-sm">
                  <Plus size={14} color="#475569" strokeWidth={3} />
               </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              onPress={() => addToCart(item)}
              className="bg-ventureroot-green w-12 h-12 rounded-2xl items-center justify-center shadow-lg shadow-emerald-200"
            >
              <Plus size={24} color="white" strokeWidth={4} />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [cart, viewMode, addToCart, updateCartQty]);

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      <StatusBar barStyle="dark-content" />
      
      {/* ═══ Header ═══ */}
      <View className="px-6 py-6 flex-row items-center justify-between bg-white border-b border-gray-100 shadow-sm">
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          className="w-12 h-12 rounded-2xl bg-gray-50 items-center justify-center border border-gray-100"
        >
          <ChevronLeft color="#475569" size={24} />
        </TouchableOpacity>
        
        <View className="items-center flex-1">
          <Text className="text-gray-900 text-xl font-black tracking-tight">Sales Terminal</Text>
          <TouchableOpacity 
            onPress={() => setIsStoreModalVisible(true)}
            className="flex-row items-center mt-0.5 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100"
          >
            <Text className="text-ventureroot-green text-[9px] uppercase font-black tracking-widest mr-1">
              {stores.find((s: any) => s.id === selectedStoreId)?.name || 'Select Store'}
            </Text>
            <ChevronLeft size={10} color={colors.ventureroot.green} style={{ transform: [{ rotate: '-90deg' }] }} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          onPress={() => setIsScanning(true)}
          className="bg-ventureroot-green px-5 py-3 rounded-2xl items-center justify-center flex-row shadow-lg shadow-emerald-200"
        >
          <Scan color="white" size={20} strokeWidth={3} />
          <Text className="text-white font-black text-sm uppercase tracking-widest ml-2">Scan</Text>
        </TouchableOpacity>
      </View>

      {/* ═══ Search & View Toggle ═══ */}
      <View className="px-6 pt-6 pb-2 flex-row gap-3">
        <View className="flex-1 bg-white rounded-2xl flex-row items-center px-4 border border-gray-100 shadow-sm h-14">
          <Search size={20} color="#94A3B8" />
          <TextInput 
            className="flex-1 ml-3 text-gray-900 text-base font-medium"
            placeholder="Search products or scan..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94A3B8"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>
        <View className="bg-white rounded-2xl border border-gray-100 shadow-sm h-14 p-1 flex-row">
          <TouchableOpacity 
            onPress={() => setViewMode('list')}
            className={`w-12 h-full rounded-xl items-center justify-center ${viewMode === 'list' ? 'bg-emerald-50' : ''}`}
          >
            <ListIcon size={20} color={viewMode === 'list' ? colors.ventureroot.green : '#94A3B8'} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setViewMode('grid')}
            className={`w-12 h-full rounded-xl items-center justify-center ${viewMode === 'grid' ? 'bg-emerald-50' : ''}`}
          >
            <LayoutGrid size={20} color={viewMode === 'grid' ? colors.ventureroot.green : '#94A3B8'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ═══ Product List ═══ */}
      <View className="flex-1 px-4 pt-4">
        {loadingProducts ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={colors.ventureroot.green} />
          </View>
        ) : (
          <TypedFlashList
            key={viewMode} // Force re-render on toggle
            data={filteredProducts}
            renderItem={renderProductItem}
            estimatedItemSize={viewMode === 'grid' ? 180 : 120}
            numColumns={viewMode === 'grid' ? 2 : 1}
            keyExtractor={(item: any) => item.id}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View className="items-center justify-center pt-20">
                <Package size={64} color="#E2E8F0" />
                <Text className="text-gray-400 mt-4 text-base font-medium">No products found</Text>
              </View>
            }
            contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 8 }}
          />
        )}
      </View>

      {/* ═══ Floating Cart Summary ═══ */}
      {cartCount > 0 && (
        <Animated.View 
          entering={SlideInDown.springify().damping(15)}
          className="absolute bottom-0 left-0 right-0"
        >
          <BlurView intensity={80} tint="light" className="px-6 pt-6 pb-10 border-t border-white/20 overflow-hidden rounded-t-[40px]">
            <View className="absolute inset-0 bg-white/60" />
            
            <View className="flex-row items-center justify-between mb-6">
              <TouchableOpacity 
                onPress={() => setIsCartVisible(true)}
                className="flex-row items-center"
              >
                <View className="bg-ventureroot-green px-3 py-1.5 rounded-full mr-3">
                  <Text className="text-white font-black text-xs">{cartCount}</Text>
                </View>
                <View>
                  <Text className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Selected Items</Text>
                  <Text className="text-gray-900 font-bold text-sm">View Cart Details</Text>
                </View>
              </TouchableOpacity>
              
              <View className="items-end">
                <Text className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Total Amount</Text>
                <Text className="text-ventureroot-green font-black text-2xl">₦{(subtotalKobo / 100).toLocaleString()}</Text>
              </View>
            </View>

            <TouchableOpacity 
              onPress={() => setIsCheckoutVisible(true)}
              className="bg-ventureroot-green h-16 rounded-2xl items-center justify-center shadow-xl shadow-emerald-900/20"
            >
              <View className="flex-row items-center gap-2">
                <ShoppingCart size={20} color="white" />
                <Text className="text-white font-black text-base uppercase tracking-widest">Proceed to Checkout</Text>
              </View>
            </TouchableOpacity>
          </BlurView>
        </Animated.View>
      )}

      {/* ═══ Store Switcher Modal ═══ */}
      <Modal visible={isStoreModalVisible} animationType="fade" transparent>
        <View className="flex-1 bg-black/40 justify-center px-10">
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          <Animated.View entering={FadeIn} className="bg-white rounded-[40px] p-8 shadow-2xl">
            <View className="flex-row items-center justify-between mb-8">
              <Text className="text-2xl font-black text-gray-900">Select Store</Text>
              <TouchableOpacity onPress={() => setIsStoreModalVisible(false)}>
                <X size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            <View className="gap-3">
              {stores.map((store: any) => (
                <TouchableOpacity
                  key={store.id}
                  onPress={() => {
                    setSelectedStoreId(store.id);
                    setIsStoreModalVisible(false);
                  }}
                  className={`p-5 rounded-3xl border-2 flex-row items-center justify-between ${
                    selectedStoreId === store.id 
                    ? 'bg-ventureroot-green/5 border-ventureroot-green' 
                    : 'bg-gray-50 border-transparent'
                  }`}
                >
                  <View>
                    <Text className={`font-bold text-lg ${selectedStoreId === store.id ? 'text-ventureroot-green' : 'text-gray-900'}`}>
                      {store.name}
                    </Text>
                    <Text className="text-gray-400 text-xs font-medium mt-1">{store.location || 'Primary Location'}</Text>
                  </View>
                  {selectedStoreId === store.id && (
                    <View className="bg-ventureroot-green rounded-full p-1">
                      <Check size={16} color="white" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* ═══ Cart Modal ═══ */}
      <Modal visible={isCartVisible} animationType="slide" transparent>
        <View className="flex-1 bg-black/40 justify-end">
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          <View className="bg-white rounded-t-[40px] h-[80%] px-6 pt-8 pb-10">
            <View className="flex-row items-center justify-between mb-8">
              <View className="flex-row items-center">
                <Text className="text-2xl font-black text-gray-900">Your Cart</Text>
                <View className="bg-emerald-50 px-3 py-1 rounded-full ml-3">
                  <Text className="text-ventureroot-green font-bold text-xs">{cartCount} Items</Text>
                </View>
              </View>
              <View className="flex-row items-center gap-4">
                <TouchableOpacity onPress={clearCart} className="flex-row items-center">
                   <Trash2 size={16} color="#EF4444" className="mr-1" />
                   <Text className="text-red-500 font-bold text-xs uppercase">Clear All</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setIsCartVisible(false)}
                  className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center"
                >
                  <X size={20} color="#475569" />
                </TouchableOpacity>
              </View>
            </View>

            <FlashList
              data={cartItems}
              estimatedItemSize={100}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View className="flex-row items-center py-5 border-b border-gray-50">
                  <View className="w-14 h-14 bg-gray-50 rounded-2xl items-center justify-center mr-4">
                    <Package size={24} color={colors.ventureroot.green} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 font-black text-base">{item.name}</Text>
                    <Text className="text-ventureroot-green font-black text-sm mt-1">₦{(item.price_kobo / 100).toLocaleString()}</Text>
                    <Text className="text-gray-400 text-[10px] uppercase font-bold mt-1">SKU: {item.sku}</Text>
                  </View>
                  <View className="flex-row items-center bg-gray-50 rounded-2xl px-3 py-2 border border-gray-100">
                    <TouchableOpacity 
                      onPress={() => updateCartQty(item.id, -1)}
                      className="w-10 h-10 items-center justify-center bg-white rounded-xl shadow-sm"
                    >
                      <Minus size={16} color="#475569" strokeWidth={3} />
                    </TouchableOpacity>
                    <Text className="mx-4 text-gray-900 font-black text-lg">{item.quantity}</Text>
                    <TouchableOpacity 
                      onPress={() => updateCartQty(item.id, 1)}
                      className="w-10 h-10 items-center justify-center bg-white rounded-xl shadow-sm"
                    >
                      <Plus size={16} color="#475569" strokeWidth={3} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
            
            <View className="pt-8 border-t border-gray-50">
               <View className="flex-row justify-between items-center mb-6 px-2">
                 <Text className="text-gray-400 font-bold uppercase tracking-widest text-xs">Total Amount</Text>
                 <Text className="text-gray-900 font-black text-3xl">₦{(subtotalKobo / 100).toLocaleString()}</Text>
               </View>
               <TouchableOpacity 
                onPress={() => { setIsCartVisible(false); setIsCheckoutVisible(true); }}
                className="bg-ventureroot-green h-20 rounded-[24px] items-center justify-center shadow-xl shadow-emerald-200"
              >
                <Text className="text-white font-black text-lg uppercase tracking-widest">Confirm & Checkout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ═══ Checkout Modal ═══ */}
      <Modal visible={isCheckoutVisible} animationType="slide" transparent>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <View className="flex-1 bg-black/40 justify-end">
            <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
            <View className="bg-white rounded-t-[40px] h-[90%] px-6 pt-8">
              <View className="flex-row items-center justify-between mb-8">
                <Text className="text-2xl font-black text-gray-900">Complete Sale</Text>
                <TouchableOpacity 
                  onPress={() => setIsCheckoutVisible(false)}
                  className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center"
                >
                  <X size={20} color="#475569" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Customer Details */}
                <Text className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-3">Customer Information</Text>
                <View className="gap-4 mb-8">
                  <View className="bg-gray-50 rounded-2xl px-4 flex-row items-center h-14">
                    <User size={18} color="#94A3B8" />
                    <TextInput 
                      className="flex-1 ml-3 font-bold text-gray-900"
                      placeholder="Customer Name (Optional)"
                      value={customerName}
                      onChangeText={setCustomerName}
                    />
                  </View>
                  <View className="bg-gray-50 rounded-2xl px-4 flex-row items-center h-14">
                    <Phone size={18} color="#94A3B8" />
                    <TextInput 
                      className="flex-1 ml-3 font-bold text-gray-900"
                      placeholder="Phone Number (Optional)"
                      value={customerPhone}
                      onChangeText={setCustomerPhone}
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>

                {/* Payment Method */}
                <Text className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-3">Payment Method</Text>
                <View className="flex-row gap-2 mb-8">
                  {[
                    { id: 'cash', label: 'Cash', icon: Banknote },
                    { id: 'transfer', label: 'Transfer', icon: RefreshCw },
                    { id: 'card', label: 'Card', icon: CreditCard },
                  ].map((item) => (
                    <TouchableOpacity 
                      key={item.id}
                      onPress={() => setPaymentMethod(item.id as any)}
                      className={`flex-1 py-4 rounded-2xl border flex-row items-center justify-center gap-2 ${
                        paymentMethod === item.id 
                        ? 'bg-ventureroot-green/5 border-ventureroot-green' 
                        : 'bg-gray-50 border-transparent'
                      }`}
                    >
                      <item.icon size={18} color={paymentMethod === item.id ? colors.ventureroot.green : '#94A3B8'} />
                      <Text className={`text-xs font-black ${paymentMethod === item.id ? 'text-ventureroot-green' : 'text-gray-500'}`}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Discount */}
                <Text className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-3">Adjustments</Text>
                <View className="bg-gray-50 rounded-2xl px-4 flex-row items-center h-14 mb-8">
                  <Ticket size={18} color="#94A3B8" />
                  <TextInput 
                    className="flex-1 ml-3 font-bold text-gray-900"
                    placeholder="Discount Amount (₦)"
                    value={discount}
                    onChangeText={setDiscount}
                    keyboardType="numeric"
                  />
                </View>

                {/* Final Summary */}
                <View className="bg-slate-900 rounded-[32px] p-8 shadow-xl mb-10 overflow-hidden relative">
                  <View className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full" />
                  
                  <View className="items-center">
                    <Text className="text-white/40 text-[10px] font-black uppercase tracking-[3px] mb-2">Final Checkout</Text>
                    <View className="flex-row items-start">
                      <Text className="text-white/60 text-lg font-bold mt-1 mr-1">₦</Text>
                      <Text className="text-white text-5xl font-black">{(totalValueKobo / 100).toLocaleString()}</Text>
                    </View>
                    
                    <View className="w-full mt-6 pt-6 border-t border-white/10 flex-row justify-between items-center">
                      <View>
                        <Text className="text-white/40 text-[10px] uppercase font-bold">Subtotal</Text>
                        <Text className="text-white font-bold">₦{(subtotalKobo / 100).toLocaleString()}</Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-white/40 text-[10px] uppercase font-bold">Discount</Text>
                        <Text className="text-red-400 font-bold">-₦{(discountKobo / 100).toLocaleString()}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                <TouchableOpacity 
                  disabled={saleMutation.isPending}
                  onPress={handleConfirmSale}
                  className={`h-16 rounded-2xl items-center justify-center shadow-lg ${
                    saleMutation.isPending ? 'bg-gray-300' : 'bg-ventureroot-green'
                  }`}
                >
                   {saleMutation.isPending ? (
                     <ActivityIndicator color="white" />
                   ) : (
                     <Text className="text-white font-black text-base uppercase tracking-widest">{isEditing ? 'Update Sale' : 'Finalize Transaction'}</Text>
                   )}
                </TouchableOpacity>

                <View className="h-10" />
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ═══ Barcode Scanner Overlay ═══ */}
      <Modal visible={isScanning} animationType="slide" transparent>
        <View className="flex-1 bg-black">
          {hasPermission === null ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="white" />
            </View>
          ) : hasPermission === false ? (
            <View className="flex-1 items-center justify-center p-8">
              <Text className="text-white text-center text-lg font-bold mb-6">Camera permission is required to scan barcodes.</Text>
              <TouchableOpacity 
                onPress={requestCameraPermission}
                className="bg-ventureroot-green px-8 py-4 rounded-2xl"
              >
                <Text className="text-white font-black">Grant Permission</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setIsScanning(false)}
                className="mt-6"
              >
                <Text className="text-gray-400 font-bold">Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <CameraView
              style={StyleSheet.absoluteFillObject}
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ["qr", "ean13", "upc_a", "code128"],
              }}
            >
              <SafeAreaView className="flex-1">
                <View className="p-8 flex-row items-center justify-between">
                  <TouchableOpacity 
                    onPress={() => setIsScanning(false)}
                    className="w-12 h-12 bg-black/40 rounded-2xl items-center justify-center border border-white/20"
                  >
                    <X color="white" size={24} />
                  </TouchableOpacity>
                  <View className="bg-black/40 px-4 py-2 rounded-full border border-white/10">
                    <Text className="text-white font-black uppercase tracking-[2px] text-[10px]">Scanning Terminal</Text>
                  </View>
                  <View className="w-12" />
                </View>
                
                <View className="flex-1 items-center justify-center">
                  {/* Scanner Frame */}
                  <View className="w-80 h-80 border-2 border-white/20 rounded-[56px] items-center justify-center overflow-hidden">
                    <View className="absolute inset-0 bg-black/20" />
                    
                    {/* Animated Scan Line */}
                    <Animated.View 
                      style={[
                        { 
                          width: '100%', 
                          height: 3, 
                          backgroundColor: colors.ventureroot.green,
                          position: 'absolute',
                          top: 0,
                          shadowColor: colors.ventureroot.green,
                          shadowOffset: { width: 0, height: 0 },
                          shadowOpacity: 1,
                          shadowRadius: 15,
                        },
                        animatedScanLine
                      ]}
                    />
                    
                    {/* Corners */}
                    <View className="absolute top-8 left-8 w-10 h-10 border-t-4 border-l-4 border-ventureroot-green rounded-tl-2xl" />
                    <View className="absolute top-8 right-8 w-10 h-10 border-t-4 border-r-4 border-ventureroot-green rounded-tr-2xl" />
                    <View className="absolute bottom-8 left-8 w-10 h-10 border-b-4 border-l-4 border-ventureroot-green rounded-bl-2xl" />
                    <View className="absolute bottom-8 right-8 w-10 h-10 border-b-4 border-r-4 border-ventureroot-green rounded-br-2xl" />
                  </View>
                  
                  <View className="mt-10 bg-black/40 px-6 py-3 rounded-2xl border border-white/10">
                    <Text className="text-white/80 text-xs font-black uppercase tracking-widest text-center">
                      Align barcode within the frame
                    </Text>
                  </View>

                  {/* Last Scanned Feedback Overlay */}
                  <Animated.View 
                    style={animatedFeedback}
                    className="absolute bottom-10 bg-ventureroot-green/90 px-6 py-4 rounded-3xl flex-row items-center border border-white/20 shadow-2xl"
                  >
                    <View className="w-10 h-10 bg-white/20 rounded-full items-center justify-center mr-4">
                      <Check color="white" size={20} />
                    </View>
                    <View>
                      <Text className="text-white/60 text-[10px] font-black uppercase tracking-widest">Added to Cart</Text>
                      <Text className="text-white font-bold text-base">{lastScannedItem?.name}</Text>
                    </View>
                  </Animated.View>
                </View>
                
                <View className="p-12 items-center">
                  <TouchableOpacity 
                    onPress={() => setIsScanning(false)}
                    className="bg-white/10 px-10 py-5 rounded-[24px] border border-white/20"
                  >
                    <Text className="text-white font-black uppercase tracking-widest text-xs">Close Scanner</Text>
                  </TouchableOpacity>
                </View>
              </SafeAreaView>
            </CameraView>
          )}
        </View>
      </Modal>

      {/* ═══ Success Animation Overlay ═══ */}
      <Modal visible={isSuccess} transparent animationType="fade">
        <View className="flex-1 bg-white items-center justify-center p-8">
          <Animated.View entering={FadeIn.delay(300)}>
            <View className="w-64 h-64 items-center justify-center">
              {/* Confetti Animation - Add success-confetti.json to assets/animations/ if available */}
              {/* <LottieView
                source={require('@assets/animations/success-confetti.json')}
                autoPlay
                loop={false}
                style={{ width: 400, height: 400, position: 'absolute' }}
              /> */}
              <View className="bg-ventureroot-green w-24 h-24 rounded-full items-center justify-center shadow-2xl shadow-emerald-500/40">
                <Check color="white" size={48} strokeWidth={4} />
              </View>
            </View>
          </Animated.View>
          
          <Animated.View entering={FadeIn.delay(800)} className="items-center mt-8">
            <Text className="text-gray-900 text-3xl font-black text-center mb-2">Sale Recorded!</Text>
            <Text className="text-gray-400 text-center font-bold px-4">Inventory levels have been updated and receipt generated.</Text>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default RecordSaleScreen;
