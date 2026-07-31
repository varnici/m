import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Download, Eye, LayoutGrid } from 'lucide-react-native';
import AppHeader from '@/components/ui/AppHeader';
import { useProducts } from '@/hooks/useInventory';
import { useCategories } from '@/hooks/useCategories';
import { inventoryService } from '@/services/inventoryService';
import { shareCsv } from '@/services/csvExport';
import { getCategoryIconComponent, DEFAULT_CATEGORY_TINT } from '@/constants/categoryIcons';
import { colors } from '@/theme/colors';
import type { Product } from '@/types/inventory';

const NAME_COL_WIDTH = 160;

function status(p: Product): { label: string; color: string } {
  const balance = p.total_quantity_on_hand ?? p.quantity_on_hand ?? 0;
  if (balance <= 0) return { label: 'Out', color: '#A32036' };
  if (balance <= p.minimum_stock_level) return { label: 'Reorder', color: '#B0730C' };
  return { label: 'In stock', color: '#16654A' };
}

const InventoryRegisterScreen = () => {
  const [view, setView] = useState<'simple' | 'full'>('simple');
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);
  const { data: products = [], isLoading } = useProducts(0, 500, undefined, search);
  const { data: categories = [] } = useCategories();

  const rows = useMemo(() => {
    return [...products].sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, p) => {
        const balance = p.total_quantity_on_hand ?? p.quantity_on_hand ?? 0;
        acc.units += balance;
        acc.value += balance * p.cost_price_kobo;
        return acc;
      },
      { units: 0, value: 0 }
    );
  }, [rows]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const csv = await inventoryService.exportProductsCsv();
      await shareCsv(csv, `inventory-register-${new Date().toISOString().slice(0, 10)}.csv`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background-page" edges={['bottom', 'left', 'right']}>
      <AppHeader
        title="Register"
        rightAction={
          <TouchableOpacity onPress={handleExport} disabled={exporting} className="p-2 rounded-xl bg-gray-100">
            {exporting ? <ActivityIndicator size="small" color="#374151" /> : <Download size={18} color="#374151" />}
          </TouchableOpacity>
        }
      />

      <View className="px-4 pt-4">
        <View className="flex-row items-center bg-white rounded-2xl border border-gray-100 px-4 py-3 mb-3">
          <Search size={18} color="#9CA3AF" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search product, code or category"
            className="flex-1 ml-2 text-gray-900"
          />
        </View>

        <View className="flex-row bg-gray-100 rounded-xl p-1 mb-3 self-start">
          <TouchableOpacity
            onPress={() => setView('simple')}
            className={`flex-row items-center px-4 py-2 rounded-lg ${view === 'simple' ? 'bg-white' : ''}`}
          >
            <Eye size={14} color={view === 'simple' ? colors.ventureroot.green : '#6B7280'} />
            <Text className={`ml-1.5 font-bold text-xs ${view === 'simple' ? 'text-ventureroot-green' : 'text-gray-500'}`}>
              Simple
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setView('full')}
            className={`flex-row items-center px-4 py-2 rounded-lg ${view === 'full' ? 'bg-white' : ''}`}
          >
            <LayoutGrid size={14} color={view === 'full' ? colors.ventureroot.green : '#6B7280'} />
            <Text className={`ml-1.5 font-bold text-xs ${view === 'full' ? 'text-ventureroot-green' : 'text-gray-500'}`}>
              Full register
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={colors.ventureroot.green} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {/* Frozen name column (left) + horizontally-scrollable columns (right),
              both inside this single vertical ScrollView so they scroll vertically
              together — the only horizontal scroll is the right-hand ScrollView. */}
          <View className="flex-row px-4">
            <View style={{ width: NAME_COL_WIDTH }}>
              <RegisterHeaderCell label="Product" width={NAME_COL_WIDTH} />
              {rows.map((p) => {
                const category = categories.find((c) => c.id === p.category_id);
                const CatIcon = getCategoryIconComponent(category?.icon);
                const catTint = category?.tint || DEFAULT_CATEGORY_TINT;
                return (
                  <View key={p.id} className="flex-row items-center bg-white border-b border-gray-50 py-3 pr-2" style={{ width: NAME_COL_WIDTH, height: 56 }}>
                    <View className="w-7 h-7 rounded-lg items-center justify-center mr-2" style={{ backgroundColor: catTint + '1A' }}>
                      <CatIcon size={13} color={catTint} strokeWidth={2} />
                    </View>
                    <Text className="text-gray-900 font-bold text-xs flex-1" numberOfLines={1}>{p.name}</Text>
                  </View>
                );
              })}
              <View className="flex-row items-center bg-gray-50 py-3" style={{ width: NAME_COL_WIDTH, height: 48 }}>
                <Text className="text-gray-900 font-black text-xs">Total — {rows.length}</Text>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                <View className="flex-row">
                  <RegisterHeaderCell label="SKU" width={90} />
                  <RegisterHeaderCell label="Balance" width={70} align="right" />
                  {view === 'full' && <RegisterHeaderCell label="Unit" width={70} />}
                  {view === 'full' && <RegisterHeaderCell label="Reorder at" width={80} align="right" />}
                  <RegisterHeaderCell label="Status" width={90} />
                  {view === 'full' && <RegisterHeaderCell label="Cost" width={90} align="right" />}
                  <RegisterHeaderCell label="Sell price" width={90} align="right" />
                  {view === 'full' && <RegisterHeaderCell label="Margin" width={70} align="right" />}
                  <RegisterHeaderCell label="Stock value" width={100} align="right" />
                </View>

                {rows.map((p) => {
                  const balance = p.total_quantity_on_hand ?? p.quantity_on_hand ?? 0;
                  const s = status(p);
                  const value = balance * p.cost_price_kobo;
                  const margin = p.selling_price_kobo > 0
                    ? Math.round(((p.selling_price_kobo - p.cost_price_kobo) / p.selling_price_kobo) * 100)
                    : 0;
                  return (
                    <View key={p.id} className="flex-row items-center bg-white border-b border-gray-50" style={{ height: 56 }}>
                      <RegisterCell width={90} mono>{p.sku}</RegisterCell>
                      <RegisterCell width={70} align="right" bold>{balance.toLocaleString()}</RegisterCell>
                      {view === 'full' && <RegisterCell width={70}>{p.unit_of_measure}</RegisterCell>}
                      {view === 'full' && <RegisterCell width={80} align="right">{p.minimum_stock_level}</RegisterCell>}
                      <View style={{ width: 90 }}>
                        <View className="px-2 py-1 rounded-full self-start" style={{ backgroundColor: s.color + '1A' }}>
                          <Text className="text-[10px] font-bold" style={{ color: s.color }}>{s.label}</Text>
                        </View>
                      </View>
                      {view === 'full' && <RegisterCell width={90} align="right">₦{(p.cost_price_kobo / 100).toLocaleString()}</RegisterCell>}
                      <RegisterCell width={90} align="right">₦{(p.selling_price_kobo / 100).toLocaleString()}</RegisterCell>
                      {view === 'full' && <RegisterCell width={70} align="right">{margin}%</RegisterCell>}
                      <RegisterCell width={100} align="right" bold>₦{(value / 100).toLocaleString()}</RegisterCell>
                    </View>
                  );
                })}

                <View className="flex-row items-center bg-gray-50" style={{ height: 48 }}>
                  <RegisterCell width={90}>{''}</RegisterCell>
                  <RegisterCell width={70} align="right" bold>{totals.units.toLocaleString()}</RegisterCell>
                  {view === 'full' && <RegisterCell width={70}>{''}</RegisterCell>}
                  {view === 'full' && <RegisterCell width={80}>{''}</RegisterCell>}
                  <RegisterCell width={90}>{''}</RegisterCell>
                  {view === 'full' && <RegisterCell width={90}>{''}</RegisterCell>}
                  <RegisterCell width={90}>{''}</RegisterCell>
                  {view === 'full' && <RegisterCell width={70}>{''}</RegisterCell>}
                  <RegisterCell width={100} align="right" bold color={colors.ventureroot.gold as any}>
                    ₦{(totals.value / 100).toLocaleString()}
                  </RegisterCell>
                </View>
              </View>
            </ScrollView>
          </View>

          <View className="h-10" />
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

function RegisterHeaderCell({ label, width, align = 'left' }: { label: string; width: number; align?: 'left' | 'right' }) {
  return (
    <View style={{ width, paddingVertical: 10, paddingHorizontal: 6 }}>
      <Text
        className="text-gray-400 text-[9px] font-bold uppercase"
        style={{ textAlign: align }}
      >
        {label}
      </Text>
    </View>
  );
}

function RegisterCell({
  width, align = 'left', bold, mono, color, children,
}: {
  width: number; align?: 'left' | 'right'; bold?: boolean; mono?: boolean; color?: string; children: React.ReactNode;
}) {
  return (
    <View style={{ width, paddingHorizontal: 6 }}>
      <Text
        className={`text-gray-700 text-xs ${bold ? 'font-black text-gray-900' : ''} ${mono ? 'font-mono' : ''}`}
        style={{ textAlign: align, color: color || undefined }}
        numberOfLines={1}
      >
        {children}
      </Text>
    </View>
  );
}

export default InventoryRegisterScreen;
