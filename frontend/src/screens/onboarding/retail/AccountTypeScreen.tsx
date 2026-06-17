import React from 'react';
import { View, TouchableOpacity, ScrollView, useColorScheme } from 'react-native';
import type { RootStackScreenProps } from '@/navigation/types';
import { useOnboarding } from '../../../context/OnboardingContext';
import { ChevronRight } from 'lucide-react-native';
import { colors, spacing } from '../../../theme/colors';
import { IndustrialPage, IndustrialText, IndustrialCard, useIndustrialTheme } from '../../../components/ui/IndustrialComponents';
import { getEnabledTypes } from '@/config/accountTypes';

const AccountTypeScreen = ({
  navigation,
}: RootStackScreenProps<'OnboardingAccountType'>) => {
  const { data, updateData } = useOnboarding();
  const theme = useIndustrialTheme();
  const isDark = useColorScheme() === 'dark';

  const enabledTypes = getEnabledTypes();

  const handleSelect = (id: string) => {
    updateData({ accountType: id });
    navigation.navigate('OnboardingPhone');
  };

  return (
    <IndustrialPage>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 20 }}>
        <View style={{ marginBottom: 40 }}>
          <IndustrialText variant="label" style={{ color: colors.ventureroot.industrial.primary, marginBottom: 8 }}>
            PROTOCOL_IDENTIFIER
          </IndustrialText>
          <IndustrialText variant="h1">
            ACCOUNT{"\n"}TYPE
          </IndustrialText>
          <View style={{ width: 40, height: 4, backgroundColor: colors.ventureroot.industrial.primary, marginTop: 16 }} />
        </View>

        <IndustrialText variant="label" style={{ marginBottom: 24, opacity: 0.6 }}>
          SELECT OPERATIONAL MODE
        </IndustrialText>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <View style={{ gap: 12 }}>
            {enabledTypes.map((item) => {
              const isActive = data.accountType === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => handleSelect(item.id)}
                  activeOpacity={0.9}
                >
                  <IndustrialCard 
                    variant={isActive ? "high" : "low"} 
                    style={{ 
                      flexDirection: 'row', 
                      alignItems: 'center', 
                      padding: 20,
                      borderColor: isActive ? colors.ventureroot.industrial.primary : theme.outline,
                      borderWidth: isActive ? 2 : 1
                    }}
                  >
                    <View style={{ 
                      width: 52, 
                      height: 52, 
                      backgroundColor: isActive ? colors.ventureroot.industrial.primary : theme.surfaceHigh,
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      marginRight: 20,
                      borderRadius: 8
                    }}>
                      <item.icon
                        size={24}
                        color={isActive ? '#131313' : colors.ventureroot.industrial.primary}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <IndustrialText style={{ fontWeight: '900', fontSize: 14, marginBottom: 4, color: theme.onSurface }}>
                        {item.tagline}
                      </IndustrialText>
                      <IndustrialText style={{ fontSize: 10, opacity: 0.5, lineHeight: 14 }}>
                        {item.description}
                      </IndustrialText>
                    </View>

                    <ChevronRight size={18} color={theme.onSurface} opacity={0.3} />
                  </IndustrialCard>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </IndustrialPage>
  );
};

export default AccountTypeScreen;
