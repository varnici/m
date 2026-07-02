import React, { useState } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackScreenProps } from '@/navigation/types';
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Check,
  Briefcase,
  Store,
  Package,
  Truck,
  CircleDot,
} from 'lucide-react-native';
import { colors, spacing } from '@/theme/colors';
import { CleanButton, CleanText } from '@/components/ui/CleanComponents';
import type { AccountTypeId } from '@/config/accountTypes';
import { useUserProfileStore } from '@/store/userProfileStore';
import { useOnboardingStore } from '@/store/onboardingStore';
import type { LucideIcon } from 'lucide-react-native';

interface UserTypeOption {
  id: AccountTypeId;
  icon: LucideIcon;
  label: string;
  description: string;
  steps: string[];
}

const USER_TYPE_OPTIONS: UserTypeOption[] = [
  {
    id: 'retail',
    icon: Store,
    label: 'Business Owner',
    description: 'Small business, shop, or market trader',
    steps: [
      'Email & phone verification',
      'Personal information',
      'Business name & category',
      'Market association verification',
      'Store location (GPS) & photos',
      'Owner face ID capture',
      'POS system linkage',
      'BVN & NIN identity verification',
      'Settlement bank account',
      'Terms of listing agreement',
    ],
  },
  {
    id: 'nine_to_five',
    icon: Briefcase,
    label: '9-5 Worker',
    description: 'Salaried employee looking to invest',
    steps: [
      'Email & phone verification',
      'Personal profile & address',
      'Employment & income details',
      'BVN & NIN identity verification',
      'Risk profile assessment (5 questions)',
      'Transaction PIN & biometric setup',
    ],
  },
  {
    id: 'distributor',
    icon: Package,
    label: 'Distributor',
    description: 'Wholesale supplier to businesses',
    steps: [
      'Company email & phone verification',
      'Company name & CAC registration',
      'Tax Identification Number (TIN)',
      'Warehouse address & GPS',
      'Product categories & supply volume',
      'Director BVN & NIN verification',
      'Board resolution upload (if applicable)',
      'Corporate settlement bank account',
      'Distributor terms agreement',
    ],
  },
  {
    id: 'logistics',
    icon: Truck,
    label: 'Logistics and Transport',
    description: 'Delivery and fleet operations',
    steps: [
      'Company email & phone verification',
      'Company name & CAC (if registered)',
      'Fleet size & vehicle registration',
      'Vehicle type breakdown',
      'Driver licence verification',
      'Goods-in-Transit (GIT) insurance',
      'Insurance document upload',
      'Settlement bank account',
      'Logistics partner terms agreement',
    ],
  },
];

