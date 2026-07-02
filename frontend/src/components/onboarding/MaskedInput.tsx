import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';

interface MaskedInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  helper?: string;
  keyboardType?: any;
  maxLength?: number;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

export default function MaskedInput({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  helper,
  keyboardType = 'number-pad',
  maxLength,
  autoCapitalize = 'none',
}: MaskedInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={{ marginBottom: 16 }}>
      {label ? (
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6, letterSpacing: 0.5 }}>
          {label}
        </Text>
      ) : null}
      <View style={{ position: 'relative' }}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          keyboardType={keyboardType}
          secureTextEntry={!visible}
          maxLength={maxLength}
          autoCapitalize={autoCapitalize}
          style={{
            backgroundColor: '#FFFFFF',
            borderWidth: 1.5,
            borderColor: error ? '#EF4444' : '#E2E8F0',
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 14,
            paddingRight: 50,
            fontSize: 15,
            color: '#0F172A',
          }}
        />
        <TouchableOpacity
          onPress={() => setVisible(!visible)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{
            position: 'absolute',
            right: 14,
            top: 0,
            bottom: 0,
            justifyContent: 'center',
            width: 30,
            alignItems: 'center',
          }}
          accessibilityLabel={visible ? 'Hide field' : 'Show field'}
          accessibilityRole="button"
        >
          {visible ? <EyeOff size={18} color="#94A3B8" /> : <Eye size={18} color="#94A3B8" />}
        </TouchableOpacity>
      </View>
      {error && (
        <Text style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>{error}</Text>
      )}
      {helper && !error && (
        <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 4, lineHeight: 16 }}>{helper}</Text>
      )}
    </View>
  );
}
