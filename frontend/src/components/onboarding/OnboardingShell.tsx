import React, { ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, HelpCircle } from 'lucide-react-native';
import { colors } from '@/theme/colors';

interface OnboardingShellProps {
  currentStep: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onHelp?: () => void;
  children: ReactNode;
  footer?: ReactNode;
  scrollable?: boolean;
}

export default function OnboardingShell({
  currentStep,
  totalSteps,
  title,
  subtitle,
  onBack,
  onHelp,
  children,
  footer,
  scrollable = true,
}: OnboardingShellProps) {
  const { width } = useWindowDimensions();
  const horizontalPadding = Math.max(20, width * 0.06);
  const progressPct = (currentStep / totalSteps) * 100;

  const content = (
    <>
      <View style={{ paddingHorizontal: horizontalPadding, paddingTop: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          {onBack ? (
            <TouchableOpacity
              onPress={onBack}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: 'rgba(0,0,0,0.05)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <ChevronLeft color="#1E293B" size={22} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}

          <Text style={{ fontSize: 13, fontWeight: '600', color: '#64748B' }}>
            Step {currentStep} of {totalSteps}
          </Text>

          {onHelp ? (
            <TouchableOpacity
              onPress={onHelp}
              style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
              accessibilityLabel="Need help?"
              accessibilityRole="button"
            >
              <HelpCircle size={20} color="#94A3B8" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>

        <View style={{ height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, marginBottom: 24 }}>
          <View
            style={{
              height: 4,
              borderRadius: 2,
              backgroundColor: colors.ventureroot.green,
              width: `${progressPct}%`,
            }}
          />
        </View>

        <Text style={{ fontSize: 24, fontWeight: '800', color: '#0F172A', marginBottom: subtitle ? 6 : 20 }}>
          {title}
        </Text>
        {subtitle && (
          <Text style={{ fontSize: 14, color: '#64748B', lineHeight: 20, marginBottom: 20 }}>
            {subtitle}
          </Text>
        )}
      </View>

      <View style={{ flex: 1, paddingHorizontal: horizontalPadding }}>
        {children}
      </View>
    </>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFBFC' }}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {scrollable ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {content}
          </ScrollView>
        ) : (
          <View style={{ flex: 1 }}>{content}</View>
        )}

        {footer && (
          <View
            style={{
              paddingHorizontal: horizontalPadding,
              paddingVertical: 16,
              backgroundColor: '#FAFBFC',
              borderTopWidth: 1,
              borderTopColor: '#F1F5F9',
            }}
          >
            {footer}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

interface OnboardingButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}

export function OnboardingButton({ title, onPress, disabled, variant = 'primary' }: OnboardingButtonProps) {
  const isPrimary = variant === 'primary';
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      style={{
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        backgroundColor: isPrimary
          ? disabled ? '#94A3B8' : colors.ventureroot.green
          : 'transparent',
        borderWidth: isPrimary ? 0 : 1.5,
        borderColor: '#CBD5E1',
      }}
    >
      <Text
        style={{
          fontSize: 15,
          fontWeight: '700',
          color: isPrimary ? '#FFFFFF' : '#334155',
        }}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

interface OnboardingInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  helper?: string;
  keyboardType?: any;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  maxLength?: number;
  multiline?: boolean;
}

export function OnboardingInput({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  helper,
  keyboardType,
  secureTextEntry,
  autoCapitalize,
  maxLength,
  multiline,
}: OnboardingInputProps) {
  const { TextInput } = require('react-native');
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6, letterSpacing: 0.5 }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        maxLength={maxLength}
        multiline={multiline}
        style={{
          backgroundColor: '#FFFFFF',
          borderWidth: 1.5,
          borderColor: error ? '#EF4444' : '#E2E8F0',
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 14,
          fontSize: 15,
          color: '#0F172A',
          minHeight: multiline ? 100 : undefined,
          textAlignVertical: multiline ? 'top' : undefined,
        }}
      />
      {error && (
        <Text style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>{error}</Text>
      )}
      {helper && !error && (
        <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 4, lineHeight: 16 }}>{helper}</Text>
      )}
    </View>
  );
}
