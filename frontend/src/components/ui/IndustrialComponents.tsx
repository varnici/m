import { View, Text, TouchableOpacity, ViewStyle, TextStyle, useColorScheme, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius } from '../../theme/colors';

export const useIndustrialTheme = () => {
  const isDark = useColorScheme() === 'dark';
  return isDark ? colors.ventureroot.industrial.dark : colors.ventureroot.industrial.light;
};

export const IndustrialPage = ({ children, style }: { children: React.ReactNode, style?: ViewStyle }) => {
  const theme = useIndustrialTheme();
  const isDark = useColorScheme() === 'dark';
  
  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: theme.background }, style]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      {children}
    </SafeAreaView>
  );
};

interface IndustrialCardProps {
  children: React.ReactNode;
  variant?: 'low' | 'high' | 'highest';
  style?: ViewStyle;
}

export const IndustrialCard: React.FC<IndustrialCardProps> = ({ children, variant = 'low', style }) => {
  const theme = useIndustrialTheme();
  
  const getBackgroundColor = () => {
    switch (variant) {
      case 'high': return theme.surfaceHigh;
      case 'highest': return theme.surfaceHighest;
      default: return theme.surfaceLow;
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
          borderWidth: 1,
          borderColor: theme.outline,
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
  const theme = useIndustrialTheme();

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
          color: isPrimary ? '#FFFFFF' : colors.ventureroot.industrial.primary,
          fontSize: 16,
          fontWeight: '700',
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
  style,
  className,
}: { 
  children: React.ReactNode, 
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'label', 
  style?: TextStyle,
  className?: string,
}) => {
  const theme = useIndustrialTheme();
  
  const getStyles = (): TextStyle => {
    switch (variant) {
      case 'h1': return { fontSize: 32, fontWeight: '800', color: theme.onSurface };
      case 'h2': return { fontSize: 24, fontWeight: '700', color: theme.onSurface };
      case 'h3': return { fontSize: 20, fontWeight: '600', color: theme.onSurface };
      case 'label': return { fontSize: 12, fontWeight: '500', color: colors.ventureroot.industrial.primary, letterSpacing: 1 };
      default: return { fontSize: 16, color: theme.onSurface, opacity: 0.8 };
    }
  };

  return <Text className={className} style={[getStyles(), style]}>{children}</Text>;
};
