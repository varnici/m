import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Animated,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  X,
  Copy,
  CheckCircle,
} from 'lucide-react-native';
import type { RootStackScreenProps } from '@/navigation/types';

type Transaction = {
  id: string;
  reference: string;
  description: string;
  type: 'sale' | 'repayment' | 'deposit' | 'withdrawal' | 'loan';
  amount: number; // in Naira
  fee: number; // in Naira
  status: 'successful' | 'pending' | 'failed';
  timestamp: Date;
  channel: string;
};

const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: '1',
    reference: 'TXN-9028-19803',
    description: 'Working Capital Loan Payout',
    type: 'loan',
    amount: 45000,
    fee: 450,
    status: 'successful',
    timestamp: new Date(2026, 4, 21, 11, 30),
    channel: 'VentureRoot Credit Core',
  },
  {
    id: '2',
    reference: 'TXN-7230-89104',
    description: 'Wholesale Drinks Purchase',
    type: 'withdrawal',
    amount: -12500,
    fee: 100,
    status: 'successful',
    timestamp: new Date(2026, 4, 21, 9, 15),
    channel: 'Access Bank NUBAN',
  },
  {
    id: '3',
    reference: 'TXN-5510-48291',
    description: 'Daily Shop Retail Sale',
    type: 'sale',
    amount: 8300,
    fee: 0,
    status: 'successful',
    timestamp: new Date(2026, 4, 20, 18, 45),
    channel: 'VentureRoot QR Scan',
  },
  {
    id: '4',
    reference: 'TXN-1029-77402',
    description: 'Weekly Loan Installment Repay',
    type: 'repayment',
    amount: -7500,
    fee: 0,
    status: 'successful',
    timestamp: new Date(2026, 4, 20, 8, 0),
    channel: 'VentureRoot Wallet Direct',
  },
  {
    id: '5',
    reference: 'TXN-8392-48201',
    description: 'Escrow Release: Cluster Pool',
    type: 'deposit',
    amount: 24500,
    fee: 50,
    status: 'successful',
    timestamp: new Date(2026, 4, 19, 14, 20),
    channel: 'VentureRoute Escrow Engine',
  },
  {
    id: '6',
    reference: 'TXN-2201-99401',
    description: 'Credit Card Deposit',
    type: 'deposit',
    amount: 15000,
    fee: 120,
    status: 'failed',
    timestamp: new Date(2026, 4, 18, 16, 10),
    channel: 'Linked Verve Card',
  },
  {
    id: '7',
    reference: 'TXN-4920-33829',
    description: 'Retail Sale: Provisioning',
    type: 'sale',
    amount: 19500,
    fee: 0,
    status: 'successful',
    timestamp: new Date(2026, 4, 18, 11, 40),
    channel: 'VentureRoot QR Scan',
  },
];

const FILTERS = ['All', 'Sales', 'Repayments', 'Deposits', 'Withdrawals', 'Loans'];

