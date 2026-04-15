import React, { useEffect, useState, useMemo } from 'react';
import { View, StatusBar, Animated, Easing, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackScreenProps } from '@/navigation/types';
import { ShieldAlert, Cpu, Database, Link, CheckCircle2, TriangleAlert, RefreshCw } from 'lucide-react-native';
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

const ActivationScreen = ({
  navigation,
}: RootStackScreenProps<'OnboardingActivation'>) => {
  const { submitOnboarding } = useOnboarding();
  const nodeId = useMemo(() => Math.random().toString(16).substring(2, 10).toUpperCase(), []);
  const [currentStep, setCurrentStep] = useState(0);
  const [progress] = useState(new Animated.Value(0));
  const [fadeAnim] = useState(new Animated.Value(0));
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const startActivation = async () => {
    setStatus('processing');
    setErrorMessage(null);
    setCurrentStep(0);
    progress.setValue(0);

    // Initial fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Progress bar animation (visual duration)
    const visualProgress = Animated.timing(progress, {
      toValue: 1,
      duration: 4000, // Slightly longer than status messages
      easing: Easing.linear,
      useNativeDriver: false,
    });
    
    visualProgress.start();

    // Overall animation timing for messages
    const stepDuration = 800;
    const timer = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < STATUS_MESSAGES.length - 1) {
          return prev + 1;
        }
        clearInterval(timer);
        return prev;
      });
    }, stepDuration);

    try {
      const result = await submitOnboarding();
      if (result.success) {
        setStatus('success');
        // Wait for animation to finish before redirecting
        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Dashboard' }],
          });
        }, 4500);
      } else {
        clearInterval(timer);
        visualProgress.stop();
        setStatus('error');
        setErrorMessage(result.error || "UNKNOWN_SYNC_CONFLICT");
      }
    } catch (err: any) {
      clearInterval(timer);
      visualProgress.stop();
      setStatus('error');
      setErrorMessage(err.message || "PROTOCOL_HARD_FAULT");
    }

    return () => clearInterval(timer);
  };

  useEffect(() => {
    startActivation();
  }, []);

  const ActiveIcon = status === 'error' ? TriangleAlert : STATUS_MESSAGES[currentStep].icon;

  return (
    <SafeAreaView className="flex-1 bg-ventureroot-industrial-background">
      <StatusBar barStyle="light-content" />
      
      <View className="flex-1 items-center justify-center px-12">
        {/* Animated HUD Element */}
        <Animated.View 
          style={{ opacity: fadeAnim }}
          className="items-center mb-16"
        >
          <View className={`w-32 h-32 border-4 ${status === 'error' ? 'border-red-900/50' : 'border-ventureroot-industrial-primary/20'} items-center justify-center relative`}>
             {/* Spinning Border Decoration */}
             <View className={`absolute inset-0 border-t-4 border-l-4 ${status === 'error' ? 'border-red-500' : 'border-ventureroot-industrial-primary'} opacity-40`} 
                   style={{ transform: [{ rotate: '45deg' }] }} />
             
             <ActiveIcon size={48} color={status === 'error' ? '#ef4444' : colors.ventureroot.industrial.primary} />
          </View>

          <View className="mt-12 items-center">
            <IndustrialText variant="label" className={`${status === 'error' ? 'text-red-500' : 'text-ventureroot-industrial-primary'} tracking-[4px] mb-2`}>
              {status === 'error' ? 'SYSTEM_FAILURE' : 'NEURAL_PROCESSING'}
            </IndustrialText>
            
            {status === 'error' ? (
              <View className="items-center">
                <IndustrialText className="text-red-400 text-center text-[10px] uppercase font-mono mb-6">
                  ERROR_CODE: {errorMessage}
                </IndustrialText>
                
                <TouchableOpacity 
                  onPress={startActivation}
                  className="bg-red-500/10 border border-red-500/30 px-6 py-3 flex-row items-center"
                >
                  <RefreshCw size={14} color="#ef4444" style={{ marginRight: 8 }} />
                  <IndustrialText className="text-red-500 text-xs font-black tracking-widest">
                    RETRY_PROTOCOL
                  </IndustrialText>
                </TouchableOpacity>
              </View>
            ) : (
              <IndustrialText className="text-ventureroot-industrial-onSurface text-center font-black text-xs uppercase tracking-widest h-8">
                {STATUS_MESSAGES[currentStep].text}
              </IndustrialText>
            )}
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
              backgroundColor: status === 'error' ? '#ef4444' : colors.ventureroot.industrial.primary
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
          {status === 'error' ? 'CORE_DUMP_ANALYSIS' : 'TERMINAL_HANDSHAKE_ACTIVE'}
        </IndustrialText>
      </View>
      
      <View className="absolute right-[20] top-[50%] rotate-90 origin-right">
        <IndustrialText className="text-[8px] text-ventureroot-industrial-onSurface opacity-20 font-black tracking-[4px]">
          NODE_ID: {nodeId}
        </IndustrialText>
      </View>
    </SafeAreaView>
  );
};

export default ActivationScreen;

