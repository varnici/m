import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Download, ArrowDownToLine, ArrowUpFromLine, Wallet } from 'lucide-react-native';
import type { RootStackScreenProps } from '@/navigation/types';
import AppHeader from '@/components/ui/AppHeader';
import { colors } from '@/theme/colors';
import { inventoryService } from '@/services/inventoryService';
import { inventoryKeys } from '@/hooks/inventoryKeys';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { shareCsv } from '@/services/csvExport';

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatDisplayDate(d: Date): string {
  return d.toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

const DailyReportScreen = ({ route }: RootStackScreenProps<'DailyReport'>) => {
  const { store } = useBusinessProfile();
  const storeId = route.params?.storeId || store?.id;
  const [date, setDate] = useState(new Date());
  const dateKey = toDateKey(date);
  const [exporting, setExporting] = useState(false);

  const { data: report, isLoading } = useQuery({
    queryKey: inventoryKeys.dailyReport(dateKey, storeId),
    queryFn: () => inventoryService.getDailyReport(dateKey, storeId),
    enabled: !!storeId,
  });

  const shiftDay = (delta: number) => {
    const next = new Date(date);
    next.setDate(next.getDate() + delta);
    setDate(next);
  };

  const isToday = toDateKey(new Date()) === dateKey;

  const handleExport = async () => {
    if (!storeId) return;
    setExporting(true);
    try {
      const csv = await inventoryService.exportDailyReportCsv(dateKey, storeId);
      await shareCsv(csv, `daily-report-${dateKey}.csv`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background-page" edges={['bottom', 'left', 'right']}>
      <AppHeader
        title="Daily report"
        rightAction={
          <TouchableOpacity onPress={handleExport} disabled={exporting || !report} className="p-2 rounded-xl bg-gray-100">
            {exporting ? <ActivityIndicator size="small" color="#374151" /> : <Download size={18} color="#374151" />}
          </TouchableOpacity>
        }
      />

      <View className="flex-row items-center justify-between px-4 pt-4">
        <TouchableOpacity onPress={() => shiftDay(-1)} className="p-2 bg-white rounded-xl border border-gray-100">
          <ChevronLeft size={18} color="#374151" />
        </TouchableOpacity>
        <Text className="text-gray-900 font-bold">{formatDisplayDate(date)}</Text>
        <TouchableOpacity onPress={() => shiftDay(1)} disabled={isToday} className="p-2 bg-white rounded-xl border border-gray-100">
          <ChevronRight size={18} color={isToday ? '#D1D5DB' : '#374151'} />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <ActivityIndicator size="large" color={colors.ventureroot.green} style={{ marginTop: 60 }} />
        ) : !report ? (
          <Text className="text-gray-400 text-center mt-16">No store set up yet.</Text>
        ) : (
          <>
            <View className="bg-white rounded-3xl border border-gray-100 p-5 mb-4">
              <Text className="text-gray-400 text-[10px] font-bold uppercase mb-3">Stock value</Text>
              <View className="flex-row justify-between">
                <View>
                  <Text className="text-gray-400 text-xs">Opening</Text>
                  <Text className="text-gray-900 font-black text-xl">
                    ₦{(report.opening_value_kobo / 100).toLocaleString()}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-gray-400 text-xs">
                    Closing{report.is_closing_value_estimated ? ' (est.)' : ''}
                  </Text>
                  <Text className="text-gray-900 font-black text-xl">
                    ₦{(report.closing_value_kobo / 100).toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>

            <View className="flex-row gap-3 mb-4">
              <View className="flex-1 bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                <ArrowDownToLine size={18} color="#16654A" />
                <Text className="text-emerald-900 text-[10px] font-bold uppercase mt-2">Received</Text>
                <Text className="text-emerald-900 font-black text-lg">{report.units_received}</Text>
              </View>
              <View className="flex-1 bg-rose-50 border border-rose-100 rounded-2xl p-4">
                <ArrowUpFromLine size={18} color="#A32036" />
                <Text className="text-rose-900 text-[10px] font-bold uppercase mt-2">Issued</Text>
                <Text className="text-rose-900 font-black text-lg">{report.units_issued}</Text>
              </View>
            </View>

            <View className="bg-white rounded-2xl border border-gray-100 p-4 mb-8 flex-row items-center">
              <Wallet size={16} color="#9CA3AF" />
              <Text className="text-gray-500 text-xs ml-2">
                {report.movement_count} stock movement{report.movement_count === 1 ? '' : 's'} recorded on this day.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default DailyReportScreen;
