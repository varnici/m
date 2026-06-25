import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, useWindowDimensions } from 'react-native';
import OnboardingShell from '@/components/onboarding/OnboardingShell';
import { useOnboardingNav } from '@/hooks/useOnboardingNav';
import { Delete } from 'lucide-react-native';
import { colors } from '@/theme/colors';

const isSequential = (pin: string) => {
  const asc = '0123456789';
  const desc = '9876543210';
  return asc.includes(pin) || desc.includes(pin);
};

const isRepeated = (pin: string) => new Set(pin.split('')).size === 1;

const WorkerPINSetupScreen = () => {
  const { goNext, goBack, step, total } = useOnboardingNav();
  const { width } = useWindowDimensions();
  const [phase, setPhase] = useState<'create' | 'confirm'>('create');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');

  const currentPin = phase === 'create' ? pin : confirmPin;
  const setCurrentPin = phase === 'create' ? setPin : setConfirmPin;

  const handleKeyPress = (key: string) => {
    setError('');
    if (key === 'delete') {
      setCurrentPin((prev) => prev.slice(0, -1));
      return;
    }
    if (currentPin.length >= 6) return;

    const newPin = currentPin + key;
    setCurrentPin(newPin);

    if (newPin.length === 6) {
      if (phase === 'create') {
        if (isSequential(newPin)) {
          setError('PIN cannot be a sequential number (e.g. 123456)');
          setTimeout(() => setPin(''), 500);
          return;
        }
        if (isRepeated(newPin)) {
          setError('PIN cannot be a repeated digit (e.g. 111111)');
          setTimeout(() => setPin(''), 500);
          return;
        }
        setTimeout(() => setPhase('confirm'), 200);
      } else {
        if (newPin !== pin) {
          setError("PINs don't match. Try again.");
          setTimeout(() => setConfirmPin(''), 500);
        } else {
          goNext({ pinSet: true });
        }
      }
    }
  };

  const keypadWidth = Math.min(width * 0.8, 300);
  const buttonSize = keypadWidth / 3 - 12;

  return (
    <OnboardingShell
      currentStep={step}
      totalSteps={total}
      title={phase === 'create' ? 'Create your PIN' : 'Confirm your PIN'}
      subtitle={
        phase === 'create'
          ? 'This 6-digit PIN will authorise every investment and savings transaction.'
          : 'Re-enter your PIN to confirm.'
      }
      onBack={() => {
        if (phase === 'confirm') {
          setPhase('create');
          setConfirmPin('');
          setError('');
        } else {
          goBack();
        }
      }}
      scrollable={false}
    >
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View
              key={i}
              style={{
                width: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor: i < currentPin.length ? colors.ventureroot.green : '#E2E8F0',
              }}
            />
          ))}
        </View>

        {error ? (
          <Text style={{ fontSize: 13, color: '#EF4444', fontWeight: '500', marginBottom: 20, textAlign: 'center' }}>
            {error}
          </Text>
        ) : (
          <View style={{ height: 33 }} />
        )}

        <View style={{ width: keypadWidth, gap: 10 }}>
          {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['', '0', 'delete']].map(
            (row, rowIdx) => (
              <View key={rowIdx} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                {row.map((key, keyIdx) => {
                  if (key === '') return <View key={keyIdx} style={{ width: buttonSize, height: buttonSize }} />;
                  return (
                    <TouchableOpacity
                      key={keyIdx}
                      onPress={() => handleKeyPress(key)}
                      activeOpacity={0.6}
                      style={{
                        width: buttonSize,
                        height: buttonSize,
                        borderRadius: buttonSize / 2,
                        backgroundColor: '#F1F5F9',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {key === 'delete' ? (
                        <Delete size={22} color="#475569" />
                      ) : (
                        <Text style={{ fontSize: 24, fontWeight: '600', color: '#0F172A' }}>
                          {key}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )
          )}
        </View>
      </View>
    </OnboardingShell>
  );
};

export default WorkerPINSetupScreen;
