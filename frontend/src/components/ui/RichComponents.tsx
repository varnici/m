import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle, Platform } from 'react-native';
import { colors, spacing, borderRadius } from '../../theme/colors';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

interface RichGlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const RichGlassCard: React.FC<RichGlassCardProps> = ({ children, style }) => {
  return (
    <View style={[styles.glassContainer, style]}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={20} tint="light" style={styles.blur}>
          {children}
        </BlurView>
      ) : (
        <View style={[styles.blur, { backgroundColor: colors.ventureroot.rich.glass }]}>
          {children}
        </View>
      )}
    </View>
  );
};

interface RichGradientButtonProps {
  title: string;
  onPress: () => void;
  style?: ViewStyle;
}

export const RichGradientButton: React.FC<RichGradientButtonProps> = ({ title, onPress, style }) => {
  return (
    <TouchableOpacity onPress={onPress}>
      <LinearGradient
        colors={[colors.ventureroot.rich.primary, colors.ventureroot.rich.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradientButton, style]}
      >
        <Text style={styles.buttonText}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

export const RichText = ({ 
  children, 
  variant = 'body', 
  style 
}: { 
  children: React.ReactNode, 
  variant?: 'h1' | 'h2' | 'body' | 'caption', 
  style?: TextStyle 
}) => {
  const getStyles = (): TextStyle => {
    switch (variant) {
      case 'h1': return { fontSize: 32, fontWeight: '800', color: colors.ventureroot.rich.onSurface, letterSpacing: -0.5, marginBottom: spacing.sm };
      case 'h2': return { fontSize: 24, fontWeight: '700', color: colors.ventureroot.rich.onSurface, letterSpacing: -0.3 };
      case 'caption': return { fontSize: 13, color: 'rgba(248, 250, 252, 0.7)', lineHeight: 18 };
      default: return { fontSize: 16, color: colors.ventureroot.rich.onSurface, lineHeight: 24 };
    }
  };

  return <Text style={[getStyles(), style]}>{children}</Text>;
};

const styles = StyleSheet.create({
  glassContainer: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.ventureroot.rich.glassBorder,
  },
  blur: {
    padding: spacing.lg,
  },
  gradientButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: colors.ventureroot.rich.onSurface,
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
