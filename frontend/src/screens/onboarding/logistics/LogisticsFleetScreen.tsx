import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Plus, Trash2, Upload, FileText, Check, Truck } from 'lucide-react-native';
import OnboardingShell, { OnboardingButton, OnboardingInput } from '@/components/onboarding/OnboardingShell';
import { useOnboardingNav } from '@/hooks/useOnboardingNav';
import { colors } from '@/theme/colors';

const VEHICLE_TYPES = [
  'Motorcycles',
  'Tricycles/Keke',
  'Small vans',
  'Pickup trucks',
  '5-10 tonne trucks',
  '10+ tonne trucks',
];

// Nigerian plate format: ABC-123-DE or ABC 123 DE
const PLATE_REGEX = /^[A-Z]{3}[-\s]?\d{3}[-\s]?[A-Z]{2}$/i;

export default function LogisticsFleetScreen() {
  const { goNext, goBack, step, total } = useOnboardingNav();
  const { width } = useWindowDimensions();
  const hp = Math.max(20, width * 0.06);

  const [fleetSize, setFleetSize] = useState('');
  const [registrationNumbers, setRegistrationNumbers] = useState<string[]>(['']);
  const [plateErrors, setPlateErrors] = useState<Record<number, string>>({});
  const [uploadedFile, setUploadedFile] = useState<{ name: string; count: number } | null>(null);
  const [uploading, setUploading] = useState(false);

  // Vehicle type breakdown
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [typeQuantities, setTypeQuantities] = useState<Record<string, string>>({});

  const fleetSizeNum = parseInt(fleetSize, 10) || 0;
  const isSmallFleet = fleetSizeNum >= 1 && fleetSizeNum <= 10;
  const isLargeFleet = fleetSizeNum > 10;

  const handleFleetSizeChange = (value: string) => {
    const digits = value.replace(/\D/g, '');
    const num = parseInt(digits, 10);
    if (digits === '' || (num >= 0 && num <= 500)) {
      setFleetSize(digits);
      // Reset registration fields for small fleet
      if (num <= 10) {
        const count = Math.max(num, 1);
        setRegistrationNumbers(Array.from({ length: count }, (_, i) => registrationNumbers[i] || ''));
        setUploadedFile(null);
      }
    }
  };

  const validatePlate = (index: number, value: string) => {
    const upper = value.toUpperCase();
    const updated = [...registrationNumbers];
    updated[index] = upper;
    setRegistrationNumbers(updated);

    const errors = { ...plateErrors };
    if (upper.length > 0 && !PLATE_REGEX.test(upper)) {
      errors[index] = 'Format: ABC-123-DE or ABC 123 DE';
    } else {
      delete errors[index];
    }
    setPlateErrors(errors);
  };

  const addPlateField = () => {
    if (registrationNumbers.length < fleetSizeNum) {
      setRegistrationNumbers([...registrationNumbers, '']);
    }
  };

  const removePlateField = (index: number) => {
    if (registrationNumbers.length > 1) {
      const updated = registrationNumbers.filter((_, i) => i !== index);
      setRegistrationNumbers(updated);
      const errors = { ...plateErrors };
      delete errors[index];
      // Reindex errors
      const reindexed: Record<number, string> = {};
      Object.entries(errors).forEach(([k, v]) => {
        const ki = parseInt(k, 10);
        if (ki > index) reindexed[ki - 1] = v;
        else if (ki < index) reindexed[ki] = v;
      });
      setPlateErrors(reindexed);
    }
  };

  const handleUploadRegistrations = () => {
    setUploading(true);
    setTimeout(() => {
      setUploading(false);
      setUploadedFile({
        name: 'vehicle_registrations.csv',
        count: fleetSizeNum,
      });
    }, 1500);
  };

  const toggleVehicleType = useCallback((type: string) => {
    setSelectedTypes((prev) => {
      if (prev.includes(type)) {
        setTypeQuantities((q) => {
          const copy = { ...q };
          delete copy[type];
          return copy;
        });
        return prev.filter((t) => t !== type);
      }
      setTypeQuantities((q) => ({ ...q, [type]: '' }));
      return [...prev, type];
    });
  }, []);

  const updateTypeQuantity = (type: string, value: string) => {
    setTypeQuantities((prev) => ({ ...prev, [type]: value.replace(/\D/g, '') }));
  };

  // Validation
  const isFleetSizeValid = fleetSizeNum >= 1 && fleetSizeNum <= 500;
  const hasPlates = isSmallFleet
    ? registrationNumbers.filter((p) => p.trim().length > 0).length >= 1 &&
      Object.keys(plateErrors).length === 0
    : isLargeFleet
    ? uploadedFile !== null
    : false;
  const hasVehicleTypes =
    selectedTypes.length > 0 &&
    selectedTypes.every((t) => {
      const q = parseInt(typeQuantities[t] || '0', 10);
      return q > 0;
    });
  const isFormValid = isFleetSizeValid && hasPlates && hasVehicleTypes;

  return (
    <OnboardingShell
      currentStep={step}
      totalSteps={total}
      title="Fleet Details"
      subtitle="Provide details about your vehicles and fleet composition."
      onBack={goBack}
      footer={
        <OnboardingButton
          title="Continue"
          onPress={() => goNext({ fleetSize: fleetSizeNum, registrationNumbers, selectedTypes, typeQuantities })}
          disabled={!isFormValid}
        />
      }
    >
      {/* Fleet Size */}
      <OnboardingInput
        label="FLEET SIZE (NUMBER OF VEHICLES)"
        value={fleetSize}
        onChangeText={handleFleetSizeChange}
        placeholder="e.g. 5"
        helper="Enter a number between 1 and 500"
        keyboardType="number-pad"
        maxLength={3}
      />

      {/* Registration Numbers - Small Fleet */}
      {isSmallFleet && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>VEHICLE REGISTRATION NUMBERS</Text>
          <Text style={styles.sectionSubtitle}>
            Enter Nigerian plate numbers (format: ABC-123-DE)
          </Text>

          {registrationNumbers.map((plate, index) => (
            <View key={index} className="flex-row items-start" style={{ marginBottom: 10 }}>
              <View className="flex-1">
                <View className="flex-row items-center mb-1">
                  <Text style={styles.plateLabel}>Vehicle {index + 1}</Text>
                </View>
                <TextInput
                  style={[
                    styles.plateInput,
                    plateErrors[index] ? styles.plateInputError : null,
                  ]}
                  value={plate}
                  onChangeText={(v) => validatePlate(index, v)}
                  placeholder="ABC-123-DE"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="characters"
                  maxLength={11}
                />
                {plateErrors[index] && (
                  <Text style={styles.plateError}>{plateErrors[index]}</Text>
                )}
              </View>
              {registrationNumbers.length > 1 && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removePlateField(index)}
                  accessibilityLabel={`Remove vehicle ${index + 1}`}
                  accessibilityRole="button"
                >
                  <Trash2 size={18} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>
          ))}

          {registrationNumbers.length < fleetSizeNum && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={addPlateField}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <Plus size={18} color={colors.ventureroot.green} />
              <Text style={styles.addButtonText}>Add Vehicle Registration</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Registration Numbers - Large Fleet (File Upload) */}
      {isLargeFleet && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>VEHICLE REGISTRATION NUMBERS</Text>
          <Text style={styles.sectionSubtitle}>
            For fleets of 11+ vehicles, upload a CSV or Excel file with all registration numbers.
          </Text>

          {!uploadedFile ? (
            <TouchableOpacity
              style={styles.uploadArea}
              onPress={handleUploadRegistrations}
              disabled={uploading}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              {uploading ? (
                <ActivityIndicator size="small" color={colors.ventureroot.green} />
              ) : (
                <Upload size={28} color={colors.ventureroot.green} />
              )}
              <Text style={styles.uploadText}>
                {uploading ? 'Processing file...' : 'Upload Registration File'}
              </Text>
              <Text style={styles.uploadHint}>CSV or Excel with one plate number per row</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.uploadedCard}>
              <View className="flex-row items-center flex-1">
                <FileText size={20} color={colors.ventureroot.green} />
                <View className="ml-3 flex-1">
                  <Text style={styles.uploadedName}>{uploadedFile.name}</Text>
                  <Text style={styles.uploadedCount}>
                    {uploadedFile.count} registrations detected
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setUploadedFile(null)}
                style={styles.uploadedRemove}
                accessibilityLabel="Remove file"
                accessibilityRole="button"
              >
                <Text style={styles.uploadedRemoveText}>Remove</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Vehicle Type Breakdown */}
      {isFleetSizeValid && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>VEHICLE TYPE BREAKDOWN</Text>
          <Text style={styles.sectionSubtitle}>
            Select vehicle types in your fleet and specify the quantity of each.
          </Text>

          {VEHICLE_TYPES.map((type) => {
            const selected = selectedTypes.includes(type);
            return (
              <View key={type} style={{ marginBottom: 8 }}>
                <TouchableOpacity
                  style={[styles.typeRow, selected && styles.typeRowActive]}
                  onPress={() => toggleVehicleType(type)}
                  activeOpacity={0.7}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                >
                  <View style={[styles.typeCheckbox, selected && styles.typeCheckboxActive]}>
                    {selected && <Check size={14} color="#FFFFFF" />}
                  </View>
                  <Truck size={18} color={selected ? colors.ventureroot.green : '#94A3B8'} />
                  <Text style={[styles.typeName, selected && styles.typeNameActive]}>
                    {type}
                  </Text>
                </TouchableOpacity>

                {selected && (
                  <View style={styles.quantityRow}>
                    <Text style={styles.quantityLabel}>Quantity:</Text>
                    <TextInput
                      style={styles.quantityInput}
                      value={typeQuantities[type] || ''}
                      onChangeText={(v) => updateTypeQuantity(type, v)}
                      placeholder="0"
                      placeholderTextColor="#94A3B8"
                      keyboardType="number-pad"
                      maxLength={3}
                    />
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 1,
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
    marginBottom: 14,
  },
  plateLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.3,
  },
  plateInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '600',
    letterSpacing: 1,
  },
  plateInputError: {
    borderColor: '#EF4444',
  },
  plateError: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: 3,
  },
  removeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    marginTop: 18,
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
  uploadArea: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 28,
    backgroundColor: '#FAFBFC',
    minHeight: 44,
  },
  uploadText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#004D2C',
    marginTop: 10,
  },
  uploadHint: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  uploadedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 14,
  },
  uploadedName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  uploadedCount: {
    fontSize: 11,
    color: '#065F46',
    marginTop: 2,
  },
  uploadedRemove: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
    minHeight: 44,
    justifyContent: 'center',
  },
  uploadedRemoveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
  },
  typeRowActive: {
    borderColor: '#004D2C',
    backgroundColor: '#F0FDF4',
  },
  typeCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  typeCheckboxActive: {
    backgroundColor: '#004D2C',
    borderColor: '#004D2C',
  },
  typeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginLeft: 8,
    flex: 1,
  },
  typeNameActive: {
    color: '#004D2C',
    fontWeight: '700',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 46,
    paddingVertical: 8,
  },
  quantityLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginRight: 10,
  },
  quantityInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '700',
    width: 80,
    textAlign: 'center',
  },
});
