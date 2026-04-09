import React, { useState } from 'react';
import { View, Text, ScrollView, StatusBar, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useOnboarding } from '../../../context/OnboardingContext';
import { BowlHeader, CleanInput, RichButton } from '../../../components/ThemeComponents';
import { ChevronLeft, User, Calendar, Flag, UserCheck } from 'lucide-react-native';


const BasicInfoScreen = () => {
  const navigation = useNavigation<any>();
  const { data, updateData } = useOnboarding();
  
  const [form, setForm] = useState({
    fullName: data.fullName || '',
    dateOfBirth: data.dateOfBirth || '',
    gender: data.gender || '',
    nationality: data.nationality || 'Nigerian',
    email: data.email || '',
  });

  const handleContinue = () => {
    updateData(form);
    navigation.navigate('OnboardingShopInfo');
  };

  const isFormValid = form.fullName && form.dateOfBirth && form.gender;

  return (
    <View className="flex-1 bg-ventureroot-clean-background">
      <StatusBar barStyle="light-content" />
      
      <BowlHeader 
        title="Personal Profile" 
        subtitle="Individual identification (KYC Level 1). Your data is secured with industrial-grade encryption."
      />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        className="flex-1"
      >
        <ScrollView 
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 30, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center mb-6"
          >
            <ChevronLeft color="#1E293B" size={24} />
          </TouchableOpacity>

          <Text className="text-ventureroot-clean-textLight text-sm font-bold tracking-widest uppercase mb-6 ml-1">
            KYC Level 1
          </Text>

          <View className="gap-2">
            <CleanInput
              label="FULL LEGAL NAME (AS IN ID)"
              placeholder="e.g. John Doe Akpan"
              value={form.fullName}
              onChangeText={(fullName: string) => setForm({ ...form, fullName })}
            />

            <View className="flex-row gap-4">
              <View className="flex-1">
                <CleanInput
                  label="DATE OF BIRTH"
                  placeholder="DD/MM/YYYY"
                  value={form.dateOfBirth}
                  onChangeText={(dateOfBirth: string) => setForm({ ...form, dateOfBirth })}
                />
              </View>
              <View className="flex-1">
                <CleanInput
                  label="GENDER"
                  placeholder="Male/Female"
                  value={form.gender}
                  onChangeText={(gender: string) => setForm({ ...form, gender })}
                />
              </View>
            </View>

            <CleanInput
              label="NATIONALITY"
              placeholder="Nigeria"
              value={form.nationality}
              onChangeText={(nationality: string) => setForm({ ...form, nationality })}
            />

            <CleanInput
              label="EMAIL ADDRESS (OPTIONAL)"
              placeholder="name@example.com"
              value={form.email}
              onChangeText={(email: string) => setForm({ ...form, email })}
              keyboardType="email-address"
            />
          </View>

          <View className="mt-8">
            <RichButton
              title="Next: Business Profile"
              onPress={handleContinue}
              disabled={!isFormValid}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default BasicInfoScreen;
