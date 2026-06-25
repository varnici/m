import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Clock, LogOut } from 'lucide-react-native';
import { colors } from '@/theme/colors';
import { useUserProfileStore } from '@/store/userProfileStore';
import { getTypeConfig } from '@/config/accountTypes';
import { useAuth } from '@/context/AuthContext';
import AppHeader from '@/components/ui/AppHeader';

const ComingSoonScreen = () => {
  const { signOut } = useAuth();
  const accountType = useUserProfileStore((s) => s.accountType);
  const config = accountType ? getTypeConfig(accountType) : null;
  const clearProfile = useUserProfileStore((s) => s.clear);

  const handleSignOut = async () => {
    clearProfile();
    await signOut();
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <AppHeader title="Coming Soon" />
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Clock size={48} color={colors.ventureroot.green} />
        </View>

        <Text style={styles.title}>Coming Soon</Text>
        <Text style={styles.subtitle}>
          {config
            ? `The ${config.label} experience is under development.`
            : 'This account type is under development.'}
        </Text>
        <Text style={styles.body}>
          You've been placed on the waitlist. We'll notify you when your dashboard is ready.
        </Text>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <LogOut size={18} color="#64748B" />
          <Text style={styles.signOutText}>Sign out & choose another type</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default ComingSoonScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  iconContainer: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  title: { fontSize: 24, fontWeight: '800', color: '#1E293B', marginBottom: 12, textAlign: 'center' },
  subtitle: { fontSize: 16, fontWeight: '600', color: '#475569', marginBottom: 8, textAlign: 'center' },
  body: { fontSize: 14, color: '#94A3B8', textAlign: 'center', lineHeight: 22, marginBottom: 40 },
  signOutButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 12, paddingHorizontal: 24,
    borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0',
  },
  signOutText: { fontSize: 14, color: '#64748B', fontWeight: '600' },
});
