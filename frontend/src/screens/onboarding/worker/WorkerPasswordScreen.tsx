import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import OnboardingShell, { OnboardingButton } from '@/components/onboarding/OnboardingShell';
import { useOnboardingNav } from '@/hooks/useOnboardingNav';
import { validatePassword } from '@/utils/validation';
import { Eye, EyeOff, Check, X, Shield } from 'lucide-react-native';
import { colors } from '@/theme/colors';

export default function WorkerPasswordScreen() {
  const { goNext, goBack, step, total } = useOnboardingNav();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [touched, setTouched] = useState(false);

  const { valid: allRulesPass, rules: ruleResults } = useMemo(
    () => validatePassword(password),
    [password]
  );

  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const showMismatch = touched && confirmPassword.length > 0 && !passwordsMatch;
  const canContinue = allRulesPass && passwordsMatch;

  const handleContinue = useCallback(() => {
    goNext({ password });
  }, [goNext, password]);

  return (
    <OnboardingShell
      currentStep={step}
      totalSteps={total}
      title="Create a password"
      subtitle="Choose a strong password to protect your account."
      onBack={goBack}
      footer={
        <OnboardingButton
          title="Continue"
          onPress={handleContinue}
          disabled={!canContinue}
        />
      }
    >
      <View style={{ marginTop: 8 }}>
        <View style={{ marginBottom: 16 }}>
          <Text style={styles.label}>PASSWORD</Text>
          <View style={[styles.inputRow, password.length > 0 && !allRulesPass && styles.inputRowError]}>
            <TextInput
              style={styles.textInput}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor="#94A3B8"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              accessibilityRole="button"
            >
              {showPassword ? (
                <EyeOff size={20} color="#64748B" />
              ) : (
                <Eye size={20} color="#64748B" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.rulesContainer}>
          {ruleResults.map((rule, index) => (
            <View key={index} style={styles.ruleRow}>
              {password.length === 0 ? (
                <View style={styles.ruleDot} />
              ) : rule.passed ? (
                <Check size={14} color={colors.status.success} />
              ) : (
                <X size={14} color="#CBD5E1" />
              )}
              <Text
                style={[
                  styles.ruleText,
                  password.length > 0 && rule.passed && styles.ruleTextPassed,
                ]}
              >
                {rule.label}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ marginBottom: 16, marginTop: 8 }}>
          <Text style={styles.label}>CONFIRM PASSWORD</Text>
          <View style={[styles.inputRow, showMismatch && styles.inputRowError]}>
            <TextInput
              style={styles.textInput}
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (!touched) setTouched(true);
              }}
              placeholder="Re-enter your password"
              placeholderTextColor="#94A3B8"
              secureTextEntry={!showConfirm}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowConfirm(!showConfirm)}
              style={styles.eyeButton}
              accessibilityLabel={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
              accessibilityRole="button"
            >
              {showConfirm ? (
                <EyeOff size={20} color="#64748B" />
              ) : (
                <Eye size={20} color="#64748B" />
              )}
            </TouchableOpacity>
          </View>
          {showMismatch && (
            <Text style={styles.errorText}>Passwords do not match</Text>
          )}
          {passwordsMatch && (
            <View style={styles.matchRow}>
              <Check size={14} color={colors.status.success} />
              <Text style={styles.matchText}>Passwords match</Text>
            </View>
          )}
        </View>
      </View>

      <View style={{ marginTop: 'auto', paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <Shield size={14} color="#94A3B8" style={{ marginTop: 2, marginRight: 8 }} />
          <Text style={{ fontSize: 12, color: '#94A3B8', lineHeight: 18, flex: 1 }}>
            Your password is encrypted and stored securely. We will never ask
            you for your password via email or phone.
          </Text>
        </View>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
  },
  inputRowError: {
    borderColor: '#EF4444',
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#0F172A',
  },
  eyeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rulesContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ruleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 4,
  },
  ruleText: {
    fontSize: 13,
    color: '#64748B',
    marginLeft: 10,
  },
  ruleTextPassed: {
    color: '#10B981',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  matchText: {
    fontSize: 12,
    color: '#10B981',
    marginLeft: 6,
  },
});
