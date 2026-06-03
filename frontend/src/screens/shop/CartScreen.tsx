import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ChevronLeft, 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingCart,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react-native';
import { useCartStore } from '@/store/cartStore';
import type { RootStackScreenProps } from '@/navigation/types';
import Animated, { FadeInRight, FadeOutLeft, SlideInDown } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const CartScreen = ({ navigation }: RootStackScreenProps<'Cart'>) => {
  const { items, updateQuantity, removeItem, getTotalPriceKobo, getTotalItems } = useCartStore();
  const subtotal = getTotalPriceKobo() / 100;
  const deliveryFee = subtotal > 5000 ? 0 : 500;
  const total = subtotal + deliveryFee;

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ChevronLeft size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Your Cart</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <ShoppingCart size={48} color="#D1D5DB" />
          </View>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>
            Looks like you haven't added anything to your cart yet.
          </Text>
          <TouchableOpacity 
            style={styles.browseBtn}
            onPress={() => navigation.navigate('Shop')}
          >
            <Text style={styles.browseBtnText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Cart ({getTotalItems()})</Text>
        <TouchableOpacity onPress={() => {}} style={styles.backBtn}>
          <Trash2 size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.itemsList}>
          {items.map((item, index) => (
            <Animated.View 
              key={item.id}
              entering={FadeInRight.delay(index * 100)}
              exiting={FadeOutLeft}
              style={styles.cartItem}
            >
              <View style={styles.itemImageContainer}>
                {item.image_url ? (
                  <Image source={{ uri: item.image_url }} style={styles.itemImage} />
                ) : (
                  <ShoppingCart size={24} color="#9CA3AF" />
                )}
              </View>

              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.itemSku}>SKU: {item.sku}</Text>
                <Text style={styles.itemPrice}>₦{(item.price_kobo / 100).toLocaleString()}</Text>
              </View>

              <View style={styles.quantityControls}>
                <TouchableOpacity 
                  onPress={() => updateQuantity(item.id, item.quantity - 1)}
                  style={styles.qtyBtn}
                >
                  <Minus size={14} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{item.quantity}</Text>
                <TouchableOpacity 
                  onPress={() => updateQuantity(item.id, item.quantity + 1)}
                  style={styles.qtyBtn}
                >
                  <Plus size={14} color="#111827" />
                </TouchableOpacity>
              </View>
            </Animated.View>
          ))}
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>₦{subtotal.toLocaleString()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={[styles.summaryValue, deliveryFee === 0 && { color: '#16A34A' }]}>
              {deliveryFee === 0 ? 'FREE' : `₦${deliveryFee.toLocaleString()}`}
            </Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₦{total.toLocaleString()}</Text>
          </View>

          <View style={styles.trustBadge}>
            <ShieldCheck size={16} color="#16A34A" />
            <Text style={styles.trustText}>Secure checkout powered by VentureRoot</Text>
          </View>
        </View>
      </ScrollView>

      <Animated.View 
        entering={SlideInDown}
        style={styles.footer}
      >
        <TouchableOpacity 
          style={styles.checkoutBtn}
          onPress={() => navigation.navigate('Checkout', { totalKobo: total * 100 })}
        >
          <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
          <ArrowRight size={20} color="#FFF" />
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backBtn: {
    width: 40, height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  scroll: { flex: 1 },
  itemsList: { padding: 16, gap: 16 },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  itemImageContainer: {
    width: 60, height: 60,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemImage: { width: '100%', height: '100%', borderRadius: 12 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
  itemSku: { fontSize: 10, color: '#9CA3AF', marginBottom: 4 },
  itemPrice: { fontSize: 14, fontWeight: '800', color: '#16A34A' },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 4,
  },
  qtyBtn: {
    width: 28, height: 28,
    borderRadius: 8,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  qtyText: { fontSize: 14, fontWeight: '700', paddingHorizontal: 10, color: '#111827' },
  summaryCard: {
    backgroundColor: '#FFF',
    margin: 16,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  summaryTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 16 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: { fontSize: 14, color: '#6B7280' },
  summaryValue: { fontSize: 14, fontWeight: '700', color: '#111827' },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
    marginTop: 4,
  },
  totalLabel: { fontSize: 16, fontWeight: '800', color: '#111827' },
  totalValue: { fontSize: 20, fontWeight: '900', color: '#16A34A' },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    backgroundColor: '#F0FDF4',
    padding: 10,
    borderRadius: 12,
  },
  trustText: { fontSize: 11, color: '#166534', fontWeight: '600' },
  footer: {
    padding: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  checkoutBtn: {
    backgroundColor: '#16A34A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
  },
  checkoutBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 100, height: 100,
    borderRadius: 50,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginBottom: 32 },
  browseBtn: {
    backgroundColor: '#111827',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
  },
  browseBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});

export default CartScreen;
