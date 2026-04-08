import React from 'react';
import { View, Text, TouchableOpacity, TextInput, Platform } from 'react-native';
import { styled } from 'nativewind';
import { LinearGradient } from 'expo-linear-gradient';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledTextInput = styled(TextInput);

/**
 * signature design element for VentureRoot
 */
export const BowlHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <StyledView className="bg-ventureroot-industrial-background pt-16 pb-10 px-6 rounded-b-[40px] shadow-2xl">
    <StyledText className="text-ventureroot-white text-3xl font-bold tracking-tight">
      {title}
    </StyledText>
    {subtitle && (
      <StyledText className="text-ventureroot-industrial-onSurface text-base mt-2 opacity-80">
        {subtitle}
      </StyledText>
    )}
  </StyledView>
);

/**
 * CLEAN MOTIF: Minimalist, high legibility
 */
export const CleanCard = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <StyledView className={`bg-ventureroot-clean-surface p-6 rounded-2xl ${className}`}>
    {children}
  </StyledView>
);

export const CleanInput = ({ label, placeholder, value, onChangeText, secureTextEntry, keyboardType }: any) => (
  <StyledView className="mb-6">
    <StyledText className="text-ventureroot-clean-text font-semibold mb-2 ml-1">
      {label}
    </StyledText>
    <StyledView className="bg-ventureroot-clean-background rounded-xl px-4 py-4 shadow-sm border border-slate-100">
      <StyledTextInput
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        className="text-ventureroot-clean-text text-base"
      />
    </StyledView>
  </StyledView>
);

/**
 * INDUSTRIAL TRUST: Authoritative, tonal layering
 */
export const IndustrialCard = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <StyledView className={`bg-ventureroot-industrial-surfaceHigh p-6 rounded-2xl ${className}`}>
    {children}
  </StyledView>
);

export const IndustrialButton = ({ title, onPress, disabled = false, variant = 'primary' }: any) => (
  <StyledTouchableOpacity
    onPress={onPress}
    disabled={disabled}
    className={`rounded-xl py-4 items-center justify-center ${
      disabled ? 'bg-gray-700 opacity-50' : 
      variant === 'primary' ? 'bg-ventureroot-industrial-primary' : 'bg-ventureroot-industrial-surfaceHighest'
    }`}
  >
    <StyledText className={`font-bold text-lg ${variant === 'primary' ? 'text-ventureroot-industrial-background' : 'text-ventureroot-white'}`}>
      {title}
    </StyledText>
  </StyledTouchableOpacity>
);

/**
 * RICH VIBE: Glassmorphism and gradients
 */
export const RichButton = ({ title, onPress }: any) => (
  <StyledTouchableOpacity onPress={onPress}>
    <LinearGradient
      colors={['#004D2C', '#006D3C']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      className="rounded-xl py-4 items-center justify-center shadow-lg"
    >
      <StyledText className="text-white font-bold text-lg">
        {title}
      </StyledText>
    </LinearGradient>
  </StyledTouchableOpacity>
);

export const GlassContainer = ({ children }: { children: React.ReactNode }) => (
  <StyledView className="bg-white/10 p-6 rounded-3xl border border-white/20">
    {children}
  </StyledView>
);