const TransactionHistoryScreen = ({ navigation }: RootStackScreenProps<'TransactionHistory'>) => {
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [copied, setCopied] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const copyToClipboard = (text: string) => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getFilteredTransactions = () => {
    return MOCK_TRANSACTIONS.filter(tx => {
      // Filter by Search Query
      const matchesSearch = tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.reference.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;

      // Filter by category
      if (selectedFilter === 'All') return true;
      if (selectedFilter === 'Sales' && tx.type === 'sale') return true;
      if (selectedFilter === 'Repayments' && tx.type === 'repayment') return true;
      if (selectedFilter === 'Deposits' && tx.type === 'deposit') return true;
      if (selectedFilter === 'Withdrawals' && tx.type === 'withdrawal') return true;
      if (selectedFilter === 'Loans' && tx.type === 'loan') return true;

      return false;
    });
  };

  const groupTransactionsByDate = (txList: Transaction[]) => {
    const groups: { [key: string]: Transaction[] } = {};
    
    txList.forEach(tx => {
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      let dateStr = tx.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      if (tx.timestamp.toDateString() === today.toDateString()) {
        dateStr = 'Today';
      } else if (tx.timestamp.toDateString() === yesterday.toDateString()) {
        dateStr = 'Yesterday';
      }

      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      groups[dateStr].push(tx);
    });

    return groups;
  };

  const filteredTxs = getFilteredTransactions();
  const groupedTxs = groupTransactionsByDate(filteredTxs);

  const getTxTypeDetails = (type: Transaction['type'], amount: number) => {
    const isCredit = amount > 0;
    switch (type) {
      case 'sale':
        return { label: 'Retail Sale', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: <ArrowDownLeft size={16} color="#059669" /> };
      case 'repayment':
        return { label: 'Loan Repay', color: 'text-rose-600', bg: 'bg-rose-50', icon: <ArrowUpRight size={16} color="#DC2626" /> };
      case 'deposit':
        return { label: 'Deposit', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: <ArrowDownLeft size={16} color="#059669" /> };
      case 'withdrawal':
        return { label: 'Withdrawal', color: 'text-rose-600', bg: 'bg-rose-50', icon: <ArrowUpRight size={16} color="#DC2626" /> };
      case 'loan':
        return { label: 'Loan Payout', color: 'text-indigo-600', bg: 'bg-indigo-50', icon: <ArrowDownLeft size={16} color="#4F46E5" /> };
      default:
        return { label: 'General', color: 'text-slate-600', bg: 'bg-slate-50', icon: <RefreshCw size={16} color="#475569" /> };
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <StatusBar barStyle="dark-content" />
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-slate-100">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center"
          >
            <ChevronLeft size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text className="text-slate-900 font-extrabold text-base">Transaction Ledger</Text>
          <View className="w-10" />
        </View>

        {/* Search and Filters Block */}
        <View className="bg-white px-4 py-3 border-b border-slate-100">
          <View className="flex-row items-center bg-slate-50 border border-slate-100 px-3.5 py-2.5 rounded-2xl mb-3">
            <Search size={18} color="#94A3B8" className="mr-2" />
            <TextInput
              placeholder="Search by description or reference..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 text-slate-800 text-xs"
              placeholderTextColor="#94A3B8"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={16} color="#64748B" />
              </TouchableOpacity>
            )}
          </View>

          {/* Horizontal Filters Scroll */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="flex-row gap-2"
          >
            {FILTERS.map(filter => (
              <TouchableOpacity
                key={filter}
                onPress={() => setSelectedFilter(filter)}
                className={`rounded-full px-4 py-2 border mr-2 ${
                  selectedFilter === filter
                    ? 'bg-ventureroot-green border-ventureroot-green'
                    : 'bg-white border-slate-200'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    selectedFilter === filter ? 'text-white' : 'text-slate-600'
                  }`}
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Transaction History Ledger */}
        <ScrollView
          className="flex-1 px-4 pt-4"
          showsVerticalScrollIndicator={false}
        >
          {Object.keys(groupedTxs).length === 0 ? (
            <View className="items-center justify-center py-12">
              <Text className="text-slate-400 text-sm font-semibold">No transactions matched your filters.</Text>
            </View>
          ) : (
            Object.keys(groupedTxs).map(dateStr => (
              <View key={dateStr} className="mb-6">
                <Text className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">
                  {dateStr}
                </Text>
                
                <View className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  {groupedTxs[dateStr].map((tx, index) => {
                    const isCredit = tx.amount > 0;
                    const typeDetails = getTxTypeDetails(tx.type, tx.amount);
                    const formattedAmt = `${isCredit ? '+' : ''}₦${Math.abs(tx.amount).toLocaleString()}`;
                    
                    return (
                      <TouchableOpacity
                        key={tx.id}
                        onPress={() => setSelectedTx(tx)}
                        activeOpacity={0.7}
                        className={`flex-row items-center p-4 justify-between ${
                          index < groupedTxs[dateStr].length - 1 ? 'border-b border-slate-50' : ''
                        }`}
                      >
                        <View className="flex-row items-center flex-1 mr-3">
                          <View className={`w-10 h-10 rounded-xl items-center justify-center mr-3 ${typeDetails.bg}`}>
                            {typeDetails.icon}
                          </View>
                          <View className="flex-1">
                            <Text className="text-slate-900 font-extrabold text-sm" numberOfLines={1}>
                              {tx.description}
                            </Text>
                            <Text className="text-slate-400 text-[10px] mt-0.5 font-medium">
                              {typeDetails.label} · {tx.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                          </View>
                        </View>
                        
                        <View className="items-end">
                          <Text className={`text-sm font-black ${typeDetails.color}`}>
                            {formattedAmt}
                          </Text>
                          <Text className={`text-[9px] mt-0.5 font-bold uppercase tracking-wider ${
                            tx.status === 'successful' ? 'text-emerald-600' : tx.status === 'failed' ? 'text-red-500' : 'text-amber-500'
                          }`}>
                            {tx.status}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))
          )}
          <View className="h-10" />
        </ScrollView>

        {/* Transaction Detail Slide-up Modal */}
        <Modal
          visible={!!selectedTx}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setSelectedTx(null)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <View className="bg-white rounded-t-[40px] p-6 pb-12 border-t border-slate-100">
              
              {/* Top Handle / Close */}
              <View className="flex-row items-center justify-between mb-6">
                <Text className="text-slate-900 font-black text-lg">Activity Details</Text>
                <TouchableOpacity
                  onPress={() => setSelectedTx(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
                >
                  <X size={18} color="#1E293B" />
                </TouchableOpacity>
              </View>

              {selectedTx && (
                <View>
                  {/* Big Amount Box */}
                  <View className="items-center py-6 border-b border-slate-100 mb-6">
                    <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Transaction Amount</Text>
                    <Text className={`text-3xl font-black ${selectedTx.amount > 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
                      {selectedTx.amount > 0 ? '+' : ''}₦{selectedTx.amount.toLocaleString()}
                    </Text>
                    <View className={`mt-3 px-3 py-1 rounded-full flex-row items-center border ${
                      selectedTx.status === 'successful'
                        ? 'bg-emerald-50 border-emerald-100'
                        : selectedTx.status === 'failed'
                        ? 'bg-red-50 border-red-100'
                        : 'bg-amber-50 border-amber-100'
                    }`}>
                      <Text className={`text-[10px] font-black uppercase tracking-wider ${
                        selectedTx.status === 'successful'
                          ? 'text-emerald-700'
                          : selectedTx.status === 'failed'
                          ? 'text-red-700'
                          : 'text-amber-700'
                      }`}>
                        {selectedTx.status}
                      </Text>
                    </View>
                  </View>

                  {/* Detail Grid */}
                  <View className="gap-4 mb-6">
                    <View className="flex-row justify-between">
                      <Text className="text-slate-400 text-xs font-bold">DESCRIPTION</Text>
                      <Text className="text-slate-800 text-xs font-bold text-right flex-1 ml-4">{selectedTx.description}</Text>
                    </View>

                    <View className="flex-row justify-between">
                      <Text className="text-slate-400 text-xs font-bold">TYPE</Text>
                      <Text className="text-slate-800 text-xs font-bold uppercase tracking-wider">{selectedTx.type}</Text>
                    </View>

                    <View className="flex-row justify-between items-center">
                      <Text className="text-slate-400 text-xs font-bold">REFERENCE REF</Text>
                      <TouchableOpacity
                        onPress={() => copyToClipboard(selectedTx.reference)}
                        className="flex-row items-center bg-slate-50 px-2 py-1 rounded-lg border border-slate-100"
                      >
                        <Text className="text-slate-700 text-xs font-bold mr-1">{selectedTx.reference}</Text>
                        {copied ? <CheckCircle size={12} color="#10B981" /> : <Copy size={12} color="#64748B" />}
                      </TouchableOpacity>
                    </View>

                    <View className="flex-row justify-between">
                      <Text className="text-slate-400 text-xs font-bold">CHANNEL USED</Text>
                      <Text className="text-slate-800 text-xs font-bold">{selectedTx.channel}</Text>
                    </View>

                    <View className="flex-row justify-between">
                      <Text className="text-slate-400 text-xs font-bold">PLATFORM FEE</Text>
                      <Text className="text-slate-800 text-xs font-bold">₦{selectedTx.fee}</Text>
                    </View>

                    <View className="flex-row justify-between">
                      <Text className="text-slate-400 text-xs font-bold">TIMESTAMP</Text>
                      <Text className="text-slate-800 text-xs font-bold">
                        {selectedTx.timestamp.toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </Text>
                    </View>
                  </View>

                  {/* Return Button */}
                  <TouchableOpacity
                    onPress={() => setSelectedTx(null)}
                    className="w-full bg-ventureroot-green py-4 rounded-2xl items-center shadow-lg shadow-emerald-800/10 mt-2"
                  >
                    <Text className="text-white font-extrabold text-sm">Close Receipt Details</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>

      </Animated.View>
    </SafeAreaView>
  );
};

export default TransactionHistoryScreen;
