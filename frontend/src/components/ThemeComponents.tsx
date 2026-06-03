import React from 'react';
import { View, Text, TouchableOpacity, TextInput, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * signature design element for VentureRoot
 */
export const BowlHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <View className="bg-ventureroot-industrial-background pt-16 pb-10 px-6 rounded-b-[40px] shadow-2xl">
    <Text className="text-ventureroot-white text-3xl font-bold tracking-tight">
      {title}
    </Text>
    {subtitle && (
      <Text className="text-ventureroot-industrial-onSurface text-base mt-2 opacity-80">
        {subtitle}
      </Text>
    )}
  </View>
);

/**
 * CLEAN MOTIF: Minimalist, high legibility
 */
export const CleanCard = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <View className={`bg-ventureroot-clean-surface p-6 rounded-2xl ${className}`}>
    {children}
  </View>
);

export const CleanInput = ({ label, placeholder, value, onChangeText, secureTextEntry, keyboardType }: any) => (
  <View className="mb-6">
    <Text className="text-ventureroot-clean-text font-semibold mb-2 ml-1">
      {label}
    </Text>
    <View className="bg-ventureroot-clean-background rounded-xl px-4 py-4 shadow-sm border border-slate-100">
      <TextInput
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        className="text-ventureroot-clean-text text-base"
      />
    </View>
  </View>
);

/**
 * INDUSTRIAL TRUST: Authoritative, tonal layering
 */
export const IndustrialCard = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <View className={`bg-ventureroot-industrial-surfaceHigh p-6 rounded-2xl ${className}`}>
    {children}
  </View>
);

export const IndustrialButton = ({ title, onPress, disabled = false, variant = 'primary' }: any) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    className={`rounded-xl py-4 items-center justify-center ${
      disabled 
        ? 'bg-ventureroot-industrial-surfaceHigh opacity-50' 
        : variant === 'primary' 
          ? 'bg-ventureroot-industrial-primary' 
          : 'bg-ventureroot-industrial-surfaceHighest'
    }`}
  >
    <Text className={`font-bold text-lg ${
      disabled 
        ? 'text-ventureroot-industrial-onSurface/30' 
        : variant === 'primary' 
          ? 'text-ventureroot-industrial-background' 
          : 'text-ventureroot-white'
    }`}>
      {title}
    </Text>
  </TouchableOpacity>
);

/**
 * RICH VIBE: Glassmorphism and gradients
 */
export const RichButton = ({ title, onPress, disabled = false }: any) => (
  <TouchableOpacity onPress={onPress} disabled={disabled}>
    <LinearGradient
      colors={disabled ? ['#1E293B', '#334155'] : ['#004D2C', '#006D3C']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      className={`rounded-xl py-4 items-center justify-center shadow-lg ${disabled ? 'opacity-40' : ''}`}
    >
      <Text className={`font-bold text-lg ${disabled ? 'text-slate-400' : 'text-white'}`}>
        {title}
      </Text>
    </LinearGradient>
  </TouchableOpacity>
);

export const GlassContainer = ({ children }: { children: React.ReactNode }) => (
  <View className="bg-white/10 p-6 rounded-3xl border border-white/20">
    {children}
  </View>
);
