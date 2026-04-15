import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useOnboarding } from '../../../context/OnboardingContext';
import { BowlHeader, CleanCard } from '../../../components/ThemeComponents';
import { 
  Store, 
  User, 
  Truck, 
  Factory, 
  Package, 
  Wrench, 
  ChevronRight 
} from 'lucide-react-native';


const ACCOUNT_TYPES = [
  { id: 'retail', title: 'Retail Business Owner', icon: Store, description: 'Shop owners and traders' },
  { id: 'personal', title: 'Personal', icon: User, description: 'Individual accounts' },
  { id: 'distributor', title: 'Mini Distributor', icon: Package, description: 'Supply chain partners' },
  { id: 'manufactural', title: 'Manufactural', icon: Factory, description: 'Producers and factories' },
  { id: 'logistics', title: 'Logistics / Transport', icon: Truck, description: 'Transportation services' },
  { id: 'artisan', title: 'Artisan', icon: Wrench, description: 'Skilled trade professionals' },
];

const AccountTypeScreen = () => {
  const navigation = useNavigation<any>();
  const { data, updateData } = useOnboarding();

  const handleSelect = (id: string) => {
    updateData({ accountType: id });
    navigation.navigate('OnboardingPhone');
  };

  return (
    <View className="flex-1 bg-ventureroot-clean-background">
      <StatusBar barStyle="light-content" />
      
      <BowlHeader 
        title="VentureRoot" 
        subtitle="Choose how you operate to unlock your baseline credit model."
      />

      <ScrollView 
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 30, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-ventureroot-clean-textLight text-sm font-bold tracking-widest uppercase mb-6 ml-1">
          Select Account Type
        </Text>

        <View className="gap-4">
          {ACCOUNT_TYPES.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => handleSelect(item.id)}
              className={`flex-row items-center p-5 rounded-3xl ${
                data.accountType === item.id 
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
                data.accountType === item.id 
                ? 'bg-ventureroot-green' 
                : 'bg-white'
              }`}>
                <item.icon 
                  size={26} 
                  color={data.accountType === item.id ? '#FFFFFF' : '#004D2C'} 
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

export default AccountTypeScreen;
