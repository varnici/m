import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, StatusBar, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackScreenProps } from '@/navigation/types';
import { ChevronLeft, User, Phone, MapPin, Landmark, Save } from 'lucide-react-native';
import { useCreateSupplier } from '@/hooks/useInventory';
import Toast from 'react-native-toast-message';

const AddSupplierScreen = ({ navigation }: RootStackScreenProps<'AddSupplier'>) => {
  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  
  const { mutate: createSupplier, isPending } = useCreateSupplier();

  const handleSave = () => {
    if (!name.trim() || !phone.trim() || !city.trim() || !stateName.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Required Fields',
        text2: 'Please provide name, phone, city, and state',
      });
      return;
    }

    createSupplier({
      name: name.trim(),
      contact_name: contactName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      city: city.trim(),
      state: stateName.trim(),
      metadata: {
        bank_name: bankName.trim(),
        account_number: accountNumber.trim()
      }
    }, {
      onSuccess: () => {
        Toast.show({
          type: 'success',
          text1: 'Supplier Added',
          text2: `${name} has been saved to your vendors list`,
        });
        navigation.goBack();
      },
      onError: (err: any) => {
        console.error('Create Supplier Error:', err);
        const errorMessage = err.response?.data?.detail || err.message || 'Failed to add supplier';
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: errorMessage,
        });
      }
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-background-page">
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-4 pb-6 bg-slate-900">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2">
          <ChevronLeft color="white" size={24} />
        </TouchableOpacity>
        <Text className="text-white text-lg font-bold">Add New Supplier</Text>
        <TouchableOpacity onPress={handleSave} disabled={isPending} className="p-2">
          {isPending ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Save color="white" size={24} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Company Info */}
        <View className="bg-white mx-4 mt-6 mb-6 p-6 rounded-3xl border border-gray-100 shadow-sm">
          <View className="flex-row items-center mb-4">
             <User size={18} color="#4F46E5" />
             <Text className="text-gray-900 font-bold text-base ml-2">Company Details</Text>
          </View>
          
          <View className="gap-4">
            <View>
              <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1 ml-1">Supplier / Business Name *</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Dangote Group"
                className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-900"
              />
            </View>
            
            <View>
              <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1 ml-1">Contact Person</Text>
              <TextInput
                value={contactName}
                onChangeText={setContactName}
                placeholder="e.g. John Doe"
                className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-900"
              />
            </View>
          </View>
        </View>

        {/* Contact Info */}
        <View className="bg-white mx-4 mb-6 p-6 rounded-3xl border border-gray-100 shadow-sm">
          <View className="flex-row items-center mb-4">
             <Phone size={18} color="#10B981" />
             <Text className="text-gray-900 font-bold text-base ml-2">Contact Information</Text>
          </View>
          
          <View className="gap-4">
            <View>
              <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1 ml-1">Phone Number *</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="+234..."
                keyboardType="phone-pad"
                className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-900"
              />
            </View>
            
            <View>
              <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1 ml-1">Email Address</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="vendor@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-900"
              />
            </View>

            <View>
              <View className="flex-row items-center mb-1 ml-1">
                <MapPin size={12} color="#6B7280" />
                <Text className="text-gray-400 text-[10px] font-bold uppercase ml-1">Physical Address</Text>
              </View>
              <TextInput
                value={address}
                onChangeText={setAddress}
                placeholder="Street address"
                multiline
                numberOfLines={2}
                className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-900 mb-4"
              />
              
              <View className="flex-row gap-4">
                <View className="flex-1">
                  <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1 ml-1">City *</Text>
                  <TextInput
                    value={city}
                    onChangeText={setCity}
                    placeholder="e.g. Lagos"
                    className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-900"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1 ml-1">State *</Text>
                  <TextInput
                    value={stateName}
                    onChangeText={setStateName}
                    placeholder="e.g. Lagos State"
                    className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-900"
                  />
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Payment Info */}
        <View className="bg-white mx-4 mb-10 p-6 rounded-3xl border border-gray-100 shadow-sm">
          <View className="flex-row items-center mb-4">
             <Landmark size={18} color="#F59E0B" />
             <Text className="text-gray-900 font-bold text-base ml-2">Payment Details</Text>
          </View>
          
          <View className="gap-4">
            <View>
              <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1 ml-1">Bank Name</Text>
              <TextInput
                value={bankName}
                onChangeText={setBankName}
                placeholder="e.g. Zenith Bank"
                className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-900"
              />
            </View>
            
            <View>
              <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1 ml-1">Account Number</Text>
              <TextInput
                value={accountNumber}
                onChangeText={setAccountNumber}
                placeholder="10 digits"
                keyboardType="number-pad"
                maxLength={10}
                className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-900"
              />
            </View>
          </View>
        </View>

        <View className="h-10" />
      </ScrollView>
      
      {/* Action Button */}
      <View className="p-4 bg-white border-t border-gray-100">
        <TouchableOpacity
          onPress={handleSave}
          disabled={isPending}
          className={`py-4 rounded-2xl items-center flex-row justify-center ${
            isPending ? 'bg-gray-300' : 'bg-slate-900'
          }`}
        >
          {isPending ? (
             <ActivityIndicator color="white" className="mr-2" />
          ) : (
             <Save size={20} color="white" className="mr-2" />
          )}
          <Text className="text-white font-bold text-lg">Add Supplier</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default AddSupplierScreen;