const RoleSelectionScreen = ({
  navigation,
}: RootStackScreenProps<'RoleSelection'>) => {
  const setAccountType = useUserProfileStore((s) => s.setAccountType);
  const startOnboarding = useOnboardingStore((s) => s.startOnboarding);
  const onboardingCurrentRoute = useOnboardingStore((s) => s.currentRoute);
  const [selectedType, setSelectedType] = useState<AccountTypeId | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { width } = useWindowDimensions();
  const horizontalPadding = Math.max(16, width * 0.05);

  const selectedOption = USER_TYPE_OPTIONS.find((o) => o.id === selectedType);

  const handleContinue = () => {
    if (!selectedType) return;

    startOnboarding(selectedType);
    useOnboardingStore.getState().updateData({ accountType: selectedType });

    const firstRoute = useOnboardingStore.getState().currentRoute();
    if (!firstRoute) return;

    navigation.navigate(firstRoute as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: horizontalPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <ChevronLeft color={colors.text.primary} size={24} />
          </TouchableOpacity>
        </View>

        <View style={styles.titleSection}>
          <CleanText variant="h1">Create your account</CleanText>
          <CleanText variant="body" style={styles.subtitle}>
            Select the account type that best describes you.
          </CleanText>
        </View>

        {/* ── Dropdown ── */}
        <View style={{ marginBottom: 16 }}>
          <CleanText variant="caption" style={styles.label}>
            ACCOUNT TYPE
          </CleanText>

          <TouchableOpacity
            onPress={() => setIsDropdownOpen(!isDropdownOpen)}
            activeOpacity={0.7}
            style={styles.dropdownTrigger}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}>
              {selectedOption && (
                <selectedOption.icon size={18} color={colors.ventureroot.green} />
              )}
              <CleanText
                style={{
                  color: selectedType ? colors.text.primary : colors.text.muted,
                  fontSize: 15,
                  fontWeight: selectedType ? '600' : '400',
                }}
              >
                {selectedOption ? selectedOption.label : 'Select account type'}
              </CleanText>
            </View>
            {isDropdownOpen ? (
              <ChevronUp size={20} color={colors.text.secondary} />
            ) : (
              <ChevronDown size={20} color={colors.text.secondary} />
            )}
          </TouchableOpacity>

          {isDropdownOpen && (
            <View style={styles.dropdownMenu}>
              {USER_TYPE_OPTIONS.map((option) => {
                const isSelected = selectedType === option.id;
                const Icon = option.icon;
                return (
                  <TouchableOpacity
                    key={option.id}
                    onPress={() => {
                      setSelectedType(option.id);
                      setIsDropdownOpen(false);
                    }}
                    style={[
                      styles.dropdownItem,
                      isSelected && { backgroundColor: '#F0FDF4' },
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isSelected }}
                  >
                    <Icon size={18} color={isSelected ? colors.ventureroot.green : '#64748B'} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <CleanText style={{ fontWeight: '600', fontSize: 14, color: '#0F172A' }}>
                        {option.label}
                      </CleanText>
                      <CleanText style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
                        {option.description}
                      </CleanText>
                    </View>
                    {isSelected && <Check size={16} color={colors.ventureroot.green} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* ── Onboarding Requirements Panel ── */}
        {selectedOption && !isDropdownOpen && (
          <View style={styles.requirementsPanel}>
            <View style={styles.requirementsHeader}>
              <selectedOption.icon size={20} color={colors.ventureroot.green} />
              <CleanText style={{ fontWeight: '700', fontSize: 15, marginLeft: 10, color: '#0F172A' }}>
                {selectedOption.label} — What you'll need
              </CleanText>
            </View>

            <View style={{ gap: 8, marginTop: 14 }}>
              {selectedOption.steps.map((step, idx) => (
                <View key={idx} style={styles.stepRow}>
                  <View style={styles.stepNumber}>
                    <CleanText style={{ fontSize: 10, fontWeight: '700', color: colors.ventureroot.green }}>
                      {idx + 1}
                    </CleanText>
                  </View>
                  <CleanText style={{ flex: 1, fontSize: 13, color: '#334155', lineHeight: 18 }}>
                    {step}
                  </CleanText>
                </View>
              ))}
            </View>

            <View style={styles.timeEstimate}>
              <CircleDot size={14} color="#64748B" />
              <CleanText style={{ fontSize: 11, color: '#64748B', marginLeft: 6 }}>
                Estimated time: {selectedOption.steps.length <= 6 ? '5-8' : '8-15'} minutes
              </CleanText>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingHorizontal: horizontalPadding }]}>
        <CleanButton
          title="Continue"
          onPress={handleContinue}
          variant="primary"
          disabled={!selectedType}
          style={{ width: '100%' }}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.page,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  header: {
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleSection: {
    marginBottom: spacing.lg,
  },
  subtitle: {
    marginTop: spacing.xs,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  label: {
    fontWeight: '700',
    marginBottom: 6,
    marginLeft: 2,
    letterSpacing: 1,
    fontSize: 11,
    color: '#475569',
  },
  dropdownTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
  },
  dropdownMenu: {
    marginTop: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  requirementsPanel: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 20,
  },
  requirementsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  timeEstimate: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.background.page,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
});

export default RoleSelectionScreen;
