import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Shield,
  Lock,
  Grid,
  Fingerprint,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react-native';
import type { RootStackScreenProps } from '@/navigation/types';
import { useQuery, useMutation } from '@tanstack/react-query';
import { inventoryService } from '@/services/inventoryService';
import * as LocalAuthentication from 'expo-local-authentication';
import Toast from 'react-native-toast-message';

import { useSecurityStore } from '@/store/securityStore';

const SecuritySettingsScreen = ({ navigation }: RootStackScreenProps<'SecuritySettings'>) => {
  const { securityType, biometricsEnabled, setBiometricsEnabled } = useSecurityStore();

  const SecurityOption = ({ 
    icon: Icon, 
    label, 
    subtitle, 
    isActive, 
    onPress,
    color = '#4B5563' 
  }: any) => (
    <TouchableOpacity 
      style={[styles.optionCard, isActive && styles.activeOption]} 
      onPress={onPress}
    >
      <View style={[styles.iconBox, { backgroundColor: isActive ? '#16A34A' : `${color}10` }]}>
        <Icon size={24} color={isActive ? '#FFF' : color} />
      </View>
      <View style={styles.optionContent}>
        <Text style={[styles.optionLabel, isActive && styles.activeLabel]}>{label}</Text>
        <Text style={styles.optionSubtitle}>{subtitle}</Text>
      </View>
      {isActive ? (
        <View style={styles.activeBadge}>
          <ShieldCheck size={14} color="#16A34A" />
          <Text style={styles.activeText}>Active</Text>
        </View>
      ) : (
        <ChevronRight size={20} color="#D1D5DB" />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Security Center</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={styles.shieldIcon}>
              <Shield size={32} color="#16A34A" />
            </View>
            <View>
              <Text style={styles.statusTitle}>Your account is secure</Text>
              <Text style={styles.statusSubtitle}>Last checked: Today at 10:45 AM</Text>
            </View>
          </View>
          <View style={styles.statusDivider} />
          <View style={styles.protectionRow}>
            <ShieldCheck size={16} color="#16A34A" />
            <Text style={styles.protectionText}>Encryption protocol active: AES-256</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Primary Protection</Text>
        
        <SecurityOption 
          icon={Lock} 
          label="6-Digit PIN" 
          subtitle="Simple and fast authorization"
          isActive={securityType === 'pin'}
          color="#3B82F6"
          onPress={() => navigation.navigate('PINSetup' as any)}
        />

        <SecurityOption 
          icon={Grid} 
          label="Security Pattern" 
          subtitle="Draw to authorize access"
          isActive={securityType === 'pattern'}
          color="#8B5CF6"
          onPress={() => navigation.navigate('PatternSetup' as any)}
        />

        <Text style={styles.sectionLabel}>Secondary Protection</Text>
        
        <TouchableOpacity 
          style={styles.biometricCard} 
          onPress={async () => {
            if (!biometricsEnabled) {
              const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Confirm to enable Biometrics',
              });
              if (result.success) {
                setBiometricsEnabled(true);
                Toast.show({ type: 'success', text1: 'Biometrics Enabled' });
              }
            } else {
              setBiometricsEnabled(false);
              Toast.show({ type: 'info', text1: 'Biometrics Disabled' });
            }
          }}
        >
          <View style={[styles.iconBox, { backgroundColor: '#F3F4F6' }]}>
            <Fingerprint size={24} color="#111827" />
          </View>
          <View style={styles.optionContent}>
            <Text style={styles.optionLabel}>Biometric Access</Text>
            <Text style={styles.optionSubtitle}>Use FaceID or Fingerprint</Text>
          </View>
          <View style={[styles.toggle, biometricsEnabled && styles.toggleActive]}>
            <View style={[styles.toggleThumb, biometricsEnabled && styles.toggleThumbActive]} />
          </View>
        </TouchableOpacity>

        {/* Warning Section */}
        <View style={styles.warningBox}>
          <AlertTriangle size={20} color="#F59E0B" />
          <Text style={styles.warningText}>
            Never share your PIN or Pattern with anyone. VentureRoot staff will never ask for your security credentials.
          </Text>
        </View>

        <TouchableOpacity 
          style={styles.recoveryBtn}
          onPress={() => Alert.alert("Recovery", "Password recovery via Email/SMS is available for lost credentials.")}
        >
          <Text style={styles.recoveryText}>Forgotten PIN or Pattern?</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  scrollContent: {
    padding: 20,
  },
  statusCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  shieldIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  statusSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  statusDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginBottom: 16,
  },
  protectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  protectionText: {
    fontSize: 12,
    color: '#16A34A',
    fontWeight: '700',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
    marginLeft: 4,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  activeOption: {
    borderColor: '#16A34A',
    backgroundColor: '#F0FDF4',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  activeLabel: {
    color: '#16A34A',
  },
  optionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  activeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#16A34A',
  },
  biometricCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: '#16A34A',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFF',
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    padding: 16,
    borderRadius: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    marginBottom: 24,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
    fontWeight: '500',
  },
  recoveryBtn: {
    alignItems: 'center',
    padding: 12,
  },
  recoveryText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '700',
  },
});

export default SecuritySettingsScreen;
