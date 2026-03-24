import React, { useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Store, Briefcase, ChevronLeft } from 'lucide-react-native';
import { colors } from '@/theme/colors';

const ROLES = [
  {
    id: 'trader',
    title: 'Trader / Business Owner',
    description: 'I sell products and need inventory finance',
    icon: Store,
    bgColor: '#FFFBEB',
    iconColor: '#D97706',
  },
  {
    id: 'salaried',
    title: 'Salaried Worker',
    description: 'I have steady income and want business credit',
    icon: Briefcase,
    bgColor: '#EFF6FF',
    iconColor: '#2563EB',
  },
];

const RoleSelectionScreen = () => {
  const navigation = useNavigation<any>();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View className="bg-ventureroot-green h-24 absolute top-0 left-0 right-0" />
      <View className="px-6 pt-12 pb-8">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="mb-8 w-10 h-10 bg-white/10 rounded-full items-center justify-center -ml-2"
        >
          <ChevronLeft color="white" size={24} />
        </TouchableOpacity>

        <View className="mt-4">
            <Text className="text-gray-900 text-3xl font-bold mb-2">How do you earn?</Text>
            <Text className="text-gray-500 text-base leading-6">
            This helps us build the right credit model for you
            </Text>
        </View>
      </View>

      <View className="flex-1 px-6 pt-4 gap-4">
        {ROLES.map((role) => (
          <TouchableOpacity
            key={role.id}
            onPress={() => setSelectedRole(role.id)}
            className={`flex-row items-center p-5 rounded-2xl border-2 ${
              selectedRole === role.id ? 'border-ventureroot-green bg-ventureroot-green/5' : 'border-gray-50 bg-gray-50'
            }`}
            accessible={true}
            accessibilityLabel={role.title}
            accessibilityRole="radio"
            accessibilityState={{ checked: selectedRole === role.id }}
          >
            <View 
                className="w-14 h-14 rounded-xl items-center justify-center mr-4"
                style={{ backgroundColor: role.bgColor }}
            >
              <role.icon size={28} color={role.iconColor} />
            </View>
            
            <View className="flex-1">
              <Text className="text-gray-900 font-bold text-lg mb-1">{role.title}</Text>
              <Text className="text-gray-500 text-sm">{role.description}</Text>
            </View>

            <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                selectedRole === role.id ? 'border-ventureroot-green' : 'border-gray-300'
            }`}>
              {selectedRole === role.id && <View className="w-3 h-3 rounded-full bg-ventureroot-green" />}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View className="px-6 pb-12">
        <TouchableOpacity
          className={`py-4 rounded-xl items-center ${
            selectedRole ? 'bg-ventureroot-green shadow-lg' : 'bg-gray-300'
          }`}
          disabled={!selectedRole}
          onPress={() => navigation.navigate('BVNVerification')}
          accessible={true}
          accessibilityLabel="Continue"
          accessibilityRole="button"
        >
          <Text className={`text-base font-bold ${selectedRole ? 'text-white' : 'text-gray-500'}`}>
            Continue
          </Text>
        </TouchableOpacity>
      </View>

      {/* Progress Dots */}
      <View className="flex-row justify-center pb-8 gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} className={`h-1.5 rounded-full ${i === 1 ? 'w-8 bg-ventureroot-green' : 'w-1.5 bg-gray-200'}`} />
        ))}
      </View>
    </SafeAreaView>
  );
};

export default RoleSelectionScreen;
