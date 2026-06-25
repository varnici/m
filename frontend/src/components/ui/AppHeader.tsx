import React from 'react';
import { View, Text, TouchableOpacity, StatusBar, Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useAppNavigationStore } from '@/store/appNavigationStore';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  variant?: 'green' | 'white' | 'transparent';
}

export default function AppHeader({
  title,
  subtitle,
  showBack = true,
  onBack,
  rightAction,
  variant = 'white',
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const goBack = useAppNavigationStore((s) => s.goBack);
  const canGoBack = useAppNavigationStore((s) => s.canGoBack);
  const { width } = useWindowDimensions();

  const isGreen = variant === 'green';
  const isTransparent = variant === 'transparent';
  const textColor = isGreen || isTransparent ? '#FFFFFF' : '#0F172A';
  const subtitleColor = isGreen || isTransparent ? 'rgba(255,255,255,0.7)' : '#64748B';
  const iconColor = isGreen || isTransparent ? '#FFFFFF' : '#0F172A';
  const bgColor = isGreen ? '#004D2C' : isTransparent ? 'transparent' : '#FFFFFF';

  const handleBack = onBack || goBack;
  const shouldShowBack = showBack && (canGoBack || !!onBack);

  return (
    <View
      style={{
        backgroundColor: bgColor,
        paddingTop: insets.top + 8,
        paddingBottom: 12,
        paddingHorizontal: Math.max(16, width * 0.04),
        borderBottomWidth: isGreen || isTransparent ? 0 : 1,
        borderBottomColor: '#F1F5F9',
      }}
    >
      <StatusBar barStyle={isGreen || isTransparent ? 'light-content' : 'dark-content'} />

      <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 44 }}>
        {shouldShowBack ? (
          <TouchableOpacity
            onPress={handleBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.6}
            accessibilityLabel="Go back"
            accessibilityRole="button"
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: isGreen ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}
          >
            <ChevronLeft size={22} color={iconColor} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 12 }} />
        )}

        <View style={{ flex: 1 }}>
          {subtitle && (
            <Text
              style={{
                fontSize: 10,
                fontWeight: '700',
                color: subtitleColor,
                letterSpacing: 1,
                textTransform: 'uppercase',
                marginBottom: 2,
              }}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          )}
          <Text
            style={{
              fontSize: 18,
              fontWeight: '800',
              color: textColor,
            }}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>

        {rightAction ? (
          <View style={{ marginLeft: 12 }}>{rightAction}</View>
        ) : (
          <View style={{ width: 12 }} />
        )}
      </View>
    </View>
  );
}
