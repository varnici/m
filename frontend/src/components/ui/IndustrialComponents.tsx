import React from 'react';
import { View, Text, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import { colors, spacing, borderRadius } from '../../theme/colors';
import { styled } from 'nativewind';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);

interface IndustrialCardProps {
  children: React.ReactNode;
  variant?: 'low' | 'high' | 'highest';
  style?: ViewStyle;
}

export const IndustrialCard: React.FC<IndustrialCardProps> = ({ children, variant = 'low', style }) => {
  const getBackgroundColor = () => {
    switch (variant) {
      case 'high': return colors.ventureroot.industrial.surfaceHigh;
      case 'highest': return colors.ventureroot.industrial.surfaceHighest;
      default: return colors.ventureroot.industrial.surfaceLow;
    }
  };

  return (
    <View
      style={[
        {
          backgroundColor: getBackgroundColor(),
          padding: spacing.base,
          borderRadius: borderRadius.lg,
          marginBottom: spacing.md,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

interface IndustrialButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
  style?: ViewStyle;
}

export const IndustrialButton: React.FC<IndustrialButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  disabled,
  style,
}) => {
  const isPrimary = variant === 'primary';
  const isOutline = variant === 'outline';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[
        {
          backgroundColor: isPrimary ? colors.ventureroot.industrial.primary : 'transparent',
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          borderRadius: borderRadius.md,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: isOutline ? 1 : 0,
          borderColor: isOutline ? colors.ventureroot.industrial.primary : 'transparent',
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      <Text
        style={{
          color: isPrimary ? colors.ventureroot.industrial.background : colors.ventureroot.industrial.primary,
          fontSize: 16,
          fontWeight: '700',
          fontFamily: 'Inter-Bold', // Assuming Inter is loaded
        }}
      >
        {title.toUpperCase()}
      </Text>
    </TouchableOpacity>
  );
};

export const IndustrialText = ({ 
  children, 
  variant = 'body', 
  style 
}: { 
  children: React.ReactNode, 
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'label', 
  style?: TextStyle 
}) => {
  const getStyles = (): TextStyle => {
    switch (variant) {
      case 'h1': return { fontSize: 32, fontWeight: '800', color: colors.ventureroot.industrial.onSurface };
      case 'h2': return { fontSize: 24, fontWeight: '700', color: colors.ventureroot.industrial.onSurface };
      case 'h3': return { fontSize: 20, fontWeight: '600', color: colors.ventureroot.industrial.onSurface };
      case 'label': return { fontSize: 12, fontWeight: '500', color: colors.ventureroot.industrial.primary, letterSpacing: 1 };
      default: return { fontSize: 16, color: colors.ventureroot.industrial.onSurface, opacity: 0.8 };
    }
  };

  return <Text style={[getStyles(), style]}>{children}</Text>;
};
