import React, { useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackScreenProps } from '@/navigation/types';
import { ChevronDown, ChevronLeft, Check } from 'lucide-react-native';
import { colors, spacing } from '@/theme/colors';
import { CleanCard, CleanButton, CleanText } from '@/components/ui/CleanComponents';
import { getEnabledTypes, type AccountTypeId } from '@/config/accountTypes';
import { useUserProfileStore } from '@/store/userProfileStore';

const RoleSelectionScreen = ({
  navigation,
}: RootStackScreenProps<'RoleSelection'>) => {
  const enabledTypes = getEnabledTypes();
  const setAccountType = useUserProfileStore((s) => s.setAccountType);
  const [selectedType, setSelectedType] = useState<AccountTypeId | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleContinue = () => {
    if (!selectedType) return;
    setAccountType(selectedType);
    navigation.navigate('Main' as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
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
          <CleanText variant="h1">Welcome to VentureRoot</CleanText>
          <CleanText variant="body" style={styles.subtitle}>
            Select the account type that best describes your business.
          </CleanText>
        </View>

        <View style={styles.formSection}>
          <CleanText variant="caption" style={styles.label}>ACCOUNT TYPE</CleanText>
          <TouchableOpacity
            onPress={() => setIsDropdownOpen((open) => !open)}
            activeOpacity={0.7}
            accessibilityLabel="Select account type"
            accessibilityRole="button"
          >
            <CleanCard style={styles.dropdownTrigger}>
              <CleanText style={{ color: selectedType ? colors.text.primary : colors.text.muted }}>
                {selectedType ? enabledTypes.find((t) => t.id === selectedType)?.label : 'Select Account Type'}
              </CleanText>
              <ChevronDown size={20} color={colors.text.secondary} />
            </CleanCard>
          </TouchableOpacity>

          {isDropdownOpen && (
            <CleanCard style={styles.dropdownMenu}>
              {enabledTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  onPress={() => {
                    setSelectedType(type.id);
                    setIsDropdownOpen(false);
                  }}
                  style={styles.dropdownItem}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selectedType === type.id }}
                >
                  <CleanText style={{ flex: 1 }}>{type.label}</CleanText>
                  {selectedType === type.id && <Check size={18} color={colors.ventureroot.green} />}
                </TouchableOpacity>
              ))}
            </CleanCard>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <CleanButton
          title="Continue"
          onPress={handleContinue}
          variant="primary"
          disabled={!selectedType}
          style={{ width: '100%' }}
        />

        <View style={styles.progressContainer}>
          {[1, 2, 3, 4, 5].map((i) => (
            <View
              key={i}
              style={[
                styles.progressDot,
                i === 1 ? styles.progressDotActive : styles.progressDotInactive,
              ]}
            />
          ))}
        </View>
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
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
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
    marginBottom: spacing.xl,
  },
  subtitle: {
    marginTop: spacing.xs,
    color: colors.text.secondary,
  },
  formSection: {
    marginBottom: spacing.xl,
  },
  label: {
    fontWeight: '700',
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
    letterSpacing: 1,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.ventureroot.white,
  },
  dropdownMenu: {
    marginTop: spacing.xs,
    padding: spacing.xs,
    backgroundColor: colors.ventureroot.white,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.background.page,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  progressDot: {
    height: 6,
    borderRadius: 3,
  },
  progressDotActive: {
    width: 24,
    backgroundColor: colors.ventureroot.green,
  },
  progressDotInactive: {
    width: 6,
    backgroundColor: colors.border.medium,
  },
});

export default RoleSelectionScreen;
