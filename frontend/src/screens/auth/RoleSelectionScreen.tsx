import React, { useState } from 'react';
import { View, TouchableOpacity, SafeAreaView, StatusBar, ScrollView, StyleSheet } from 'react-native';
import type { RootStackScreenProps } from '@/navigation/types';
import { ChevronLeft, ChevronDown, Check } from 'lucide-react-native';
import { colors, spacing } from '@/theme/colors';
import { CleanCard, CleanButton, CleanText } from '@/components/ui/CleanComponents';

const ACCOUNT_TYPES = [
  'Retail Business Owner',
  'Personal',
  'Distributor',
  'Manufacturer',
  'Logistic/Transportation Company',
  'Artisian',
];

const RoleSelectionScreen = ({
  navigation,
}: RootStackScreenProps<'RoleSelection'>) => {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleContinue = () => {
    if (selectedType === 'Retail Business Owner') {
      navigation.navigate('OnboardingPhone');
    } else {
      // Handle other types or show a "Coming Soon" toast
      navigation.navigate('OnboardingPhone'); // Defaulting for demo purposes
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <ChevronLeft color={colors.text.primary} size={24} />
          </TouchableOpacity>
        </View>

        <View style={styles.titleSection}>
          <CleanText variant="h1">Welcome to VentureRoot</CleanText>
          <CleanText variant="body" style={styles.subtitle}>
            Select your account type to get started with the right experience.
          </CleanText>
        </View>

        <View style={styles.formSection}>
          <CleanText variant="caption" style={styles.label}>ACCOUNT TYPE</CleanText>
          <TouchableOpacity 
            onPress={() => setIsDropdownOpen(!isDropdownOpen)}
            activeOpacity={0.7}
          >
            <CleanCard style={styles.dropdownTrigger}>
              <CleanText style={{ color: selectedType ? colors.text.primary : colors.text.muted }}>
                {selectedType || 'Select Account Type'}
              </CleanText>
              <ChevronDown size={20} color={colors.text.secondary} />
            </CleanCard>
          </TouchableOpacity>

          {isDropdownOpen && (
            <CleanCard style={styles.dropdownMenu}>
              {ACCOUNT_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => {
                    setSelectedType(type);
                    setIsDropdownOpen(false);
                  }}
                  style={styles.dropdownItem}
                >
                  <CleanText style={{ flex: 1 }}>{type}</CleanText>
                  {selectedType === type && <Check size={18} color={colors.ventureroot.green} />}
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
          style={{ width: '100%' }}
        />
        
        <View style={styles.progressContainer}>
          {[1, 2, 3, 4, 5].map((i) => (
            <View 
              key={i} 
              style={[
                styles.progressDot, 
                i === 1 ? styles.progressDotActive : styles.progressDotInactive
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
    zIndex: 1000,
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
