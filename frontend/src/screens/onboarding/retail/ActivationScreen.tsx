import React, { useEffect, useState } from 'react';
import { View, SafeAreaView, StatusBar, Animated, Easing } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ShieldAlert, Cpu, Database, Link, CheckCircle2 } from 'lucide-react-native';
import { colors } from '../../../theme/colors';
import { IndustrialText } from '../../../components/ui/IndustrialComponents';
import { useOnboarding } from '../../../context/OnboardingContext';

const STATUS_MESSAGES = [
  { text: "INITIALIZING_NEURAL_PROTOCOL", icon: Cpu },
  { text: "SYNCING_IDENTITY_NODES", icon: ShieldAlert },
  { text: "MAPPING_AI_INVENTORY_MESH", icon: Database },
  { text: "SECURING_LIQUIDITY_GATEWAYS", icon: Link },
  { text: "VENTUREROOT_PROTOCOL_ACTIVE", icon: CheckCircle2 }
];

const ActivationScreen = () => {
  const navigation = useNavigation<any>();
  const { submitOnboarding } = useOnboarding();
  const [currentStep, setCurrentStep] = useState(0);
  const [progress] = useState(new Animated.Value(0));
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Overall animation timing
    const stepDuration = 700; // Total ~3.5 seconds

    const timer = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < STATUS_MESSAGES.length - 1) {
          return prev + 1;
        }
        clearInterval(timer);
        return prev;
      });
    }, stepDuration);

    // Progress bar animation
    Animated.timing(progress, {
      toValue: 1,
      duration: 3500,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    // Initial fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Final navigation
    const performSubmission = async () => {
      try {
        await submitOnboarding();
      } catch (err) {
        console.error("Submission failed silently in activation background", err);
      }
    };

    performSubmission();

    const redirect = setTimeout(() => {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Dashboard' }],
      });
    }, 4500);

    return () => {
      clearInterval(timer);
      clearTimeout(redirect);
    };
  }, []);

  const ActiveIcon = STATUS_MESSAGES[currentStep].icon;

  return (
    <SafeAreaView className="flex-1 bg-ventureroot-industrial-background">
      <StatusBar barStyle="light-content" />
      
      <View className="flex-1 items-center justify-center px-12">
        {/* Animated HUD Element */}
        <Animated.View 
          style={{ opacity: fadeAnim }}
          className="items-center mb-16"
        >
          <View className="w-32 h-32 border-4 border-ventureroot-industrial-primary/20 items-center justify-center relative">
             {/* Spinning Border Decoration */}
             <View className="absolute inset-0 border-t-4 border-l-4 border-ventureroot-industrial-primary opacity-40" 
                   style={{ transform: [{ rotate: '45deg' }] }} />
             
             <ActiveIcon size={48} color={colors.ventureroot.industrial.primary} />
          </View>

          <View className="mt-12 items-center">
            <IndustrialText variant="label" className="text-ventureroot-industrial-primary tracking-[4px] mb-2">
              NEURAL_PROCESSING
            </IndustrialText>
            <IndustrialText className="text-ventureroot-industrial-onSurface text-center font-black text-xs uppercase tracking-widest h-8">
              {STATUS_MESSAGES[currentStep].text}
            </IndustrialText>
          </View>
        </Animated.View>

        {/* Tactical Progress Bar */}
        <View className="w-full h-1 bg-ventureroot-industrial-surfaceLow overflow-hidden">
          <Animated.View 
            style={{ 
              width: progress.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%']
              }),
              backgroundColor: colors.ventureroot.industrial.primary
            }}
            className="h-full"
          />
        </View>

        {/* Bit-stream decoration */}
        <View className="absolute bottom-20 left-12 right-12 opacity-5">
           <IndustrialText className="text-xxs leading-3 font-mono">
             PROTOCOL::771-X // ENCRYPTING_LAYER_7 // AUTH_SYNC_COMPLETE // NODE_MAP_ACTIVE // VENTURE_ROOT_OS_v2.4 // 
             STREAMS::992-88 // KERNEL_BOOT // LIQUIDITY_VAL_SUCCESS // RAG_MODEL_LOADED //TALK_N_STOCK_V2 //
           </IndustrialText>
        </View>
      </View>
      
      {/* Aesthetic Side Labels */}
      <View className="absolute left-[20] top-[50%] -rotate-90 origin-left">
        <IndustrialText className="text-[8px] text-ventureroot-industrial-onSurface opacity-20 font-black tracking-[4px]">
          TERMINAL_HANDSHAKE_ACTIVE
        </IndustrialText>
      </View>
      
      <View className="absolute right-[20] top-[50%] rotate-90 origin-right">
        <IndustrialText className="text-[8px] text-ventureroot-industrial-onSurface opacity-20 font-black tracking-[4px]">
          NODE_ID: {Math.random().toString(16).substring(2, 10).toUpperCase()}
        </IndustrialText>
      </View>
    </SafeAreaView>
  );
};

export default ActivationScreen;
