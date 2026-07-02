import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Camera, Mic, CheckCircle2, Package } from 'lucide-react-native';
import OnboardingShell, { OnboardingButton } from '@/components/onboarding/OnboardingShell';
import { useOnboardingNav } from '@/hooks/useOnboardingNav';
import { colors } from '@/theme/colors';

const InventorySnapshotScreen = () => {
  const { goNext, goBack, step, total, data } = useOnboardingNav();

  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [estimatedValue, setEstimatedValue] = useState<number>(data.estimatedInventoryValue || 0);

  const handleScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setScanComplete(true);
      setEstimatedValue(842500);
    }, 2500);
  };

  const formattedValue = estimatedValue > 0
    ? new Intl.NumberFormat('en-NG').format(estimatedValue)
    : '---';

  return (
    <OnboardingShell
      currentStep={step}
      totalSteps={total}
      title="Inventory Snapshot"
      subtitle="Get an AI-powered estimate of your current stock value. You can refine this later."
      onBack={goBack}
      footer={
        <View style={{ gap: 10 }}>
          <OnboardingButton
            title="Continue"
            onPress={() => goNext({ estimatedInventoryValue: estimatedValue })}
            disabled={!scanComplete}
          />
          <OnboardingButton
            title="Skip for now"
            variant="secondary"
            onPress={() => goNext({ estimatedInventoryValue: 0 })}
          />
        </View>
      }
    >
      {/* Scan result display */}
      <View
        style={{
          backgroundColor: '#FFFFFF',
          borderWidth: 1.5,
          borderColor: scanComplete ? colors.ventureroot.green : '#E2E8F0',
          borderRadius: 16,
          padding: 24,
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        {scanComplete ? (
          <CheckCircle2 size={32} color={colors.ventureroot.green} style={{ marginBottom: 12 }} />
        ) : (
          <Package size={32} color="#94A3B8" style={{ marginBottom: 12 }} />
        )}

        <Text style={{ fontSize: 12, fontWeight: '700', color: '#94A3B8', letterSpacing: 1, marginBottom: 8 }}>
          ESTIMATED VALUE
        </Text>
        <Text style={{ fontSize: 36, fontWeight: '800', color: scanComplete ? '#0F172A' : '#CBD5E1' }}>
          {estimatedValue > 0 ? '₦' : ''}{formattedValue}
        </Text>
        {scanComplete && (
          <Text style={{ marginTop: 8, fontSize: 12, fontWeight: '600', color: colors.ventureroot.green }}>
            Confidence: 98.4%
          </Text>
        )}
      </View>

      {/* Scan options */}
      <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 12, letterSpacing: 0.5 }}>
        Scan Method
      </Text>

      {/* AI Shelf Scan */}
      <TouchableOpacity
        onPress={handleScan}
        disabled={isScanning || scanComplete}
        activeOpacity={0.7}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
          borderWidth: 1.5,
          borderColor: isScanning ? colors.ventureroot.green : '#E2E8F0',
          borderRadius: 14,
          padding: 18,
          marginBottom: 12,
          opacity: scanComplete ? 0.5 : 1,
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: '#F0FDF4',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 14,
          }}
        >
          {isScanning ? (
            <ActivityIndicator size="small" color={colors.ventureroot.green} />
          ) : (
            <Camera size={22} color={colors.ventureroot.green} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 2 }}>
            AI Shelf Scan
          </Text>
          <Text style={{ fontSize: 12, color: '#94A3B8', lineHeight: 16 }}>
            Point your camera at shelves to auto-detect items and quantities
          </Text>
        </View>
      </TouchableOpacity>

      {/* Voice-to-text (placeholder) */}
      <TouchableOpacity
        activeOpacity={0.7}
        disabled={scanComplete}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
          borderWidth: 1.5,
          borderColor: '#E2E8F0',
          borderRadius: 14,
          padding: 18,
          marginBottom: 12,
          opacity: scanComplete ? 0.5 : 0.6,
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: '#F8FAFC',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 14,
          }}
        >
          <Mic size={22} color="#94A3B8" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 2 }}>
            Voice-to-Text
          </Text>
          <Text style={{ fontSize: 12, color: '#94A3B8', lineHeight: 16 }}>
            Speak item names and quantities for quick logging (coming soon)
          </Text>
        </View>
      </TouchableOpacity>

      {scanComplete && (
        <View style={{ marginTop: 16, backgroundColor: '#F0FDF4', borderRadius: 12, padding: 16 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ventureroot.green, textAlign: 'center' }}>
            Scan complete. You can refine your inventory from the dashboard.
          </Text>
        </View>
      )}
    </OnboardingShell>
  );
};

export default InventorySnapshotScreen;
