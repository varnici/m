import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Plus, Users, Building2, User, Phone, Mail, X } from 'lucide-react-native';
import AppHeader from '@/components/ui/AppHeader';
import { colors } from '@/theme/colors';
import { useTradeClients, useCreateTradeClient, useTradeOrders } from '@/hooks/useTradeOrders';
import type { TradeClient } from '@/types/inventory';

function initials(name: string) {
  return name
    .replace(/[^A-Za-z ]/g, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '?';
}

function NewCustomerForm({ onDone }: { onDone: () => void }) {
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [terms, setTerms] = useState<'immediate' | 'net30'>('immediate');
  const { mutate: createClient, isPending } = useCreateTradeClient();

  const handleSave = () => {
    if (!companyName.trim()) return;
    createClient(
      {
        company_name: companyName.trim(),
        contact_phone: phone.trim() || undefined,
        contact_email: email.trim() || undefined,
        delivery_address: address.trim() || undefined,
        default_payment_terms: terms,
      },
      { onSuccess: onDone }
    );
  };

  return (
    <View className="bg-white rounded-2xl border border-gray-100 p-4 mb-3">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-gray-900 font-bold text-sm">New customer</Text>
        <TouchableOpacity onPress={onDone}><X size={16} color="#9CA3AF" /></TouchableOpacity>
      </View>
      <View className="gap-3">
        <TextInput
          value={companyName}
          onChangeText={setCompanyName}
          placeholder="Business or contact name"
          className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-gray-900"
        />
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="Phone number"
          keyboardType="phone-pad"
          className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-gray-900"
        />
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email (optional)"
          keyboardType="email-address"
          autoCapitalize="none"
          className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-gray-900"
        />
        <TextInput
          value={address}
          onChangeText={setAddress}
          placeholder="Delivery address (optional)"
          className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-gray-900"
        />
        <View className="flex-row gap-2">
          {(['immediate', 'net30'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setTerms(t)}
              className={`flex-1 py-2.5 rounded-xl border items-center ${terms === t ? 'border-ventureroot-green bg-emerald-50' : 'border-gray-100 bg-gray-50'}`}
            >
              <Text className={`text-xs font-bold ${terms === t ? 'text-ventureroot-green' : 'text-gray-600'}`}>
                {t === 'immediate' ? 'Pay on delivery' : 'Net 30 terms'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          onPress={handleSave}
          disabled={isPending || !companyName.trim()}
          className="py-3 rounded-xl items-center"
          style={{ backgroundColor: isPending || !companyName.trim() ? '#D1D5DB' : colors.ventureroot.green }}
        >
          {isPending ? <ActivityIndicator size="small" color="white" /> : <Text className="text-white font-bold text-xs">Add customer</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function CustomerRow({ client, orderCount, totalKobo }: { client: TradeClient; orderCount: number; totalKobo: number }) {
  const isPlatformBuyer = !!client.linked_user_id;
  return (
    <View className="bg-white rounded-2xl border border-gray-100 p-3 mb-2 flex-row items-center">
      <View className="w-10 h-10 rounded-xl items-center justify-center mr-3" style={{ backgroundColor: (isPlatformBuyer ? colors.ventureroot.green : colors.text.muted) + '15' }}>
        <Text className="font-bold text-xs" style={{ color: isPlatformBuyer ? colors.ventureroot.green : colors.text.secondary }}>
          {initials(client.company_name)}
        </Text>
      </View>
      <View className="flex-1">
        <Text className="text-gray-900 font-bold text-sm" numberOfLines={1}>{client.company_name}</Text>
        <View className="flex-row items-center mt-0.5">
          {isPlatformBuyer ? <Building2 size={10} color={colors.ventureroot.green} /> : <User size={10} color="#9CA3AF" />}
          <Text className="text-gray-400 text-[10px] font-semibold ml-1">
            {isPlatformBuyer ? 'Platform buyer' : 'Direct customer'} · {client.default_payment_terms === 'net30' ? 'Net 30' : 'Pay on delivery'}
          </Text>
        </View>
        {(client.contact_phone || client.contact_email) && (
          <View className="flex-row items-center mt-1 gap-3">
            {client.contact_phone && (
              <View className="flex-row items-center"><Phone size={10} color="#9CA3AF" /><Text className="text-gray-400 text-[10px] ml-1">{client.contact_phone}</Text></View>
            )}
            {client.contact_email && (
              <View className="flex-row items-center"><Mail size={10} color="#9CA3AF" /><Text className="text-gray-400 text-[10px] ml-1" numberOfLines={1}>{client.contact_email}</Text></View>
            )}
          </View>
        )}
      </View>
      <View className="items-end">
        <Text className="text-gray-900 font-black text-sm">₦{(totalKobo / 100).toLocaleString()}</Text>
        <Text className="text-gray-400 text-[10px]">{orderCount} order{orderCount === 1 ? '' : 's'}</Text>
      </View>
    </View>
  );
}

const DistributorCustomersScreen = () => {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const { data: clients = [], isLoading } = useTradeClients();
  const { data: orders = [] } = useTradeOrders();

  const stats = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const o of orders) {
      const cur = map.get(o.client_id) || { count: 0, total: 0 };
      cur.count += 1;
      cur.total += o.total_kobo;
      map.set(o.client_id, cur);
    }
    return map;
  }, [orders]);

  const rows = useMemo(
    () => clients.filter((c) => c.company_name.toLowerCase().includes(search.toLowerCase())),
    [clients, search]
  );

  return (
    <SafeAreaView className="flex-1 bg-background-page" edges={['bottom', 'left', 'right']}>
      <AppHeader
        title="Customers"
        subtitle={`${clients.length} accounts`}
        rightAction={
          <TouchableOpacity onPress={() => setShowForm((s) => !s)}>
            <Plus size={20} color="#0F172A" />
          </TouchableOpacity>
        }
      />

      <View className="px-4 pt-4">
        {showForm && <NewCustomerForm onDone={() => setShowForm(false)} />}
        {!showForm && (
          <View className="flex-row items-center bg-white rounded-2xl border border-gray-100 px-4 py-3 mb-3">
            <Search size={16} color="#9CA3AF" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search customer"
              className="flex-1 ml-2 text-gray-900"
            />
          </View>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={colors.ventureroot.green} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          ListEmptyComponent={
            !showForm ? (
              <View className="items-center justify-center py-20 px-8">
                <Users size={40} color="#D1D5DB" />
                <Text className="text-gray-900 font-bold mt-3">No customers yet</Text>
                <Text className="text-gray-400 text-xs text-center mt-1">
                  Platform buyers are added automatically the first time they order. Add your offline customers here to invoice them the same way.
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const s = stats.get(item.id) || { count: 0, total: 0 };
            return <CustomerRow client={item} orderCount={s.count} totalKobo={s.total} />;
          }}
        />
      )}
    </SafeAreaView>
  );
};

export default DistributorCustomersScreen;
