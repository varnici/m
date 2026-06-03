import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ChevronLeft, 
  CreditCard, 
  Truck, 
  MapPin, 
  CheckCircle2,
  Lock,
  User,
  Phone,
} from 'lucide-react-native';
import { inventoryService } from '@/services/inventoryService';
import { useAuth } from '@/context/AuthContext';
import type { RootStackScreenProps } from '@/navigation/types';
import { useCartStore } from '@/store/cartStore';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

const CheckoutScreen = ({ navigation, route }: RootStackScreenProps<'Checkout'>) => {
  const { totalKobo } = route.params;
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { items, clearCart } = useCartStore();
  const { user } = useAuth();

  // Shipping Form State
  const [name, setName] = useState(user?.user_metadata?.full_name || '');
  const [phone, setPhone] = useState(user?.user_metadata?.phone || '');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Lagos');

  const shippingFeeKobo = 250000; // Flat ₦2,500 shipping fee
  const grandTotalKobo = totalKobo + shippingFeeKobo;

  const handlePayment = async () => {
    if (!address || !city || !phone) {
      Alert.alert('Missing Information', 'Please fill in your delivery details.');
      return;
    }

    setIsProcessing(true);
    try {
      const payload = {
        customer_name: name,
        customer_phone: phone,
        payment_method: 'wallet',
        shipping_address: address,
        shipping_city: city,
        shipping_state: state,
        shipping_fee_kobo: shippingFeeKobo,
        items: items.map(item => ({
          product_id: item.id,
          quantity_sold: item.quantity,
          unit_price_kobo: item.price_kobo
        }))
      };

      await inventoryService.marketplaceCheckout(payload);
      
      setIsSuccess(true);
      clearCart();
    } catch (error: any) {
      console.error('Checkout error:', error);
      Alert.alert('Checkout Failed', error.message || 'Something went wrong. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isSuccess) {
    return (
      <View style={styles.successContainer}>
        <Animated.View entering={ZoomIn} style={styles.successCard}>
          <CheckCircle2 size={80} color="#16A34A" />
          <Text style={styles.successTitle}>Order Placed!</Text>
          <Text style={styles.successSubtitle}>
            Your order has been received and is being processed. You will receive an update shortly.
          </Text>
          <TouchableOpacity 
            style={styles.successBtn}
            onPress={() => navigation.navigate('Shop')}
          >
            <Text style={styles.successBtnText}>Continue Shopping</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Delivery Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Truck size={20} color="#16A34A" />
            <Text style={styles.sectionTitle}>Delivery Information</Text>
          </View>
          
          <View style={styles.formCard}>
            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <User size={18} color="#9CA3AF" />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <Phone size={18} color="#9CA3AF" />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Phone Number"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <MapPin size={18} color="#9CA3AF" />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Delivery Address"
                value={address}
                onChangeText={setAddress}
                multiline
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <TextInput
                  style={styles.input}
                  placeholder="City"
                  value={city}
                  onChangeText={setCity}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                <TextInput
                  style={styles.input}
                  placeholder="State"
                  value={state}
                  onChangeText={setState}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Payment Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CreditCard size={20} color="#16A34A" />
            <Text style={styles.sectionTitle}>Payment Method</Text>
          </View>
          <View style={styles.card}>
            <TouchableOpacity style={styles.paymentOption}>
              <View style={styles.radioActive} />
              <View>
                <Text style={styles.paymentLabel}>VentureRoot Wallet</Text>
                <Text style={styles.paymentSub}>Balance: ₦250,000.00</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Order Review */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Summary</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryLine}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>₦{(totalKobo / 100).toLocaleString()}</Text>
            </View>
            <View style={styles.summaryLine}>
              <Text style={styles.summaryLabel}>Shipping Fee</Text>
              <Text style={styles.summaryValue}>₦{(shippingFeeKobo / 100).toLocaleString()}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>₦{(grandTotalKobo / 100).toLocaleString()}</Text>
            </View>
            <View style={styles.secureTag}>
              <Lock size={12} color="#6B7280" />
              <Text style={styles.secureText}>End-to-end encrypted payment</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.payBtn, isProcessing && styles.payBtnDisabled]}
          onPress={handlePayment}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Text style={styles.payBtnText}>Pay ₦{(grandTotalKobo / 100).toLocaleString()}</Text>
              <Lock size={18} color="#FFF" />
            </>
          )}
        </TouchableOpacity>
      </View>
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
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  scroll: { flex: 1 },
  section: { padding: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#F3F4F6' },
  infoRow: { flexDirection: 'row', gap: 12 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, color: '#9CA3AF', marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  paymentOption: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  radioActive: { 
    width: 20, height: 20, 
    borderRadius: 10, 
    borderWidth: 6, 
    borderColor: '#16A34A',
    backgroundColor: '#FFF'
  },
  paymentLabel: { fontSize: 14, fontWeight: '700', color: '#111827' },
  paymentSub: { fontSize: 12, color: '#6B7280' },
  summaryCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#F3F4F6' },
  summaryLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  totalLabel: { fontSize: 16, fontWeight: '800', color: '#111827' },
  totalValue: { fontSize: 22, fontWeight: '900', color: '#111827' },
  secureTag: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, justifyContent: 'center' },
  secureText: { fontSize: 11, color: '#6B7280' },
  
  // Form Styles
  formCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#F3F4F6' },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 12, fontSize: 14, color: '#111827' },
  row: { flexDirection: 'row' },
  footer: { padding: 16, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  payBtn: {
    backgroundColor: '#111827',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 12,
  },
  payBtnDisabled: { opacity: 0.7 },
  payBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  successContainer: { flex: 1, backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center', padding: 20 },
  successCard: {
    backgroundColor: '#FFF',
    width: '100%',
    borderRadius: 32,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  successTitle: { fontSize: 24, fontWeight: '900', color: '#111827', marginTop: 24, marginBottom: 12 },
  successSubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  successBtn: { backgroundColor: '#16A34A', width: '100%', paddingVertical: 18, borderRadius: 16, alignItems: 'center' },
  successBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
});

export default CheckoutScreen;
