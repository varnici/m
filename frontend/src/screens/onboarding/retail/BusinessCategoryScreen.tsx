import React, { useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import type { RootStackScreenProps } from '@/navigation/types';
import { useOnboarding } from '../../../context/OnboardingContext';
import { BowlHeader, CleanCard } from '../../../components/ThemeComponents';
import {
  ShoppingBag,
  HeartPulse,
  Zap,
  UtensilsCrossed,
  Shirt,
  Ellipsis,
  ChevronLeft,
  ChevronRight,
  Sprout,
  HardHat,
  Sparkles,
  BookOpen,
  Wrench,
} from 'lucide-react-native';


const CATEGORIES = [
  { id: 'fmcg', title: 'FMCG / Groceries', icon: ShoppingBag, description: 'Fast-moving consumer goods, provisions, household items' },
  { id: 'textiles', title: 'Textiles & Clothing', icon: Shirt, description: 'Fabrics, fashion, shoes, accessories' },
  { id: 'electronics', title: 'Electronics & Phones', icon: Zap, description: 'Gadgets, phones, repairs, appliances' },
  { id: 'pharma', title: 'Pharmaceuticals', icon: HeartPulse, description: 'Drugs, medical supplies, wellness products' },
  { id: 'agriculture', title: 'Agriculture & Farm Produce', icon: Sprout, description: 'Farm products, livestock feed, agro inputs' },
  { id: 'building', title: 'Building Materials', icon: HardHat, description: 'Cement, iron rods, plumbing, electrical fittings' },
  { id: 'cosmetics', title: 'Cosmetics & Beauty', icon: Sparkles, description: 'Skincare, haircare, makeup, fragrances' },
  { id: 'food_beverage', title: 'Food & Beverage Preparation', icon: UtensilsCrossed, description: 'Cooked meals, catering, restaurants, bars' },
  { id: 'stationery', title: 'Stationery & Office Supplies', icon: BookOpen, description: 'Paper, printing, office equipment' },
  { id: 'auto_parts', title: 'Auto Parts', icon: Wrench, description: 'Vehicle parts, lubricants, accessories' },
  { id: 'others', title: 'Other', icon: Ellipsis, description: 'Other niche retail categories' },
];

const BusinessCategoryScreen = ({
  navigation,
}: RootStackScreenProps<'OnboardingCategory'>) => {
  const { data, updateData } = useOnboarding();
  const navigationRef = useRef(navigation);

  const handleSelect = useCallback((id: string) => {
    updateData({ primaryCategory: id });
    setTimeout(() => {
      navigationRef.current?.navigate('OnboardingMarketAssociation');
    }, 0);
  }, [updateData]);

  return (
    <View className="flex-1 bg-ventureroot-clean-background">
      <StatusBar barStyle="light-content" />
      
      <BowlHeader 
        title="Market Segment" 
        subtitle="Select your primary niche. We tailor your inventory tools and credit model based on industry sales cycles."
      />

      <ScrollView 
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 30, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity 
          onPress={() => navigationRef.current?.goBack()}
          className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center mb-6"
        >
          <ChevronLeft color="#1E293B" size={24} />
        </TouchableOpacity>

        <Text className="text-ventureroot-clean-textLight text-sm font-bold tracking-widest uppercase mb-6 ml-1">
          Select Category
        </Text>

        <View className="gap-4">
          {CATEGORIES.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => handleSelect(item.id)}
              className={`flex-row items-center p-5 rounded-3xl ${
                data.primaryCategory === item.id 
                ? 'bg-ventureroot-clean-surface border-2 border-ventureroot-green/10' 
                : 'bg-ventureroot-clean-surface border border-transparent'
              }`}
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 10,
                elevation: 2,
              }}
              activeOpacity={0.8}
            >
              <View className={`w-14 h-14 rounded-2xl items-center justify-center mr-5 ${
                data.primaryCategory === item.id 
                ? 'bg-ventureroot-green' 
                : 'bg-white'
              }`}>
                <item.icon 
                  size={26} 
                  color={data.primaryCategory === item.id ? '#FFFFFF' : '#004D2C'} 
                />
              </View>

              <View className="flex-1">
                <Text className="text-ventureroot-clean-text font-bold text-lg mb-0.5">
                  {item.title}
                </Text>
                <Text className="text-ventureroot-clean-textLight text-xs">
                  {item.description}
                </Text>
              </View>

              <ChevronRight size={20} color="#64748B" opacity={0.5} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

export default BusinessCategoryScreen;
