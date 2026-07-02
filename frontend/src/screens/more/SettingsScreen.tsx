import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  User,
  Bell,
  Shield,
  Eye,
  Globe,
  HelpCircle,
  LogOut,
  ChevronRight,
  Moon,
  Smartphone,
  CreditCard,
  Building,
} from 'lucide-react-native';
import type { RootStackScreenProps } from '@/navigation/types';
import { colors } from '@/theme/colors';

const SettingsScreen = ({ navigation }: RootStackScreenProps<'Settings'>) => {
  const { signOut } = useAuth();
  const [notifications, setNotifications] = useState({
    push: true,
    email: false,
    sms: true,
  });

  const [biometrics, setBiometrics] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const SettingItem = ({ 
    icon: Icon, 
    label, 
    value, 
    onPress, 
    type = 'link', 
    color = '#4B5563',
    subtitle 
  }: any) => (
    <TouchableOpacity 
      style={styles.item} 
      onPress={onPress}
      disabled={type === 'toggle'}
    >
      <View style={[styles.iconBox, { backgroundColor: `${color}10` }]}>
        <Icon size={20} color={color} />
      </View>
      <View style={styles.itemContent}>
        <Text style={styles.itemLabel}>{label}</Text>
        {subtitle && <Text style={styles.itemSubtitle}>{subtitle}</Text>}
      </View>
      {type === 'link' && (
        <View style={styles.rightContent}>
          {value && <Text style={styles.valueText}>{value}</Text>}
          <ChevronRight size={18} color="#D1D5DB" />
        </View>
      )}
      {type === 'toggle' && (
        <Switch
          value={value}
          onValueChange={onPress}
          trackColor={{ false: '#E5E7EB', true: '#16A34A' }}
          thumbColor="#FFFFFF"
        />
      )}
    </TouchableOpacity>
  );

  const Section = ({ title, children }: any) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>
        {children}
      </View>
    </View>
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
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Section title="Account">
          <SettingItem 
            icon={User} 
            label="Personal Information" 
            subtitle="Name, email, phone number"
            color="#3B82F6"
            onPress={() => navigation.navigate('Profile')}
          />
          <SettingItem 
            icon={Building} 
            label="Business Profile" 
            subtitle="Store details, trading name"
            color="#10B981"
            onPress={() => navigation.navigate('AccountDetails')}
          />
          <SettingItem 
            icon={CreditCard} 
            label="Payment Methods" 
            subtitle="Connected banks, cards"
            color="#F59E0B"
            onPress={() => navigation.navigate('AccountDetails')}
          />
        </Section>

        <Section title="Preferences">
          <SettingItem 
            icon={Bell} 
            label="Push Notifications" 
            type="toggle"
            value={notifications.push}
            color="#8B5CF6"
            onPress={() => setNotifications({ ...notifications, push: !notifications.push })}
          />
          <SettingItem 
            icon={Moon} 
            label="Dark Mode" 
            type="toggle"
            value={darkMode}
            color="#1F2937"
            onPress={() => setDarkMode(!darkMode)}
          />
          <SettingItem 
            icon={Globe} 
            label="Language" 
            value="English"
            color="#06B6D4"
            onPress={() => {}}
          />
        </Section>

        <Section title="Security">
          <SettingItem 
            icon={Shield} 
            label="Security Center" 
            subtitle="PIN, Pattern, Biometrics"
            color="#10B981"
            onPress={() => navigation.navigate('SecuritySettings')}
          />
          <SettingItem 
            icon={Smartphone} 
            label="Biometric Login" 
            type="toggle"
            value={biometrics}
            color="#EF4444"
            onPress={() => setBiometrics(!biometrics)}
          />
        </Section>

        <Section title="Support">
          <SettingItem 
            icon={HelpCircle} 
            label="Help Center" 
            color="#4B5563"
            onPress={() => navigation.navigate('Support')}
          />
        </Section>

        <TouchableOpacity 
          style={styles.logoutBtn}
          onPress={() => {
            Alert.alert(
              "Sign Out",
              "Are you sure you want to sign out?",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Sign Out",
                  style: "destructive",
                  onPress: async () => {
                    await signOut();
                  }
                }
              ]
            );
          }}
        >
          <LogOut size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>VentureRoot v2.4.0 (Enterprise)</Text>
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
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  itemContent: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  itemSubtitle: {
    fontSize: 11,
    color: '#6B7280',
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  valueText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    padding: 18,
    borderRadius: 20,
    gap: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EF4444',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 32,
    fontWeight: '500',
  },
});

export default SettingsScreen;
