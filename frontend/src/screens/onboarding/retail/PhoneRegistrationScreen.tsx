import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar, KeyboardAvoidingView, Platform, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useOnboarding } from '../../../context/OnboardingContext';
import { BowlHeader, CleanCard, CleanInput, RichButton } from '../../../components/ThemeComponents';
import { ChevronLeft, ShieldCheck, ArrowRight } from 'lucide-react-native';
import { styled } from 'nativewind';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);

const PhoneRegistrationScreen = () => {
  const navigation = useNavigation<any>();
  const { data, updateData } = useOnboarding();
  const [value, setValue] = useState(data.phoneOrEmail || '');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otp, setOtp] = useState('');

  const handleContinue = () => {
    if (!isOtpSent) {
      // Simulate sending OTP
      updateData({ phoneOrEmail: value });
      setIsOtpSent(true);
    } else {
      // Small delay to simulate verification
      updateData({ otp });
      navigation.navigate('OnboardingBasicInfo');
    }
  };

  return (
    <StyledView className="flex-1 bg-ventureroot-clean-background">
      <StatusBar barStyle="light-content" />
      
      <BowlHeader 
        title={isOtpSent ? "Verification" : "Identity Anchor"} 
        subtitle={isOtpSent ? `We sent a code to ${value}` : "Secure your business profile with a master identity token."}
      />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView 
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 30, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <StyledTouchableOpacity 
            onPress={() => isOtpSent ? setIsOtpSent(false) : navigation.goBack()}
            className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center mb-6"
          >
            <ChevronLeft color="#1E293B" size={24} />
          </StyledTouchableOpacity>

          {!isOtpSent ? (
            <StyledView>
              <StyledView className="flex-row items-center bg-ventureroot-green/5 self-start px-3 py-1.5 rounded-lg mb-6">
                <ShieldCheck size={14} color="#004D2C" />
                <StyledText className="text-[10px] font-bold text-ventureroot-green ml-1.5 uppercase tracking-wider">
                  SIM KYC Cross-Check Ready
                </StyledText>
              </StyledView>

              <CleanInput
                label="MOBILE NUMBER OR EMAIL"
                value={value}
                onChangeText={setValue}
                placeholder="e.g. 08012345678 or name@example.com"
                keyboardType={value.includes('@') ? 'email-address' : 'phone-pad'}
              />
              
              <StyledText className="text-ventureroot-clean-textLight text-xs italic opacity-70 mb-8 px-1">
                This will be used for your secure login and transaction authorization.
              </StyledText>
            </StyledView>
          ) : (
            <StyledView className="items-center">
              <StyledView className="flex-row justify-center gap-3 mb-10">
                {[...Array(6)].map((_, i) => (
                  <StyledView 
                    key={i} 
                    className={`w-12 h-16 rounded-2xl items-center justify-center border-2 ${
                      otp[i] ? 'border-ventureroot-green bg-ventureroot-green/5' : 'border-slate-100 bg-white'
                    }`}
                  >
                    <StyledText className="text-2xl font-bold text-ventureroot-green">
                      {otp[i] || ''}
                    </StyledText>
                    {!otp[i] && <StyledView className="w-4 h-0.5 bg-slate-200 absolute bottom-4" />}
                  </StyledView>
                ))}
                <TextInput
                  value={otp}
                  onChangeText={(t) => setOtp(t.slice(0, 6))}
                  keyboardType="number-pad"
                  style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%' }}
                  autoFocus
                />
              </StyledView>
              
              <StyledTouchableOpacity 
                onPress={() => setIsOtpSent(false)} 
                className="mb-8"
              >
                <StyledText className="text-ventureroot-green font-bold text-sm">
                  Resend Code
                </StyledText>
              </StyledTouchableOpacity>
            </StyledView>
          )}

          <RichButton
            title={isOtpSent ? "Verify Identity" : "Continue"}
            onPress={handleContinue}
            disabled={!value || (isOtpSent && otp.length < 6)}
          />

        </ScrollView>
      </KeyboardAvoidingView>
    </StyledView>
  );
};

export default PhoneRegistrationScreen;
