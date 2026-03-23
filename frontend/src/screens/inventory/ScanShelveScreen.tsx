import React from 'react';
import { View, Text, SafeAreaView, StatusBar, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Camera, Zap, RefreshCw, X } from 'lucide-react-native';
import { colors } from '@/theme/colors';

const ScanShelveScreen = () => {
  const navigation = useNavigation<any>();

  return (
    <View className="flex-1 bg-black">
      <StatusBar barStyle="light-content" />
      
      {/* Viewfinder Mock */}
      <View className="flex-1 justify-center items-center">
         {/* AR Overlays */}
         <View className="absolute top-[20%] left-[10%] w-[35%] h-[40%] border-2 border-emerald-400 rounded-2xl bg-emerald-400/10 items-center justify-center">
            <View className="bg-emerald-500 px-2 py-1 rounded absolute -top-3">
               <Text className="text-white text-[8px] font-black italic">INDOMIE 70G</Text>
            </View>
            <Text className="text-white font-black text-2xl">x154</Text>
         </View>

         <View className="absolute top-[45%] right-[15%] w-[30%] h-[25%] border-2 border-blue-400 rounded-2xl bg-blue-400/10 items-center justify-center">
            <View className="bg-blue-500 px-2 py-1 rounded absolute -top-3">
               <Text className="text-white text-[8px] font-black italic">PEAK MILK</Text>
            </View>
            <Text className="text-white font-black text-2xl">x42</Text>
         </View>

         {/* Scanning Reticle */}
         <View className="w-64 h-64 border border-white/20 rounded-3xl items-center justify-center">
            <View className="w-8 h-8 border-t-2 border-l-2 border-white absolute top-0 left-0" />
            <View className="w-8 h-8 border-t-2 border-r-2 border-white absolute top-0 right-0" />
            <View className="w-8 h-8 border-b-2 border-l-2 border-white absolute bottom-0 left-0" />
            <View className="w-8 h-8 border-b-2 border-r-2 border-white absolute bottom-0 right-0" />
         </View>
      </View>

      {/* Controls Overlay */}
      <SafeAreaView className="absolute inset-0">
         {/* Top Bar */}
         <View className="pt-12 pb-6 px-4 flex-row items-center justify-between">
            <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 bg-black/40 rounded-full">
               <X color="white" size={24} />
            </TouchableOpacity>
            <View className="bg-black/40 px-4 py-2 rounded-full border border-white/10">
               <Text className="text-white text-xs font-bold uppercase tracking-widest">Scanning Shelf C-4</Text>
            </View>
            <TouchableOpacity className="p-2 bg-black/40 rounded-full">
               <Zap color="white" size={24} />
            </TouchableOpacity>
         </View>

         {/* Bottom Control Bar */}
         <View className="absolute bottom-10 left-0 right-0 px-6 gap-4">
            {/* Live Count Summary */}
            <View className="bg-white/90 rounded-2xl p-4 flex-row items-center justify-between">
               <View className="flex-row items-center">
                  <View className="w-10 h-10 bg-ventureroot-green rounded-xl items-center justify-center mr-3">
                     <Camera size={20} color="white" />
                  </View>
                  <View>
                     <Text className="text-gray-900 font-bold text-sm">3 SKUs Identified</Text>
                     <Text className="text-gray-500 text-[10px]">Processing shelf depth...</Text>
                  </View>
               </View>
               <TouchableOpacity className="bg-slate-900 px-4 py-2 rounded-lg">
                  <Text className="text-white font-bold text-xs">Finish Count</Text>
               </TouchableOpacity>
            </View>

            {/* Quick Actions */}
            <View className="flex-row justify-center gap-10 bg-black/40 py-4 rounded-3xl border border-white/5">
               <TouchableOpacity className="items-center">
                  <View className="w-12 h-12 rounded-full border border-white/20 items-center justify-center mb-1">
                     <RefreshCw size={24} color="white" />
                  </View>
                  <Text className="text-white/60 text-[8px] font-bold uppercase">Rescan</Text>
               </TouchableOpacity>
               <TouchableOpacity className="items-center">
                  <View className="w-12 h-12 rounded-full bg-ventureroot-green items-center justify-center mb-1">
                     <View className="w-8 h-8 rounded-full border-2 border-white" />
                  </View>
                  <Text className="text-white/60 text-[8px] font-bold uppercase">Capture</Text>
               </TouchableOpacity>
               <TouchableOpacity className="items-center">
                  <View className="w-12 h-12 rounded-full border border-white/20 items-center justify-center mb-1">
                     <Text className="text-white font-bold text-xs">M</Text>
                  </View>
                  <Text className="text-white/60 text-[8px] font-bold uppercase">Manual</Text>
               </TouchableOpacity>
            </View>
         </View>
      </SafeAreaView>
    </View>
  );
};

export default ScanShelveScreen;
