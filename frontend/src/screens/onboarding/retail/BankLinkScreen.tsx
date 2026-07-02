import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { Landmark, CheckCircle2, Search } from 'lucide-react-native';
import OnboardingShell, { OnboardingButton } from '@/components/onboarding/OnboardingShell';
import { useOnboardingNav } from '@/hooks/useOnboardingNav';
import { NIGERIAN_BANKS } from '@/utils/validation';
import { colors } from '@/theme/colors';

const BankLinkScreen = () => {
  const { goNext, goBack, step, total, data } = useOnboardingNav();

  const [selectedBank, setSelectedBank] = useState(data.bankName || '');
  const [isLinking, setIsLinking] = useState(false);
  const [isLinked, setIsLinked] = useState(data.bankLinked || false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBanks = useMemo(() => {
    if (!searchQuery) return [...NIGERIAN_BANKS];
    const lower = searchQuery.toLowerCase();
    return NIGERIAN_BANKS.filter((b) => b.toLowerCase().includes(lower));
  }, [searchQuery]);

  const handleLinkBank = () => {
    if (!selectedBank) return;
    setIsLinking(true);
    setTimeout(() => {
      setIsLinking(false);
      setIsLinked(true);
    }, 2000);
  };

  return (
    <OnboardingShell
      currentStep={step}
      totalSteps={total}
      title="Link Your Bank"
      subtitle="Connect your bank account for seamless settlements and trade credit."
      onBack={goBack}
      footer={
        <View style={{ gap: 10 }}>
          <OnboardingButton
            title={isLinked ? 'Continue' : 'Link Bank Account'}
            onPress={
              isLinked
                ? () => goNext({ bankLinked: true, bankName: selectedBank })
                : handleLinkBank
            }
            disabled={isLinking || (!isLinked && !selectedBank)}
          />
          {!isLinked && (
            <OnboardingButton
              title="Skip for now"
              variant="secondary"
              onPress={() => goNext({ bankLinked: false })}
            />
          )}
        </View>
      }
    >
      {isLinked ? (
        /* Linked state */
        <View style={{ alignItems: 'center', paddingTop: 32 }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: '#F0FDF4',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
            }}
          >
            <CheckCircle2 size={40} color={colors.ventureroot.green} />
          </View>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 6 }}>
            Bank Linked
          </Text>
          <Text style={{ fontSize: 14, color: '#64748B', marginBottom: 20 }}>
            {selectedBank}
          </Text>
          <TouchableOpacity
            onPress={() => {
              setIsLinked(false);
              setSelectedBank('');
              setSearchQuery('');
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#EF4444' }}>
              Unlink & choose another
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Bank selection */
        <View style={{ flex: 1 }}>
          {/* Search box */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#FFFFFF',
              borderWidth: 1.5,
              borderColor: '#E2E8F0',
              borderRadius: 12,
              paddingHorizontal: 14,
              marginBottom: 16,
            }}
          >
            <Search size={16} color="#94A3B8" />
            <View style={{ flex: 1, marginLeft: 8 }}>
              {(() => {
                const { TextInput } = require('react-native');
                return (
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search banks..."
                    placeholderTextColor="#94A3B8"
                    style={{ fontSize: 14, paddingVertical: 12, color: '#0F172A' }}
                  />
                );
              })()}
            </View>
          </View>

          {isLinking && (
            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
              <ActivityIndicator size="large" color={colors.ventureroot.green} />
              <Text style={{ marginTop: 12, fontSize: 13, fontWeight: '600', color: '#64748B' }}>
                Linking {selectedBank}...
              </Text>
            </View>
          )}

          {!isLinking && (
            <FlatList
              data={filteredBanks}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = selectedBank === item;
                return (
                  <TouchableOpacity
                    onPress={() => setSelectedBank(item)}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      borderRadius: 12,
                      borderWidth: 1.5,
                      borderColor: isSelected ? colors.ventureroot.green : '#F1F5F9',
                      backgroundColor: isSelected ? '#F0FDF4' : '#FFFFFF',
                      marginBottom: 8,
                    }}
                  >
                    <Landmark size={18} color={isSelected ? colors.ventureroot.green : '#94A3B8'} />
                    <Text
                      style={{
                        flex: 1,
                        marginLeft: 12,
                        fontSize: 14,
                        fontWeight: '600',
                        color: isSelected ? colors.ventureroot.green : '#334155',
                      }}
                    >
                      {item}
                    </Text>
                    {isSelected && <CheckCircle2 size={18} color={colors.ventureroot.green} />}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={{ textAlign: 'center', color: '#94A3B8', paddingVertical: 20 }}>
                  No banks match your search
                </Text>
              }
            />
          )}
        </View>
      )}
    </OnboardingShell>
  );
};

export default BankLinkScreen;
