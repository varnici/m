import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle, TextInput, TextInputProps, Platform } from 'react-native';
import { colors, spacing, borderRadius } from '../../theme/colors';

interface CleanCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const CleanCard: React.FC<CleanCardProps> = ({ children, style }) => {
  return (
    <View
      style={[
        {
          backgroundColor: colors.ventureroot.white,
          padding: spacing.lg,
          borderRadius: borderRadius.xl,
          borderWidth: 1,
          borderColor: colors.border.light,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 2,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

interface CleanButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  style?: ViewStyle;
  disabled?: boolean;
}

export const CleanButton: React.FC<CleanButtonProps> = ({ title, onPress, variant = 'primary', style, disabled }) => {
  const isPrimary = variant === 'primary';
  
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        {
          backgroundColor: isPrimary ? colors.ventureroot.green : colors.background.page,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.xl,
          borderRadius: borderRadius.xl,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: isPrimary ? 0 : 1,
          borderColor: isPrimary ? 'transparent' : colors.border.light,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      <Text
        style={{
          color: isPrimary ? colors.ventureroot.white : colors.text.primary,
          fontSize: 16,
          fontWeight: '600',
        }}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};

export const CleanText = ({ 
  children, 
  variant = 'body', 
  style 
}: { 
  children: React.ReactNode, 
  variant?: 'h1' | 'h2' | 'body' | 'caption' | 'label', 
  style?: TextStyle 
}) => {
  const getStyles = (): TextStyle => {
    switch (variant) {
      case 'h1': return { fontSize: 28, fontWeight: '700', color: colors.text.primary, marginBottom: spacing.xs };
      case 'h2': return { fontSize: 20, fontWeight: '600', color: colors.text.primary };
      case 'label': return { fontSize: 12, fontWeight: '700', color: colors.text.secondary, letterSpacing: 1, textTransform: 'uppercase', marginBottom: spacing.xs };
      case 'caption': return { fontSize: 13, color: colors.text.secondary, lineHeight: 18 };
      default: return { fontSize: 16, color: colors.text.primary, lineHeight: 24 };
    }
  };

  return <Text style={[getStyles(), style]}>{children}</Text>;
};

interface CleanInputProps extends TextInputProps {
  label?: string;
  containerStyle?: ViewStyle;
}

export const CleanInput: React.FC<CleanInputProps> = ({ label, containerStyle, ...props }) => {
  return (
    <View style={[styles.inputContainer, containerStyle]}>
      {label && <CleanText variant="label">{label}</CleanText>}
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          placeholderTextColor={colors.text.muted}
          {...props}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    marginBottom: spacing.md,
  },
  inputWrapper: {
    backgroundColor: colors.ventureroot.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.sm,
  },
  input: {
    fontSize: 16,
    color: colors.text.primary,
  },
});
