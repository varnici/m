import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Upload, FileText, CheckCircle2 } from 'lucide-react-native';
import OnboardingShell, { OnboardingButton, OnboardingInput } from '@/components/onboarding/OnboardingShell';
import { useOnboardingNav } from '@/hooks/useOnboardingNav';
import { colors } from '@/theme/colors';

export default function DistributorDirectorScreen() {
  const { goNext, goBack, step, total } = useOnboardingNav();
  const { width } = useWindowDimensions();
  const hp = Math.max(20, width * 0.06);

  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [bvn, setBvn] = useState('');
  const [nin, setNin] = useState('');
  const [bvnError, setBvnError] = useState('');
  const [ninError, setNinError] = useState('');
  const [isSoleProprietor, setIsSoleProprietor] = useState(false);
  const [boardResolution, setBoardResolution] = useState<{ name: string; size: string } | null>(null);
  const [uploading, setUploading] = useState(false);

  const validateBVN = (value: string) => {
    const digits = value.replace(/\D/g, '');
    setBvn(digits);
    if (digits.length > 0 && digits.length !== 11) {
      setBvnError('BVN must be exactly 11 digits');
    } else {
      setBvnError('');
    }
  };

  const validateNIN = (value: string) => {
    const digits = value.replace(/\D/g, '');
    setNin(digits);
    if (digits.length > 0 && digits.length !== 11) {
      setNinError('NIN must be exactly 11 digits');
    } else {
      setNinError('');
    }
  };

  const handleDOBChange = (value: string) => {
    // Auto-format DD/MM/YYYY
    let formatted = value.replace(/\D/g, '');
    if (formatted.length > 2) formatted = formatted.slice(0, 2) + '/' + formatted.slice(2);
    if (formatted.length > 5) formatted = formatted.slice(0, 5) + '/' + formatted.slice(5);
    if (formatted.length > 10) formatted = formatted.slice(0, 10);
    setDob(formatted);
  };

  const handleUploadResolution = () => {
    setUploading(true);
    // Simulate file picker and upload
    setTimeout(() => {
      setUploading(false);
      setBoardResolution({
        name: 'board_resolution_2024.pdf',
        size: '2.4 MB',
      });
    }, 1500);
  };

  const isBVNValid = bvn.length === 11;
  const isNINValid = nin.length === 11;
  const isDOBValid = /^\d{2}\/\d{2}\/\d{4}$/.test(dob);
  const needsResolution = !isSoleProprietor;
  const hasResolution = boardResolution !== null;
  const isFormValid =
    fullName.trim().length > 0 &&
    isDOBValid &&
    isBVNValid &&
    isNINValid &&
    (isSoleProprietor || hasResolution);

  return (
    <OnboardingShell
      currentStep={step}
      totalSteps={total}
      title="Director Information"
      subtitle="Provide details for the primary company director. This is required for regulatory compliance."
      onBack={goBack}
      footer={
        <OnboardingButton
          title="Continue"
          onPress={() => goNext({ directorName: fullName, directorDob: dob, directorBvn: bvn, directorNin: nin, isSoleProprietor })}
          disabled={!isFormValid}
        />
      }
    >
      <OnboardingInput
        label="PRIMARY DIRECTOR FULL NAME"
        value={fullName}
        onChangeText={setFullName}
        placeholder="e.g. Abubakar Muhammad Ibrahim"
        autoCapitalize="words"
      />

      <OnboardingInput
        label="DATE OF BIRTH"
        value={dob}
        onChangeText={handleDOBChange}
        placeholder="DD/MM/YYYY"
        keyboardType="number-pad"
        maxLength={10}
      />

      <OnboardingInput
        label="BANK VERIFICATION NUMBER (BVN)"
        value={bvn}
        onChangeText={validateBVN}
        placeholder="11-digit BVN"
        error={bvnError}
        helper="Your BVN is used for identity verification only"
        keyboardType="number-pad"
        maxLength={11}
      />

      <OnboardingInput
        label="NATIONAL IDENTIFICATION NUMBER (NIN)"
        value={nin}
        onChangeText={validateNIN}
        placeholder="11-digit NIN"
        error={ninError}
        helper="NIN from your National ID card or NIN slip"
        keyboardType="number-pad"
        maxLength={11}
      />

      {/* Sole Proprietorship Toggle */}
      <View style={styles.toggleSection}>
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => {
            setIsSoleProprietor(!isSoleProprietor);
            if (!isSoleProprietor) setBoardResolution(null);
          }}
          activeOpacity={0.7}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: isSoleProprietor }}
        >
          <View style={[styles.checkbox, isSoleProprietor && styles.checkboxActive]}>
            {isSoleProprietor && <CheckCircle2 size={16} color="#FFFFFF" />}
          </View>
          <View className="flex-1 ml-3">
            <Text style={styles.checkboxTitle}>This is a sole proprietorship</Text>
            <Text style={styles.checkboxSubtitle}>
              Check this if you are the only director. Board resolution will not be required.
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Board Resolution Upload */}
      {needsResolution && (
        <View style={styles.uploadSection}>
          <Text style={styles.uploadTitle}>BOARD RESOLUTION (PDF)</Text>
          <Text style={styles.uploadSubtitle}>
            Upload a board resolution authorizing this application. Required for multi-director companies.
          </Text>

          {!hasResolution ? (
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={handleUploadResolution}
              disabled={uploading}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              {uploading ? (
                <ActivityIndicator size="small" color={colors.ventureroot.green} />
              ) : (
                <Upload size={24} color={colors.ventureroot.green} />
              )}
              <Text style={styles.uploadButtonText}>
                {uploading ? 'Uploading...' : 'Select PDF File'}
              </Text>
              <Text style={styles.uploadHint}>Maximum file size: 10MB</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.uploadedFile}>
              <View className="flex-row items-center flex-1">
                <FileText size={20} color={colors.ventureroot.green} />
                <View className="ml-3 flex-1">
                  <Text style={styles.uploadedFileName}>{boardResolution.name}</Text>
                  <Text style={styles.uploadedFileSize}>{boardResolution.size}</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setBoardResolution(null)}
                style={styles.removeButton}
                accessibilityLabel="Remove file"
                accessibilityRole="button"
              >
                <Text style={styles.removeButtonText}>Remove</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  toggleSection: {
    marginBottom: 20,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    minHeight: 44,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxActive: {
    backgroundColor: '#004D2C',
    borderColor: '#004D2C',
  },
  checkboxTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  checkboxSubtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },
  uploadSection: {
    marginBottom: 20,
  },
  uploadTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  uploadSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 17,
    marginBottom: 12,
  },
  uploadButton: {
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
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#004D2C',
    marginTop: 8,
  },
  uploadHint: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  uploadedFile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 16,
  },
  uploadedFileName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  uploadedFileSize: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  removeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
    minHeight: 44,
    justifyContent: 'center',
  },
  removeButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
});
