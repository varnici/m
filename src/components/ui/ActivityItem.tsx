import React from 'react';
import { View, Text } from 'react-native';

type TransactionType = 'credit' | 'debit' | 'loan';

interface ActivityItemProps {
  title: string;
  subtitle: string;
  amount: number;
  type: TransactionType;
  icon: React.ReactNode;
  timeAgo?: string;
}

const formatNaira = (amount: number): string => {
  return `₦${Math.abs(amount).toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const ActivityItem = ({
  title,
  subtitle,
  amount,
  type,
  icon,
  timeAgo,
}: ActivityItemProps) => {
  const isCredit = type === 'credit' || type === 'loan';
  const amountColor = isCredit ? 'text-emerald-600' : 'text-red-500';
  const prefix = isCredit ? '+' : '-';

  return (
    <View
      className="flex-row items-center py-4 border-b border-gray-100"
      accessible={true}
      accessibilityLabel={`${title}. ${prefix}${formatNaira(amount)}. ${subtitle}`}
      accessibilityRole="summary"
    >
      {/* Icon */}
      <View className="mr-3">
        {icon}
      </View>

      {/* Info */}
      <View className="flex-1">
        <Text className="text-gray-900 font-semibold text-sm">
          {title}
        </Text>
        <Text className="text-gray-400 text-xs mt-0.5">
          {subtitle}{timeAgo ? ` · ${timeAgo}` : ''}
        </Text>
      </View>

      {/* Amount */}
      <Text className={`font-bold text-sm ${amountColor}`}>
        {prefix}{formatNaira(amount)}
      </Text>
    </View>
  );
};

export default ActivityItem;
