import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { TriangleAlert } from 'lucide-react-native';

interface RepaymentBannerProps {
  daysUntilDue: number;
  amount: number;
  dueDate: string;
  bank: string;
  onPayNow?: () => void;
}

const formatNaira = (amount: number): string => {
  return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const RepaymentBanner = ({
  daysUntilDue = 9,
  amount = 16000,
  dueDate = 'Dec 25',
  bank = 'GTBank',
  onPayNow,
}: RepaymentBannerProps) => {
  const isUrgent = daysUntilDue <= 3;
  const bgColor = isUrgent ? 'bg-red-100' : 'bg-amber-50';

  return (
    <View
      className={`${bgColor} rounded-2xl p-4 mx-4 flex-row items-center`}
      accessible={true}
      accessibilityLabel={`Repayment due in ${daysUntilDue} days. ${formatNaira(amount)} auto-sweep.`}
      accessibilityRole="alert"
    >
      {/* Warning Icon */}
      <View className="w-10 h-10 rounded-full bg-red-200 items-center justify-center mr-3">
        <TriangleAlert size={20} color="#EF4444" />
      </View>

      {/* Info */}
      <View className="flex-1">
        <Text className="text-gray-900 font-bold text-sm">
          Repayment Due in {daysUntilDue} days
        </Text>
        <Text className="text-gray-500 text-xs mt-0.5">
          {formatNaira(amount)} auto-sweep · {dueDate} · {bank}
        </Text>
      </View>

      {/* Pay Now CTA */}
      <TouchableOpacity
        className="bg-red-500 rounded-xl px-4 py-2.5"
        onPress={onPayNow}
        accessible={true}
        accessibilityLabel="Pay now"
        accessibilityRole="button"
      >
        <Text className="text-white text-xs font-bold">Pay Now</Text>
      </TouchableOpacity>
    </View>
  );
};

export default RepaymentBanner;
