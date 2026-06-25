import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Plus, Trash2, UserCheck, AlertCircle } from 'lucide-react-native';
import OnboardingShell, { OnboardingButton } from '@/components/onboarding/OnboardingShell';
import { useOnboardingNav } from '@/hooks/useOnboardingNav';
import { colors } from '@/theme/colors';

// Nigerian driver licence: 2-letter state code + 7 digits (e.g. LA1234567)
const LICENCE_REGEX = /^[A-Z]{2}\d{7}$/i;

const NIGERIAN_STATE_CODES = [
  'AB', 'AD', 'AK', 'AN', 'BA', 'BY', 'BE', 'BO', 'CR', 'DE',
  'EB', 'ED', 'EK', 'EN', 'FC', 'GO', 'IM', 'JI', 'KD', 'KN',
  'KT', 'KB', 'KO', 'KW', 'LA', 'NA', 'NI', 'OG', 'ON', 'OS',
  'OY', 'PL', 'RI', 'SO', 'TA', 'YO', 'ZA',
];

const MAX_DRIVERS = 5;

export default function LogisticsDriverScreen() {
  const { goNext, goBack, step, total } = useOnboardingNav();
  const { width } = useWindowDimensions();
  const hp = Math.max(20, width * 0.06);

  const [licences, setLicences] = useState<string[]>(['']);
  const [licenceErrors, setLicenceErrors] = useState<Record<number, string>>({});
  const [isMultiDriver, setIsMultiDriver] = useState(false);

  const validateLicence = (index: number, value: string) => {
    const upper = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const updated = [...licences];
    updated[index] = upper;
    setLicences(updated);

    const errors = { ...licenceErrors };
    if (upper.length > 0) {
      if (upper.length < 9) {
        // Still typing
        if (upper.length >= 2) {
          const stateCode = upper.slice(0, 2);
          if (!NIGERIAN_STATE_CODES.includes(stateCode)) {
            errors[index] = `"${stateCode}" is not a valid Nigerian state code`;
          } else {
            delete errors[index];
          }
        }
      } else if (!LICENCE_REGEX.test(upper)) {
        errors[index] = 'Format: 2-letter state code + 7 digits (e.g. LA1234567)';
      } else {
        const stateCode = upper.slice(0, 2);
        if (!NIGERIAN_STATE_CODES.includes(stateCode)) {
          errors[index] = `"${stateCode}" is not a valid Nigerian state code`;
        } else {
          delete errors[index];
        }
      }
    } else {
      delete errors[index];
    }
    setLicenceErrors(errors);
  };

  const addLicenceField = () => {
    if (licences.length < MAX_DRIVERS) {
      setLicences([...licences, '']);
    }
  };

  const removeLicenceField = (index: number) => {
    if (licences.length > 1) {
      const updated = licences.filter((_, i) => i !== index);
      setLicences(updated);
      // Reindex errors
      const newErrors: Record<number, string> = {};
      Object.entries(licenceErrors).forEach(([k, v]) => {
        const ki = parseInt(k, 10);
        if (ki < index) newErrors[ki] = v;
        else if (ki > index) newErrors[ki - 1] = v;
      });
      setLicenceErrors(newErrors);
    }
  };

  // At least the primary driver licence must be valid
  const primaryValid = licences[0].length === 9 && LICENCE_REGEX.test(licences[0]) && !licenceErrors[0];
  const allValid = licences.every((l, i) => {
    if (i === 0) return primaryValid;
    // Additional drivers can be empty (optional) or valid
    return l.length === 0 || (LICENCE_REGEX.test(l) && !licenceErrors[i]);
  });
  const isFormValid = primaryValid && allValid;

  return (
    <OnboardingShell
      currentStep={step}
      totalSteps={total}
      title="Driver Licences"
      subtitle="Provide driver licence details. At minimum, the primary driver's licence is required."
      onBack={goBack}
      footer={
        <OnboardingButton
          title="Continue"
          onPress={() => goNext({ driverLicences: licences })}
          disabled={!isFormValid}
        />
      }
    >
      {/* Primary Driver */}
      <View style={styles.driverCard}>
        <View className="flex-row items-center mb-3">
          <UserCheck size={18} color={colors.ventureroot.green} />
          <Text style={styles.driverTitle}>Primary Driver</Text>
          <View style={styles.requiredBadge}>
            <Text style={styles.requiredText}>Required</Text>
          </View>
        </View>

        <Text style={styles.fieldLabel}>DRIVER LICENCE NUMBER</Text>
        <TextInput
          style={[
            styles.licenceInput,
            licenceErrors[0] ? styles.licenceInputError : null,
            licences[0].length === 9 && !licenceErrors[0] ? styles.licenceInputValid : null,
          ]}
          value={licences[0]}
          onChangeText={(v) => validateLicence(0, v)}
          placeholder="e.g. LA1234567"
          placeholderTextColor="#94A3B8"
          autoCapitalize="characters"
          maxLength={9}
        />
        {licenceErrors[0] && (
          <Text style={styles.errorText}>{licenceErrors[0]}</Text>
        )}
        <Text style={styles.helperText}>
          2-letter state code followed by 7 digits
        </Text>

        {licences[0].length === 9 && !licenceErrors[0] && (
          <View style={styles.validBadge}>
            <UserCheck size={14} color="#10B981" />
            <Text style={styles.validText}>
              Licence format valid (State: {licences[0].slice(0, 2)})
            </Text>
          </View>
        )}
      </View>

      {/* Multi-driver toggle */}
      <TouchableOpacity
        style={styles.multiDriverToggle}
        onPress={() => {
          setIsMultiDriver(!isMultiDriver);
          if (isMultiDriver) {
            // Collapse to just primary
            setLicences([licences[0]]);
            setLicenceErrors({ 0: licenceErrors[0] });
          }
        }}
        activeOpacity={0.7}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isMultiDriver }}
      >
        <View style={[styles.toggleCheckbox, isMultiDriver && styles.toggleCheckboxActive]}>
          {isMultiDriver && <View style={styles.toggleCheckboxInner} />}
        </View>
        <View className="flex-1 ml-3">
          <Text style={styles.toggleTitle}>I have additional drivers</Text>
          <Text style={styles.toggleSubtitle}>
            Add up to {MAX_DRIVERS - 1} more driver licences
          </Text>
        </View>
      </TouchableOpacity>

      {/* Additional Drivers */}
      {isMultiDriver && (
        <View style={styles.additionalSection}>
          <Text style={styles.sectionTitle}>ADDITIONAL DRIVERS</Text>

          {licences.slice(1).map((licence, rawIndex) => {
            const index = rawIndex + 1;
            return (
              <View key={index} style={styles.additionalDriver}>
                <View className="flex-row items-center justify-between mb-2">
                  <Text style={styles.additionalLabel}>Driver {index + 1}</Text>
                  <TouchableOpacity
                    onPress={() => removeLicenceField(index)}
                    style={styles.removeBtn}
                    accessibilityLabel={`Remove driver ${index + 1}`}
                    accessibilityRole="button"
                  >
                    <Trash2 size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={[
                    styles.licenceInput,
                    licenceErrors[index] ? styles.licenceInputError : null,
                    licence.length === 9 && !licenceErrors[index] ? styles.licenceInputValid : null,
                  ]}
                  value={licence}
                  onChangeText={(v) => validateLicence(index, v)}
                  placeholder="e.g. KN7654321"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="characters"
                  maxLength={9}
                />
                {licenceErrors[index] && (
                  <Text style={styles.errorText}>{licenceErrors[index]}</Text>
                )}
              </View>
            );
          })}

          {licences.length < MAX_DRIVERS && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={addLicenceField}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <Plus size={18} color={colors.ventureroot.green} />
              <Text style={styles.addButtonText}>Add Another Driver</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Info notice */}
      <View style={styles.infoCard}>
        <AlertCircle size={16} color="#3B82F6" />
        <Text style={styles.infoText}>
          All driver licences will be verified with the Federal Road Safety Corps (FRSC)
          database. Invalid or expired licences will be flagged during verification.
        </Text>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  driverCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  driverTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginLeft: 8,
    flex: 1,
  },
  requiredBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  requiredText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  licenceInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    color: '#0F172A',
    fontWeight: '700',
    letterSpacing: 2,
  },
  licenceInputError: {
    borderColor: '#EF4444',
  },
  licenceInputValid: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  errorText: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: 4,
  },
  helperText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
    lineHeight: 16,
  },
  validBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  validText: {
    fontSize: 12,
    color: '#065F46',
    fontWeight: '600',
    marginLeft: 6,
  },
  multiDriverToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    minHeight: 44,
  },
  toggleCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleCheckboxActive: {
    borderColor: '#004D2C',
  },
  toggleCheckboxInner: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: '#004D2C',
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  toggleSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  additionalSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 1,
    marginBottom: 12,
  },
  additionalDriver: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  additionalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  removeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 12,
    backgroundColor: '#F0FDF4',
    minHeight: 44,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#004D2C',
    marginLeft: 8,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#1E40AF',
    lineHeight: 18,
    marginLeft: 10,
  },
});
