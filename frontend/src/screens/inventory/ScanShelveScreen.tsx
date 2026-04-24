import React, { useState, useEffect } from 'react';
import { View, Text, StatusBar, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackScreenProps } from '@/navigation/types';
import { 
  Camera, 
  Zap, 
  RefreshCw, 
  X, 
  Focus,
  Eye,
  AlertTriangle,
  ChevronRight
} from 'lucide-react-native';
import { colors } from '@/theme/colors';

const ScanShelveScreen = ({
  navigation,
}: RootStackScreenProps<'ScanShelve'>) => {
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View className="flex-1 bg-black">
      <StatusBar barStyle="light-content" />
      
      {/* Viewfinder Mock */}
      <View className="flex-1 justify-center items-center">
         {/* AR HUD ELEMENTS */}
         <View className="absolute inset-0 opacity-20">
            <View className="absolute top-0 left-0 right-0 h-[1px] bg-emerald-500" />
            <View className="absolute bottom-0 left-0 right-0 h-[1px] bg-emerald-500" />
            <View className="absolute top-0 bottom-0 left-0 w-[1px] bg-emerald-500" />
            <View className="absolute top-0 bottom-0 right-0 w-[1px] bg-emerald-500" />
         </View>

         {/* AR Floating Tag 1 */}
         <View className="absolute top-[22%] left-[12%]">
            <Animated.View 
              style={{ transform: [{ scale: pulseAnim }] }}
              className="w-32 h-20 border border-emerald-400 rounded-xl bg-emerald-400/10 p-2"
            >
               <View className="flex-row items-center mb-1">
                  <View className="w-2 h-2 rounded-full bg-emerald-400 mr-2" />
                  <Text className="text-emerald-400 text-[8px] font-black uppercase">INDOMIE NOODLES</Text>
               </View>
               <Text className="text-white font-black text-2xl">154</Text>
               <View className="mt-auto flex-row justify-between">
                  <Text className="text-emerald-400/60 text-[6px] font-bold">CONFIDENCE: 98%</Text>
                  <Text className="text-emerald-400/60 text-[6px] font-bold">BATCH: A-22</Text>
               </View>
            </Animated.View>
            <View className="w-[1px] h-10 bg-emerald-400/50 ml-6" />
         </View>

         {/* AR Floating Tag 2 - Discrepancy Alert */}
         <View className="absolute bottom-[35%] right-[10%]">
            <View className="w-36 h-24 border border-red-500 rounded-xl bg-red-500/20 p-3">
               <View className="flex-row items-center mb-1">
                  <AlertTriangle size={10} color="#EF4444" />
                  <Text className="text-red-500 text-[8px] font-black uppercase ml-2">STOCK DRIFT</Text>
               </View>
               <Text className="text-white font-black text-2xl">42</Text>
               <Text className="text-red-300 text-[7px] font-bold mt-1">LEDGER EXPECTS: 48 (-6)</Text>
               <TouchableOpacity className="mt-auto bg-red-500 px-2 py-1 rounded-md self-start">
                  <Text className="text-white text-[7px] font-black">RECONCILE</Text>
               </TouchableOpacity>
            </View>
         </View>

         {/* Central Reticle */}
         <View className="w-72 h-72 items-center justify-center">
            <View className="w-12 h-12 border-t-2 border-l-2 border-emerald-500 absolute top-0 left-0" />
            <View className="w-12 h-12 border-t-2 border-r-2 border-emerald-500 absolute top-0 right-0" />
            <View className="w-12 h-12 border-b-2 border-l-2 border-emerald-500 absolute bottom-0 left-0" />
            <View className="w-12 h-12 border-b-2 border-r-2 border-emerald-500 absolute bottom-0 right-0" />
            
            <View className="bg-emerald-500/10 w-full h-[1px]" />
            <View className="bg-emerald-500/10 w-[1px] h-full" />
            
            <View className="absolute bottom-[-40px] items-center">
               <Text className="text-emerald-500 text-[10px] font-black uppercase tracking-[4px]">Align with shelf edge</Text>
            </View>
         </View>
      </View>

      {/* Controls Overlay */}
      <SafeAreaView className="absolute inset-0">
         {/* Top Bar */}
         <View className="pt-12 pb-6 px-6 flex-row items-center justify-between">
            <TouchableOpacity onPress={() => navigation.goBack()} className="p-3 bg-black/60 rounded-2xl border border-white/10">
               <X color="white" size={24} />
            </TouchableOpacity>
            
            <BlurView intensity={20} tint="dark" className="px-6 py-3 rounded-2xl border border-white/10 overflow-hidden">
               <View className="flex-row items-center">
                  <Focus size={16} color="#10B981" />
                  <Text className="text-white text-[10px] font-black uppercase tracking-widest ml-3">AR Scanner v2.0</Text>
               </View>
            </BlurView>

            <TouchableOpacity className="p-3 bg-black/60 rounded-2xl border border-white/10">
               <Zap color="white" size={24} />
            </TouchableOpacity>
         </View>

         {/* Bottom Control Bar */}
         <View className="absolute bottom-10 left-0 right-0 px-6">
            {/* Live Count Summary */}
            <BlurView intensity={80} tint="dark" className="rounded-[32px] p-6 border border-white/10 shadow-2xl overflow-hidden">
               <View className="flex-row items-center justify-between mb-6">
                  <View className="flex-row items-center">
                     <View className="w-12 h-12 bg-emerald-500/20 rounded-2xl items-center justify-center mr-4 border border-emerald-500/30">
                        <Eye size={24} color="#10B981" />
                     </View>
                     <View>
                        <Text className="text-white font-black text-base">3 Items Scanned</Text>
                        <Text className="text-white/40 text-[10px] uppercase font-bold tracking-tighter">Total Stock Value: ₦245,000</Text>
                     </View>
                  </View>
                  <TouchableOpacity 
                    className="bg-white px-5 py-3 rounded-2xl flex-row items-center"
                    onPress={() => navigation.goBack()}
                  >
                     <Text className="text-black font-black text-xs">SUBMIT</Text>
                     <ChevronRight size={14} color="black" style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
               </View>

               {/* Quick Actions */}
               <View className="flex-row justify-between pt-6 border-t border-white/5">
                  <TouchableOpacity className="items-center flex-1">
                     <View className="w-14 h-14 rounded-2xl bg-white/5 items-center justify-center mb-2 border border-white/10">
                        <RefreshCw size={24} color="white" />
                     </View>
                     <Text className="text-white/40 text-[9px] font-black uppercase">Rescan</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity className="items-center flex-1">
                     <View className="w-16 h-16 rounded-3xl bg-emerald-500 items-center justify-center mb-2 shadow-lg shadow-emerald-500/50">
                        <View className="w-10 h-10 rounded-2xl border-2 border-white/50" />
                     </View>
                     <Text className="text-white/80 text-[9px] font-black uppercase">Capture</Text>
                  </TouchableOpacity>

                  <TouchableOpacity className="items-center flex-1">
                     <View className="w-14 h-14 rounded-2xl bg-white/5 items-center justify-center mb-2 border border-white/10">
                        <Text className="text-white font-black text-lg">M</Text>
                     </View>
                     <Text className="text-white/40 text-[9px] font-black uppercase">Manual</Text>
                  </TouchableOpacity>
               </View>
            </BlurView>
         </View>
      </SafeAreaView>
    </View>
  );
};

export default ScanShelveScreen;
