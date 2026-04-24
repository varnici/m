import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ChevronLeft, 
  ShoppingCart, 
  Star, 
  ShieldCheck, 
  Truck, 
  Plus, 
  Minus,
  Heart,
  Share2,
  Package,
  MapPin,
  Store,
  CheckCircle
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { inventoryService } from '@/services/inventoryService';
import { getCategoryInfo } from '@/data/retailCategories';
import type { RootStackScreenProps } from '@/navigation/types';
import { useCartStore } from '@/store/cartStore';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const ShopProductDetailScreen = ({ navigation, route }: RootStackScreenProps<'ShopProductDetail'>) => {
  const { product } = route.params;
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);
  const { addItem } = useCartStore();

  const category = getCategoryInfo(product.category_id);
  const placeholderColor = category?.backgroundColor || '#F0FDF4';

  const { data: allProducts = [] } = useQuery({
    queryKey: ['shop_products_all'],
    queryFn: () => inventoryService.getProducts(0, 20),
  });

  // Filter out the current product and slice 4 for recommendations
  const similarProducts = allProducts.filter((p: any) => p.id !== product.id).slice(0, 4);

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addItem({
        id: product.id,
        name: product.name,
        price_kobo: product.selling_price_kobo,
        sku: product.sku || '',
        quantity: 1,
      });
    }
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* Product Image Section */}
        <View style={[styles.imageContainer, { backgroundColor: placeholderColor }]}>
          {product.image_url ? (
            <Image source={{ uri: product.image_url }} style={styles.image} />
          ) : category?.icon ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Image source={category.icon} style={{ width: '50%', height: '50%' }} resizeMode="contain" />
            </View>
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Package size={64} color="#9CA3AF" />
            </View>
          )}
          
          <SafeAreaView style={styles.headerActions} edges={['top']}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()}
              style={styles.actionBtn}
            >
              <ChevronLeft size={24} color="#111827" />
            </TouchableOpacity>
            
            <View style={styles.rightActions}>
              <TouchableOpacity 
                style={styles.actionBtn}
                onPress={() => setIsFavorite(!isFavorite)}
              >
                <Heart 
                  size={22} 
                  color={isFavorite ? '#EF4444' : '#111827'} 
                  fill={isFavorite ? '#EF4444' : 'transparent'} 
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn}>
                <Share2 size={22} color="#111827" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>

        {/* Product Info Section */}
        <View style={styles.infoContainer}>
          <View style={styles.badgeRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>New Arrival</Text>
            </View>
            <View style={styles.ratingBox}>
              <Star size={14} color="#F59E0B" fill="#F59E0B" />
              <Text style={styles.ratingText}>4.8 (124 reviews)</Text>
            </View>
          </View>

          <Text style={styles.title}>{product.name}</Text>
          <Text style={styles.price}>₦{(product.selling_price_kobo / 100).toLocaleString()}</Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Product Description</Text>
          <Text style={styles.description}>
            {product.description || "Experience the premium quality of VentureRoot products. Sourced directly from local manufacturers to ensure you get the best value for your money. This product undergoes rigorous quality checks to meet our high standards of excellence."}
          </Text>

          <View style={styles.trustStrip}>
            <View style={styles.trustItem}>
              <View style={styles.trustIconBox}>
                <ShieldCheck size={20} color="#16A34A" />
              </View>
              <Text style={styles.trustText}>Quality Assured</Text>
            </View>
            <View style={styles.trustItem}>
              <View style={styles.trustIconBox}>
                <Truck size={20} color="#16A34A" />
              </View>
              <Text style={styles.trustText}>Fast Delivery</Text>
            </View>
          </View>

          {/* Shop Details */}
          <Text style={styles.sectionTitle}>Sold By</Text>
          <View style={styles.shopCard}>
            <View style={styles.shopHeader}>
              <View style={styles.shopAvatar}>
                <Store size={20} color="#16A34A" />
              </View>
              <View style={styles.shopInfo}>
                <Text style={styles.shopName}>VentureRoot Official</Text>
                <View style={styles.shopMetaRow}>
                  <CheckCircle size={12} color="#16A34A" />
                  <Text style={styles.shopMetaText}>Verified Retailer</Text>
                </View>
              </View>
            </View>
            <View style={styles.shopDetailsRow}>
              <View style={styles.shopDetailItem}>
                <MapPin size={14} color="#6B7280" />
                <Text style={styles.shopDetailText}>Lagos, Nigeria</Text>
              </View>
              <View style={styles.shopDetailItem}>
                <Truck size={14} color="#6B7280" />
                <Text style={styles.shopDetailText}>Delivery Available</Text>
              </View>
            </View>
            
            {/* Map Placeholder */}
            <View style={styles.mapPlaceholder}>
              <View style={styles.mapPinShadow} />
              <MapPin size={28} color="#EF4444" style={styles.mapPinIcon} />
              <View style={styles.mapLinesContainer}>
                <View style={styles.mapLineH} />
                <View style={styles.mapLineV} />
                <View style={[styles.mapLineH, { top: '70%' }]} />
              </View>
              <Text style={styles.mapText}>Tap to view on map</Text>
            </View>
          </View>

          {/* Quantity Selector */}
          <View style={styles.quantitySection}>
            <Text style={styles.sectionTitle}>Select Quantity</Text>
            <View style={styles.quantityPicker}>
              <TouchableOpacity 
                style={styles.qtyBtn}
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Minus size={20} color="#111827" strokeWidth={3} />
              </TouchableOpacity>
              <Text style={styles.qtyValue}>{quantity}</Text>
              <TouchableOpacity 
                style={styles.qtyBtn}
                onPress={() => setQuantity(quantity + 1)}
              >
                <Plus size={20} color="#111827" strokeWidth={3} />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Recommendations */}
          {similarProducts.length > 0 && (
            <View style={styles.recommendationsSection}>
              <Text style={styles.sectionTitle}>You Might Also Like</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -24 }} contentContainerStyle={{ paddingHorizontal: 24 }}>
                {similarProducts.map((item: any, index: number) => {
                  const itemCat = getCategoryInfo(item.category_id);
                  const itemColor = itemCat?.backgroundColor || '#F0FDF4';
                  return (
                    <TouchableOpacity 
                      key={item.id} 
                      style={[styles.recCard, { marginRight: index === similarProducts.length - 1 ? 0 : 16 }]}
                      onPress={() => {
                        navigation.push('ShopProductDetail', { product: item });
                      }}
                    >
                      <View style={[styles.recImageContainer, { backgroundColor: itemColor }]}>
                        {item.image_url ? (
                          <Image source={{ uri: item.image_url }} style={styles.recImage} />
                        ) : itemCat?.icon ? (
                          <Image source={itemCat.icon} style={{ width: '60%', height: '60%' }} resizeMode="contain" />
                        ) : (
                          <Package size={24} color="#9CA3AF" />
                        )}
                      </View>
                      <Text style={styles.recName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.recPrice}>₦{((item.selling_price_kobo || 0) / 100).toLocaleString()}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      {/* Footer Add to Cart */}
      <Animated.View entering={SlideInDown} style={styles.footer}>
        <View style={styles.footerContent}>
          <View>
            <Text style={styles.totalLabel}>Total Price</Text>
            <Text style={styles.totalValue}>₦{( (product.selling_price_kobo * quantity) / 100).toLocaleString()}</Text>
          </View>
          <TouchableOpacity 
            style={styles.addToCartBtn}
            onPress={handleAddToCart}
          >
            <ShoppingCart size={20} color="#FFF" />
            <Text style={styles.addToCartText}>Add to Cart</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  imageContainer: { width: width, height: width * 1.1, backgroundColor: '#F9FAFB' },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  placeholderImage: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' },
  placeholderText: { color: '#9CA3AF', fontWeight: 'bold' },
  headerActions: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  rightActions: { flexDirection: 'row', gap: 12 },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  infoContainer: {
    marginTop: -30,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 10,
  },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  categoryBadge: { backgroundColor: '#F0FDF4', px: 12, py: 6, borderRadius: 10 },
  categoryText: { color: '#16A34A', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  ratingBox: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ratingText: { color: '#6B7280', fontSize: 13, fontWeight: '600' },
  title: { fontSize: 26, fontWeight: '900', color: '#111827', marginBottom: 8 },
  price: { fontSize: 24, fontWeight: '900', color: '#16A34A', marginBottom: 20 },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 12 },
  description: { fontSize: 15, color: '#4B5563', lineHeight: 24, marginBottom: 24 },
  trustStrip: { 
    flexDirection: 'row', 
    backgroundColor: '#F9FAFB', 
    borderRadius: 20, 
    padding: 16, 
    justifyContent: 'space-around',
    marginBottom: 32
  },
  trustItem: { alignItems: 'center', gap: 8 },
  trustIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  trustText: { fontSize: 11, fontWeight: '700', color: '#4B5563' },
  quantitySection: { marginBottom: 24 },
  quantityPicker: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F3F4F6', 
    borderRadius: 16, 
    padding: 8,
    width: 140
  },
  qtyBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  qtyValue: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '900', color: '#111827' },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  footerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: '700', marginBottom: 2 },
  totalValue: { fontSize: 22, fontWeight: '900', color: '#111827' },
  addToCartBtn: {
    backgroundColor: '#111827',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 18,
    borderRadius: 20,
    gap: 12,
    shadowColor: '#111827',
    shadowOpacity: 0.3,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 10 },
  },
  addToCartText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  shopCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    padding: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  shopHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  shopAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' },
  shopInfo: { flex: 1 },
  shopName: { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 2 },
  shopMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  shopMetaText: { fontSize: 11, color: '#16A34A', fontWeight: '600' },
  shopDetailsRow: { flexDirection: 'row', alignItems: 'center', gap: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 12 },
  shopDetailItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  shopDetailText: { fontSize: 12, color: '#4B5563', fontWeight: '500' },
  mapPlaceholder: {
    marginTop: 16,
    height: 100,
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  mapPinIcon: { position: 'absolute', zIndex: 2, top: 25 },
  mapPinShadow: { position: 'absolute', width: 14, height: 4, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 2, top: 52, zIndex: 1 },
  mapLinesContainer: { ...StyleSheet.absoluteFillObject, opacity: 0.3 },
  mapLineH: { position: 'absolute', width: '100%', height: 2, backgroundColor: '#D1D5DB', top: '30%' },
  mapLineV: { position: 'absolute', width: 2, height: '100%', backgroundColor: '#D1D5DB', left: '40%' },
  mapText: { position: 'absolute', bottom: 8, fontSize: 10, fontWeight: '700', color: '#4B5563', backgroundColor: 'rgba(255,255,255,0.7)', paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden', borderRadius: 8 },
  recommendationsSection: { marginBottom: 20 },
  recCard: { width: 140 },
  recImageContainer: { width: 140, height: 140, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 8, overflow: 'hidden' },
  recImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  recName: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 4 },
  recPrice: { fontSize: 13, fontWeight: '800', color: '#16A34A' },
});

export default ShopProductDetailScreen;
