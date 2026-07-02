import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import OnboardingShell, { OnboardingButton } from '@/components/onboarding/OnboardingShell';
import { useOnboardingNav } from '@/hooks/useOnboardingNav';
import { colors } from '@/theme/colors';
import {
  ShoppingBag,
  HeartPulse,
  Zap,
  UtensilsCrossed,
  Shirt,
  Ellipsis,
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

const BusinessCategoryScreen = () => {
  const { goNext, goBack, step, total, data } = useOnboardingNav();
  const [selected, setSelected] = useState<string>(data.primaryCategory || '');

  return (
    <OnboardingShell
      currentStep={step}
      totalSteps={total}
      title="Market Segment"
      subtitle="Select your primary niche. We tailor your inventory tools and credit model based on industry sales cycles."
      onBack={goBack}
      footer={
        <OnboardingButton
          title="Continue"
          onPress={() => goNext({ primaryCategory: selected })}
          disabled={!selected}
        />
      }
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: '700',
          color: '#475569',
          letterSpacing: 0.5,
          marginBottom: 16,
        }}
      >
        SELECT CATEGORY
      </Text>

      <View style={{ gap: 12 }}>
        {CATEGORIES.map((item) => {
          const isActive = selected === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => setSelected(item.id)}
              activeOpacity={0.8}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 18,
                borderRadius: 18,
                backgroundColor: '#FFFFFF',
                borderWidth: isActive ? 2 : 1,
                borderColor: isActive ? colors.ventureroot.green : '#F1F5F9',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 10,
                elevation: 2,
              }}
            >
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 16,
                  backgroundColor: isActive ? colors.ventureroot.green : '#F8FAFC',
                }}
              >
                <item.icon
                  size={24}
                  color={isActive ? '#FFFFFF' : colors.ventureroot.green}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontWeight: '700',
                    fontSize: 15,
                    color: '#0F172A',
                    marginBottom: 2,
                  }}
                >
                  {item.title}
                </Text>
                <Text style={{ fontSize: 12, color: '#64748B', lineHeight: 16 }}>
                  {item.description}
                </Text>
              </View>

              <ChevronRight size={18} color="#94A3B8" />
            </TouchableOpacity>
          );
        })}
      </View>
    </OnboardingShell>
  );
};

export default BusinessCategoryScreen;
