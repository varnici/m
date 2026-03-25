import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StatusBar, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Store, Briefcase, ChevronLeft } from 'lucide-react-native';

const ROLES = [
  {
    id: 'trader',
    title: 'Trader / Business Owner',
    description: 'I sell products and need inventory finance',
    icon: Store,
    bgColor: '#FFFBEB',
    iconColor: '#D97706',
  },
  {
    id: 'salaried',
    title: 'Salaried Worker',
    description: 'I have steady income and want business credit',
    icon: Briefcase,
    bgColor: '#EFF6FF',
    iconColor: '#2563EB',
  },
];

const RoleSelectionScreen = ({ navigation }: any) => {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Sticky Header */}
      <View style={styles.headerArea}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ChevronLeft color="white" size={24} />
        </TouchableOpacity>
      </View>

      <View style={styles.titleContainer}>
          <Text style={styles.title}>How do you earn?</Text>
          <Text style={styles.subtitle}>
          This helps us build the right credit model for you
          </Text>
      </View>

      <View style={styles.listContainer}>
        {ROLES.map((role) => (
          <TouchableOpacity
            key={role.id}
            onPress={() => setSelectedRole(role.id)}
            style={[
              styles.roleCard,
              selectedRole === role.id ? styles.roleCardActive : styles.roleCardInactive
            ]}
            accessible={true}
            accessibilityLabel={role.title}
            accessibilityRole="radio"
            accessibilityState={{ checked: selectedRole === role.id }}
          >
            <View 
                style={[styles.iconContainer, { backgroundColor: role.bgColor }]}
            >
              <role.icon size={28} color={role.iconColor} />
            </View>
            
            <View style={styles.textContainer}>
              <Text style={styles.roleTitle}>{role.title}</Text>
              <Text style={styles.roleDescription}>{role.description}</Text>
            </View>

            <View style={[
              styles.radioOuter,
              selectedRole === role.id ? styles.radioOuterActive : styles.radioOuterInactive
            ]}>
              {selectedRole === role.id && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            selectedRole ? styles.continueActive : styles.continueInactive
          ]}
          disabled={!selectedRole}
          onPress={() => navigation.navigate('BVNVerification')}
          accessible={true}
          accessibilityLabel="Continue"
          accessibilityRole="button"
        >
          <Text style={[
            styles.continueText,
            selectedRole ? styles.continueTextActive : styles.continueTextInactive
          ]}>
            Continue
          </Text>
        </TouchableOpacity>
      </View>

      {/* Progress Dots */}
      <View style={styles.progressContainer}>
        {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={[
              styles.progressDot,
              i === 1 ? styles.progressDotActive : styles.progressDotInactive
            ]} />
        ))}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  headerArea: { backgroundColor: '#004D2C', paddingTop: 24, paddingBottom: 24, paddingHorizontal: 24, zIndex: 10 },
  backButton: { width: 44, height: 44, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginLeft: -8 },
  titleContainer: { marginTop: 16, paddingHorizontal: 24 },
  title: { color: '#111827', fontSize: 30, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { color: '#6B7280', fontSize: 16, lineHeight: 24 },
  listContainer: { flex: 1, paddingHorizontal: 24, paddingTop: 16, gap: 16 },
  roleCard: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 16, borderWidth: 2, marginBottom: 16 },
  roleCardActive: { borderColor: '#004D2C', backgroundColor: 'rgba(0, 77, 44, 0.05)' },
  roleCardInactive: { borderColor: '#F9FAFB', backgroundColor: '#F9FAFB' },
  iconContainer: { width: 56, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  textContainer: { flex: 1 },
  roleTitle: { color: '#111827', fontWeight: 'bold', fontSize: 18, marginBottom: 4 },
  roleDescription: { color: '#6B7280', fontSize: 14 },
  radioOuter: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioOuterActive: { borderColor: '#004D2C' },
  radioOuterInactive: { borderColor: '#D1D5DB' },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#004D2C' },
  bottomContainer: { paddingHorizontal: 24, paddingBottom: 48 },
  continueButton: { paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  continueActive: { backgroundColor: '#004D2C', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4 },
  continueInactive: { backgroundColor: '#D1D5DB' },
  continueText: { fontSize: 16, fontWeight: 'bold' },
  continueTextActive: { color: 'white' },
  continueTextInactive: { color: '#6B7280' },
  progressContainer: { flexDirection: 'row', justifyContent: 'center', paddingBottom: 32, gap: 8 },
  progressDot: { height: 6, borderRadius: 3, marginHorizontal: 4 },
  progressDotActive: { width: 32, backgroundColor: '#004D2C' },
  progressDotInactive: { width: 6, backgroundColor: '#E5E7EB' }
});

export default RoleSelectionScreen;
