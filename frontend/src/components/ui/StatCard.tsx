import React from 'react';
import { View, Text } from 'react-native';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    label: string;
  };
  progress?: {
    current: number;
    max: number;
  };
  badge?: string;
  children?: React.ReactNode;
}

const StatCard = ({
  title,
  value,
  subtitle,
  trend,
  progress,
  badge,
  children,
}: StatCardProps) => {
  const trendColor =
    trend?.direction === 'up'
      ? 'text-emerald-500'
      : trend?.direction === 'down'
      ? 'text-red-500'
      : 'text-gray-500';

  return (
    <View
      className="bg-white rounded-2xl p-4 flex-1 border border-gray-100 shadow-sm"
      accessible={true}
      accessibilityLabel={`${title}: ${value}`}
      accessibilityRole="summary"
    >
      {/* Title */}
      <Text className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-2">
        {title}
      </Text>

      {/* Value Row */}
      <View className="flex-row items-baseline mb-1">
        <Text className="text-gray-900 text-2xl font-bold">
          {value}
        </Text>
        {subtitle && (
          <Text className="text-gray-400 text-sm ml-1">
            {subtitle}
          </Text>
        )}
      </View>

      {/* Progress Bar (for Credit Score) */}
      {progress && (
        <View className="mt-2 mb-1">
          <View className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <View
              className="h-full bg-ventureroot-green rounded-full"
              style={{
                width: `${Math.min((progress.current / progress.max) * 100, 100)}%`,
              }}
            />
          </View>
        </View>
      )}

      {/* Trend or Sparkline */}
      <View className="flex-row items-center justify-between mt-auto">
        {trend && (
          <View className="flex-row items-center">
            <Text className={`text-[10px] font-bold ${trendColor}`}>
              {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : ''} {trend.label}
            </Text>
          </View>
        )}
        
        {/* Simple Sparkline Graph Placeholder for Sales */}
        {title === "TODAY'S SALES" && (
          <View className="flex-row items-end h-6 gap-0.5">
            {[30, 45, 25, 60, 40, 70].map((h, i) => (
              <View 
                key={i} 
                className="w-1 bg-emerald-100 rounded-full" 
                style={{ height: `${h}%` }} 
              />
            ))}
          </View>
        )}
      </View>

      {/* Optional chart or custom child */}
      {children}
    </View>
  );
};

export default StatCard;
