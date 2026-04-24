import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  Dimensions,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import {
  Search,
  ShoppingCart,
  ChevronLeft,
  Store,
  Package,
  Filter,
  Plus,
  Bell,
  Menu,
  Star,
  ArrowRight,
  Truck,
  ShieldCheck,
  Headphones,
  BadgeCheck,
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { inventoryService } from '@/services/inventoryService';
import { colors } from '@/theme/colors';
import type { RootStackScreenProps } from '@/navigation/types';
import { useCartStore } from '@/store/cartStore';
import { retailCategoriesData } from '@/data/retailCategories';
import { useAuth } from '@/context/AuthContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

// ─── Helpers ────────────────────────────────────────────────────────────────

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const getGreetingEmoji = () => {
  const hour = new Date().getHours();
  if (hour < 12) return '☀️';
  if (hour < 17) return '👋';
  return '🌙';
};

const getCategoryInfo = (categoryId?: string) => {
  if (!categoryId) return null;
  const cat = retailCategoriesData.find(c => c.id === categoryId);
  if (cat) return cat;
  for (const c of retailCategoriesData) {
    if (c.subcategories) {
      const sub = c.subcategories.find(s => s.id === categoryId);
      if (sub) return c;
    }
  }
  return null;
};

// Mock ratings — replace with real data when available
const getMockRating = (productId: string) => {
  const ratings = [4.5, 4.7, 4.8, 4.6, 4.9, 4.3, 4.4];
  const reviews = [98, 124, 156, 203, 64, 89, 47];
  const index = productId.charCodeAt(0) % ratings.length;
  return { rating: ratings[index], reviews: reviews[index] };
};

// Mock badge — replace with real promo logic when available
const getProductBadge = (index: number) => {
  const badges = [
    { label: 'Bestseller', color: '#166534', bg: '#DCFCE7' },
    { label: '-15%', color: '#9A3412', bg: '#FEE2E2' },
    { label: 'Popular', color: '#166534', bg: '#DCFCE7' },
    { label: '-10%', color: '#9A3412', bg: '#FEE2E2' },
    null,
    null,
    { label: 'New', color: '#1E40AF', bg: '#DBEAFE' },
  ];
  return badges[index % badges.length];
};

// ─── Trust Strip ─────────────────────────────────────────────────────────────

const TrustStrip = () => (
  <View style={styles.trustStrip}>
    {[
      { icon: <Truck size={20} color="#16A34A" />, title: 'Fast Delivery', sub: 'Within 2 hours' },
      { icon: <BadgeCheck size={20} color="#16A34A" />, title: 'Trusted Sellers', sub: '100% Verified' },
      { icon: <ShieldCheck size={20} color="#16A34A" />, title: 'Secure Payments', sub: '100% Safe' },
      { icon: <Headphones size={20} color="#16A34A" />, title: '24/7 Support', sub: "We're here to help" },
    ].map((item, i) => (
      <View key={i} style={styles.trustItem}>
        {item.icon}
        <Text style={styles.trustTitle}>{item.title}</Text>
        <Text style={styles.trustSub}>{item.sub}</Text>
      </View>
    ))}
  </View>
);

// ─── Hero Banner ──────────────────────────────────────────────────────────────

const HERO_SLIDES = [
  {
    id: '1',
    title: 'Fresh Groceries',
    headline: 'Farm to Fork',
    subtitle: 'Get daily essentials delivered in 2 hours.',
    tag: 'Fresh Deals 🌿',
    image: require('../../../assets/hero/groceries.png'),
    bg: '#F0FDF4',
    tagColor: '#166534',
    tagBg: '#DCFCE7',
    btnColor: '#16A34A'
  },
  {
    id: '2',
    title: 'Luxury Beauty',
    headline: 'Glow Premium',
    subtitle: 'Skincare and beauty at wholesale prices.',
    tag: 'New Arrival ✨',
    image: require('../../../assets/hero/beauty.png'),
    bg: '#FFF1F2',
    tagColor: '#9D174D',
    tagBg: '#FFE4E6',
    btnColor: '#E11D48'
  },
  {
    id: '3',
    title: 'Home Essentials',
    headline: 'Modern Living',
    subtitle: 'Upgrade your home with quality essentials.',
    tag: 'Best Quality 🏠',
    image: require('../../../assets/hero/home.png'),
    bg: '#F5F3FF',
    tagColor: '#5B21B6',
    tagBg: '#EDE9FE',
    btnColor: '#7C3AED'
  },
  {
    id: '4',
    title: 'Fresh Drinks',
    headline: 'Cold Refresh',
    subtitle: 'Artisan juices and refreshing beverages.',
    tag: 'Refreshing 🥤',
    image: require('../../../assets/hero/drinks.png'),
    bg: '#EFF6FF',
    tagColor: '#1E40AF',
    tagBg: '#DBEAFE',
    btnColor: '#2563EB'
  }
];

const HeroCarousel = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <View style={styles.heroContainer}>
      <ScrollView 
        horizontal 
        pagingEnabled 
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setActiveIndex(index);
        }}
      >
        {HERO_SLIDES.map((slide) => (
          <View key={slide.id} style={[styles.heroSlide, { backgroundColor: slide.bg }]}>
            <View style={styles.heroLeft}>
              <View style={[styles.heroTag, { backgroundColor: slide.tagBg }]}>
                <Text style={[styles.heroTagText, { color: slide.tagColor }]}>{slide.tag}</Text>
              </View>
              <Text style={styles.heroHeadline}>{slide.headline}</Text>
              <Text style={[styles.heroHeadlineGreen, { color: slide.btnColor }]}>{slide.title}</Text>
              <Text style={styles.heroSub}>{slide.subtitle}</Text>
              <TouchableOpacity style={[styles.heroBtn, { backgroundColor: slide.btnColor }]}>
                <Text style={styles.heroBtnText}>Shop Now</Text>
                <ArrowRight size={14} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.heroRight}>
              <Image source={slide.image} style={styles.heroImage} resizeMode="cover" />
              <View style={[styles.discountBadge, { backgroundColor: slide.btnColor }]}>
                <Text style={styles.discountTop}>UP TO</Text>
                <Text style={styles.discountAmount}>25%</Text>
                <Text style={styles.discountOff}>OFF</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={styles.pagination}>
        {HERO_SLIDES.map((_, i) => (
          <View 
            key={i} 
            style={[
              styles.paginationDot, 
              activeIndex === i && styles.paginationDotActive
            ]} 
          />
        ))}
      </View>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

const ShopScreen = ({ navigation }: RootStackScreenProps<'Shop'>) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const { addItem, getTotalItems } = useCartStore();
  const cartCount = getTotalItems();

  // Get user info from Auth Context
  const { user } = useAuth();
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there';

  const { data: serverCategories = [] } = useQuery({
    queryKey: ['shop_categories'],
    queryFn: () => inventoryService.getCategories(),
  });

  const categories = [
    { id: 'all', name: 'All Products', icon: null },
    ...serverCategories.map(sc => {
      const localCat = getCategoryInfo(sc.id);
      return { ...sc, icon: localCat?.icon };
    })
  ];

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['shop_products', activeCategory, searchQuery],
    queryFn: () =>
      inventoryService.getProducts(
        0,
        100,
        activeCategory !== 'all' ? activeCategory : undefined,
        searchQuery,
      ),
  });

  const handleAddToCart = (product: any) => {
    addItem(product);
  };

  const renderProduct = ({ item, index }: { item: any; index: number }) => {
    const category = getCategoryInfo(item.category_id);
    const placeholderColor = category?.backgroundColor || '#F0FDF4';
    const { rating, reviews } = getMockRating(item.id);
    const badge = getProductBadge(index);
    const hasDiscount = badge?.label?.startsWith('-');
    const originalPrice = hasDiscount
      ? ((item.selling_price_kobo || 0) / 100) * (1 + parseInt(badge!.label) / -100)
      : null;

    const availableQty = Math.max(0, (item.total_quantity_on_hand || 0) - (item.total_reserved_quantity || 0));

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('ShopProductDetail', { product: item })}
        activeOpacity={0.9}
        style={[styles.productCard, { width: CARD_WIDTH, marginRight: index % 2 === 0 ? 16 : 0 }]}
      >
        {/* Image */}
        <View style={[styles.imageContainer, { backgroundColor: placeholderColor }]}>
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.productImage} />
          ) : category?.icon ? (
            <Image source={category.icon} style={{ width: '65%', height: '65%' }} resizeMode="contain" />
          ) : (
            <Package size={32} color="#9CA3AF" />
          )}

          {/* Badge top-left */}
          {badge && (
            <View style={[styles.productBadge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.productBadgeText, { color: badge.color }]}>{badge.label}</Text>
            </View>
          )}

          {/* Low stock */}
          {availableQty > 0 && availableQty <= 10 && (
            <View style={styles.lowStockBadge}>
              <Text style={styles.lowStockText}>Only {availableQty} left</Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.productInfo}>
          <Text style={styles.productCategory}>{category?.name || 'General'}</Text>
          <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>

          {/* Stars */}
          <View style={styles.starsRow}>
            <Star size={11} color="#F59E0B" fill="#F59E0B" />
            <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
            <Text style={styles.reviewText}>({reviews})</Text>
          </View>

          {/* Price + Add */}
          <View style={styles.priceRow}>
            <View>
              <Text style={styles.productPrice}>
                ₦{((item.selling_price_kobo || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </Text>
              {originalPrice && (
                <Text style={styles.originalPrice}>
                  ₦{originalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Text>
              )}
            </View>
            <TouchableOpacity style={styles.addButton} onPress={() => handleAddToCart(item)}>
              <Plus size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuButton} onPress={() => navigation.goBack()}>
          <ChevronLeft size={22} color="#111827" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.greeting}>
            {getGreeting()}, {firstName} {getGreetingEmoji()}
          </Text>
          <Text style={styles.headerTitle}>
            <Text style={styles.headerTitleBlack}>VentureRoot </Text>
            <Text style={styles.headerTitleGreen}>Shop</Text>
          </Text>
          <Text style={styles.headerSubtitle}>Wholesale Marketplace</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconBtn}>
            <Bell size={20} color="#111827" />
            <View style={styles.notifDot} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cartIconBtn}
            onPress={() => navigation.navigate('Cart')}
          >
            <ShoppingCart size={20} color="#111827" />
            {cartCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <FlashList
        data={products}
        numColumns={2}
        estimatedItemSize={300}
        keyExtractor={(item: any) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        renderItem={renderProduct}
        ListHeaderComponent={
          <>
            {/* ── Search ── */}
            <View style={styles.searchContainer}>
              <View style={styles.searchBox}>
                <Search size={18} color="#9CA3AF" />
                <TextInput
                  placeholder="Search for products, categories..."
                  placeholderTextColor="#9CA3AF"
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
              <TouchableOpacity style={styles.filterButton}>
                <Filter size={18} color="#111827" />
              </TouchableOpacity>
            </View>

            {/* ── Hero Carousel ── */}
            <HeroCarousel />

            {/* ── Categories ── */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Shop by Category</Text>
              <TouchableOpacity>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.categoriesWrapper}>
              <FlashList
                data={categories}
                horizontal
                showsHorizontalScrollIndicator={false}
                estimatedItemSize={110}
                contentContainerStyle={{ paddingHorizontal: 0 }}
                renderItem={({ item }: { item: any }) => (
                  <TouchableOpacity
                    style={[
                      styles.categoryChip,
                      activeCategory === item.id && styles.categoryChipActive,
                    ]}
                    onPress={() => setActiveCategory(item.id)}
                  >
                    {item.icon && (
                      <Image source={item.icon} style={styles.chipIcon} resizeMode="contain" />
                    )}
                    <Text
                      style={[
                        styles.categoryText,
                        activeCategory === item.id && styles.categoryTextActive,
                      ]}
                    >
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>

            {/* ── Section heading ── */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Popular Products</Text>
              <TouchableOpacity>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>

            {/* Loading / empty states */}
            {isLoading && (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#16A34A" />
              </View>
            )}
            {!isLoading && products.length === 0 && (
              <Animated.View entering={FadeIn} style={styles.centerContainer}>
                <Store size={48} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No products found</Text>
                <Text style={styles.emptySubtitle}>Try adjusting your search or category</Text>
              </Animated.View>
            )}
          </>
        }
      />
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuButton: {
    width: 38, height: 38,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { alignItems: 'center', flex: 1 },
  greeting: { fontSize: 12, color: '#6B7280', marginBottom: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  headerTitleBlack: { color: '#111827' },
  headerTitleGreen: { color: '#16A34A' },
  headerSubtitle: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 38, height: 38,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifDot: {
    position: 'absolute', top: 8, right: 8,
    width: 7, height: 7,
    borderRadius: 4,
    backgroundColor: '#16A34A',
    borderWidth: 1.5, borderColor: '#fff',
  },
  cartIconBtn: {
    width: 38, height: 38,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: '#16A34A',
    minWidth: 18, height: 18,
    borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2, borderColor: '#fff',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

  // Search
  searchContainer: {
    flexDirection: 'row',
    marginTop: 20,
    marginBottom: 16,
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },
  filterButton: {
    width: 48, height: 48,
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },

  heroContainer: {
    marginBottom: 24,
    height: 180,
    width: width - 32,
    borderRadius: 24,
    overflow: 'hidden',
  },
  heroSlide: {
    width: width - 32,
    height: 180,
    flexDirection: 'row',
    padding: 20,
    position: 'relative',
  },
  heroLeft: { flex: 1.2, justifyContent: 'center' },
  heroTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 8,
  },
  heroTagText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  heroHeadline: { fontSize: 20, fontWeight: '900', color: '#111827', lineHeight: 24 },
  heroHeadlineGreen: { fontSize: 22, fontWeight: '900', lineHeight: 26, marginBottom: 4 },
  heroSub: { fontSize: 11, color: '#4B5563', lineHeight: 16, marginBottom: 16 },
  heroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 4 },
  },
  heroBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  heroRight: { flex: 0.8, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  heroImage: {
    width: '120%',
    height: '120%',
    position: 'absolute',
    right: -20,
    borderRadius: 20,
  },
  discountBadge: {
    position: 'absolute',
    top: -10, right: -10,
    width: 56, height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    borderWidth: 2,
    borderColor: '#fff',
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  discountTop: { color: '#fff', fontSize: 7, fontWeight: '900' },
  discountAmount: { color: '#fff', fontSize: 16, fontWeight: '900' },
  discountOff: { color: '#fff', fontSize: 7, fontWeight: '900' },
  pagination: {
    position: 'absolute',
    bottom: 12,
    left: 20,
    flexDirection: 'row',
    gap: 6,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  paginationDotActive: {
    width: 20,
    backgroundColor: '#111827',
  },

  // Categories
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  seeAll: { fontSize: 13, fontWeight: '600', color: '#16A34A' },
  categoriesWrapper: { height: 50, marginBottom: 16 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  categoryChipActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#16A34A',
    borderWidth: 1.5,
  },
  chipIcon: { width: 16, height: 16 },
  categoryText: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
  categoryTextActive: { color: '#16A34A' },

  // Products
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  productImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  productBadge: {
    position: 'absolute',
    top: 8, left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  productBadgeText: { fontSize: 10, fontWeight: '700' },
  favBtn: {
    position: 'absolute',
    top: 8, right: 8,
    width: 28, height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  lowStockBadge: {
    position: 'absolute',
    top: 8, right: 8,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  lowStockText: { color: '#EF4444', fontSize: 8, fontWeight: '800' },
  productInfo: { padding: 10 },
  productCategory: {
    fontSize: 10, color: '#9CA3AF',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  productName: {
    fontSize: 13, fontWeight: '700',
    color: '#111827', marginBottom: 5,
    lineHeight: 18,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 8,
  },
  ratingText: { fontSize: 11, fontWeight: '700', color: '#111827' },
  reviewText: { fontSize: 11, color: '#9CA3AF' },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productPrice: { fontSize: 15, fontWeight: '800', color: '#16A34A' },
  originalPrice: {
    fontSize: 11,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
    marginTop: 1,
  },
  addButton: {
    width: 26, height: 26,
    borderRadius: 13,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Trust Strip
  trustStrip: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    backgroundColor: '#FAFAFA',
    padding: 14,
    gap: 4,
  },
  trustItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  trustTitle: { fontSize: 10, fontWeight: '700', color: '#111827', textAlign: 'center' },
  trustSub: { fontSize: 9, color: '#9CA3AF', textAlign: 'center' },

  // States
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginTop: 14 },
  emptySubtitle: { fontSize: 13, color: '#6B7280', marginTop: 6 },
});

export default ShopScreen;