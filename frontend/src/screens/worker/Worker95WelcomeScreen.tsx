// @ts-nocheck
import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  TrendingUp,
  PiggyBank,
  Briefcase,
  ChevronRight,
  Zap,
  Shield,
  BarChart3,
  Target,
  ArrowRight,
} from 'lucide-react-native';
import type { RootStackScreenProps } from '@/navigation/types';

const { width: SW, height: SH } = Dimensions.get('window');

const PATHWAYS = [
  {
    icon: TrendingUp,
    color: '#059669',
    bg: '#D1FAE5',
    title: 'Micro-Invest',
    tagline: 'Put your salary to work',
    desc: 'Invest from ₦10,000 into verified local businesses ranked by real inventory performance data. Earn monthly dividends automatically.',
    stats: [
      { label: 'Avg. Monthly ROI', value: '4.2%' },
      { label: 'Min. Investment', value: '₦10,000' },
    ],
  },
  {
    icon: PiggyBank,
    color: '#7C3AED',
    bg: '#EDE9FE',
    title: 'Business Savings',
    tagline: 'Launch your own venture',
    desc: 'Set structured savings targets and automate contributions from your salary or daily transactions. Build capital to launch your business.',
    stats: [
      { label: 'Automation Modes', value: '2 types' },
      { label: 'Avg. Target Period', value: '18 mo' },
    ],
  },
];

const TRUST_BADGES = [
  { icon: Shield, label: 'CBN-Compliant', color: '#059669' },
  { icon: Zap, label: 'Instant Payouts', color: '#FBBF24' },
  { icon: BarChart3, label: 'Live Data', color: '#3B82F6' },
];

export default function Worker95WelcomeScreen({
  navigation,
}: RootStackScreenProps<'Worker95Welcome'>) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#064E3B" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ── Hero gradient header ── */}
        <LinearGradient colors={['#064E3B', '#059669', '#10B981']} style={styles.hero}>
          <View style={styles.heroBriefcase}>
            <Briefcase size={36} color="#fff" />
          </View>
          <Text style={styles.heroEyebrow}>VentureRoot · 9-5 Worker Module</Text>
          <Text style={styles.heroTitle}>Your salary{'\n'}is an asset.</Text>
          <Text style={styles.heroSubtitle}>
            Join thousands of Nigerian salaried workers building wealth and launching businesses
            on autopilot — without quitting their jobs.
          </Text>

          {/* Trust badges */}
          <View style={styles.badgeRow}>
            {TRUST_BADGES.map((b) => (
              <View key={b.label} style={styles.badge}>
                <b.icon size={13} color={b.color} />
                <Text style={styles.badgeText}>{b.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* ── Two Pathways ── */}
        <Animated.View
          style={[styles.pathwaysWrapper, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          <Text style={styles.sectionTitle}>Choose your wealth path</Text>
          <Text style={styles.sectionSub}>You can run both simultaneously.</Text>

          {PATHWAYS.map((p) => (
            <View key={p.title} style={styles.pathwayCard}>
              <View style={[styles.pathwayIconWrap, { backgroundColor: p.bg }]}>
                <p.icon size={26} color={p.color} />
              </View>
              <View style={styles.pathwayBody}>
                <Text style={styles.pathwayTagline}>{p.tagline}</Text>
                <Text style={styles.pathwayTitle}>{p.title}</Text>
                <Text style={styles.pathwayDesc}>{p.desc}</Text>
                <View style={styles.pathwayStats}>
                  {p.stats.map((s) => (
                    <View key={s.label} style={[styles.pathwayStat, { borderColor: p.bg }]}>
                      <Text style={[styles.pathwayStatValue, { color: p.color }]}>{s.value}</Text>
                      <Text style={styles.pathwayStatLabel}>{s.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          ))}

          {/* ── How it works strip ── */}
          <View style={styles.howSection}>
            <Text style={styles.howTitle}>How it works</Text>
            {[
              { step: '1', text: 'Complete your worker profile & BVN verification.' },
              { step: '2', text: 'Link your salary account. A virtual account is auto-generated for deposits.' },
              { step: '3', text: 'Pick businesses to invest in or set a savings target — or both.' },
              { step: '4', text: 'Dividends and sweep confirmations arrive automatically each month.' },
            ].map((item) => (
              <View key={item.step} style={styles.howRow}>
                <View style={styles.howStep}>
                  <Text style={styles.howStepText}>{item.step}</Text>
                </View>
                <Text style={styles.howText}>{item.text}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </ScrollView>

      {/* ── Sticky CTA ── */}
      <View style={styles.ctaBar}>
        <TouchableOpacity
          style={styles.ctaBtn}
          onPress={() => navigation.navigate('Worker95Onboarding')}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaBtnText}>Get Started — Set Up My Profile</Text>
          <ArrowRight size={18} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.ctaSecondary}
          onPress={() => navigation.navigate('Worker95Dashboard')}
        >
          <Text style={styles.ctaSecondaryText}>I already have an account</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  scroll: { paddingBottom: 160 },

  hero: { paddingTop: 28, paddingBottom: 36, paddingHorizontal: 24 },
  heroBriefcase: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  heroEyebrow: { fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  heroTitle: { fontSize: 38, fontWeight: '900', color: '#fff', lineHeight: 44, letterSpacing: -1, marginBottom: 12 },
  heroSubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.8)', lineHeight: 22, marginBottom: 24 },

  badgeRow: { flexDirection: 'row', gap: 8 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
  },
  badgeText: { fontSize: 11, color: '#fff', fontWeight: '600' },

  pathwaysWrapper: { padding: 20 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 4 },
  sectionSub: { fontSize: 13, color: '#9CA3AF', marginBottom: 20 },

  pathwayCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 14,
    flexDirection: 'row', alignItems: 'flex-start', gap: 16,
    borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  pathwayIconWrap: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  pathwayBody: { flex: 1 },
  pathwayTagline: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  pathwayTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 8 },
  pathwayDesc: { fontSize: 13, color: '#6B7280', lineHeight: 20, marginBottom: 12 },
  pathwayStats: { flexDirection: 'row', gap: 10 },
  pathwayStat: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 10, alignItems: 'center' },
  pathwayStatValue: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  pathwayStatLabel: { fontSize: 10, color: '#9CA3AF', textAlign: 'center' },

  howSection: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginTop: 6, borderWidth: 1, borderColor: '#E5E7EB' },
  howTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 16 },
  howRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 14 },
  howStep: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  howStepText: { fontSize: 13, fontWeight: '800', color: '#059669' },
  howText: { flex: 1, fontSize: 13, color: '#374151', lineHeight: 20 },

  ctaBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32,
    borderTopWidth: 1, borderTopColor: '#E5E7EB',
  },
  ctaBtn: {
    backgroundColor: '#059669', borderRadius: 16, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10,
  },
  ctaBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  ctaSecondary: { alignItems: 'center', paddingVertical: 4 },
  ctaSecondaryText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
});
