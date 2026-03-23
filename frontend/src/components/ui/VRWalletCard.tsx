import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Eye, EyeOff, ArrowUp, Send, ArrowDown, MoreHorizontal } from 'lucide-react-native';
import { colors } from '@/theme/colors';

interface WalletAction {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
}

interface VRWalletCardProps {
  walletId?: string;
  balance: number;
  dailyChange?: number;
  loanDueDate?: string;
  onToggleVisibility?: () => void;
  balanceVisible?: boolean;
  onPress?: () => void;
}

const formatNaira = (amount: number): string => {
  return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const VRWalletCard = ({
  walletId = 'VR-W-00284',
  balance = 45200.0,
  dailyChange = 18400,
  loanDueDate = 'Dec 25',
  onToggleVisibility,
  balanceVisible = true,
  onPress,
}: VRWalletCardProps) => {
  const actions: WalletAction[] = [
    {
      icon: <ArrowUp size={20} color={colors.ventureroot.green} />,
      label: 'Add',
    },
    {
      icon: <Send size={20} color={colors.ventureroot.green} />,
      label: 'Send',
    },
    {
      icon: <ArrowDown size={20} color={colors.ventureroot.green} />,
      label: 'Withdraw',
    },
    {
      icon: <MoreHorizontal size={20} color={colors.ventureroot.green} />,
      label: 'More',
    },
  ];

  return (
    <TouchableOpacity
      className="bg-ventureroot-green rounded-2xl p-4 mx-4 border border-white/10"
      onPress={onPress}
      activeOpacity={0.9}
      accessible={true}
      accessibilityLabel="VR Wallet Card"
    >
      {/* Wallet ID Row */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <Text className="text-white/70 text-xs font-medium">
            VR Wallet · {walletId}
          </Text>
          <View className="ml-1 opacity-50">
            <MoreHorizontal size={12} color="white" />
          </View>
        </View>
        <TouchableOpacity
          onPress={onToggleVisibility}
          accessible={true}
          accessibilityLabel={balanceVisible ? 'Hide balance' : 'Show balance'}
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {balanceVisible ? (
            <Eye size={18} color="rgba(255,255,255,0.7)" />
          ) : (
            <EyeOff size={18} color="rgba(255,255,255,0.7)" />
          )}
        </TouchableOpacity>
      </View>

      {/* Balance */}
      <Text
        className="text-white text-3xl font-bold mb-1"
        accessible={true}
        accessibilityLabel={`Balance: ${formatNaira(balance)}`}
      >
        {balanceVisible ? formatNaira(balance) : '₦••••••'}
      </Text>

      {/* Daily Change + Loan Info */}
      <View className="flex-row items-center mb-6">
        <Text className="text-emerald-300 text-xs font-bold">
          ↑ +{formatNaira(dailyChange)} today
        </Text>
        <Text className="text-white/40 text-xs mx-2">|</Text>
        <Text className="text-white/70 text-xs">
          Loan due {loanDueDate}
        </Text>
      </View>

      {/* Action Buttons */}
      <View className="flex-row justify-between pt-4 border-t border-white/10">
        {actions.map((action, index) => (
          <TouchableOpacity
            key={index}
            className="items-center"
            onPress={action.onPress}
            accessible={true}
            accessibilityLabel={action.label}
            accessibilityRole="button"
          >
            <View className="w-12 h-12 rounded-full bg-white/20 items-center justify-center mb-2">
              {React.cloneElement(action.icon as any, { color: 'white' })}
            </View>
            <Text className="text-white text-xs font-medium">{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </TouchableOpacity>
  );
};

export default VRWalletCard;
