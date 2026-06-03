import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Text, View, StatusBar, TouchableOpacity, ActivityIndicator, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// Conditionally import Mapbox only if available
let MapboxGL: any = null;
try {
  MapboxGL = require('@rnmapbox/maps');
} catch (e) {
  // Mapbox not available in Expo Go
  console.warn('Mapbox not available - using fallback UI');
}
import * as Location from 'expo-location';
import LottieView from 'lottie-react-native';
import type { RootStackScreenProps } from '@/navigation/types';
import { ChevronLeft, MapPin, Users, ShieldCheck } from 'lucide-react-native';
import { colors } from '@/theme/colors';
import { generateClusterSimulation, ClusterParticipant } from '@/lib/clusterSimulation';

// Only set Mapbox token if Mapbox is available
if (MapboxGL) {
  const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoiZXhhbXBsZSIsImEiOiJjbGV4YW1wbGUifQ.example'; // Replace with your actual Mapbox access token
  MapboxGL.setAccessToken(MAPBOX_ACCESS_TOKEN);
  MapboxGL.setWellKnownTileServer('Mapbox');
  MapboxGL.setTelemetryEnabled(false);
}

const DEFAULT_CENTER = { latitude: 6.5200, longitude: 3.3850 };
const TARGET_PARTICIPANTS = 5;

const ClusterPickupScreen = ({ navigation }: RootStackScreenProps<'ClusterPickup'>) => {
  const [location, setLocation] = useState<{ latitude: number; longitude: number }>(DEFAULT_CENTER);
  const [participants, setParticipants] = useState<ClusterParticipant[]>([]);
  const [joinedCount, setJoinedCount] = useState(3);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.08,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [pulse]);

  useEffect(() => {
    const requestLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setParticipants(generateClusterSimulation(DEFAULT_CENTER.latitude, DEFAULT_CENTER.longitude));
          return;
        }

        const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
        const coords = current.coords;
        setLocation({ latitude: coords.latitude, longitude: coords.longitude });
        setParticipants(generateClusterSimulation(coords.latitude, coords.longitude));
      } catch (_error) {
        setParticipants(generateClusterSimulation(DEFAULT_CENTER.latitude, DEFAULT_CENTER.longitude));
      } finally {
        setLoadingLocation(false);
      }
    };

    requestLocation();
  }, []);

  const remainingCount = Math.max(0, TARGET_PARTICIPANTS - joinedCount);
  const progress = Math.min(100, (joinedCount / TARGET_PARTICIPANTS) * 100);

  const markerAnnotations = useMemo(
    () =>
      participants.map((participant) => (
        <MapboxGL.PointAnnotation
          key={participant.id}
          id={participant.id}
          coordinate={[participant.longitude, participant.latitude]}
        >
          <View className="w-10 h-10 rounded-full bg-emerald-500/90 items-center justify-center border-2 border-white shadow-lg">
            <Text className="text-white text-[10px] font-bold">{participant.id}</Text>
          </View>
        </MapboxGL.PointAnnotation>
      )),
    [participants],
  );

  return (
    <SafeAreaView className="flex-1 bg-background-page">
      <StatusBar barStyle="light-content" />
      <View className="bg-ventureroot-green pt-12 pb-6 px-4">
        <View className="flex-row items-center mb-4">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
            <ChevronLeft color="white" size={24} />
          </TouchableOpacity>
          <View>
            <Text className="text-white/70 text-xs uppercase tracking-wider">Cluster Pickup</Text>
            <Text className="text-white text-2xl font-bold">Live Neighborhood Map</Text>
          </View>
        </View>
        <View className="rounded-3xl bg-white/10 p-4 border border-white/15">
          <Text className="text-white font-bold text-sm">Status</Text>
          <Text className="text-white/80 text-[11px] mt-1">
            {joinedCount}/{TARGET_PARTICIPANTS} neighbors joined • {remainingCount} more to unlock 40% discount
          </Text>
        </View>
      </View>

      <View className="flex-1">
        <View className="h-72 bg-slate-900 overflow-hidden">
          {loadingLocation ? (
            <View className="flex-1 items-center justify-center bg-slate-900">
              <ActivityIndicator color={colors.status.success} size="large" />
            </View>
          ) : MapboxGL ? (
            <MapboxGL.MapView
              style={{ flex: 1 }}
              styleURL={MapboxGL.StyleURL.Street}
              logoEnabled={false}
              compassEnabled={true}
              zoomEnabled={true}
            >
              <MapboxGL.Camera
                animationMode="flyTo"
                animationDuration={1000}
                centerCoordinate={[location.longitude, location.latitude]}
                zoomLevel={12}
              />
              <MapboxGL.UserLocation visible={true} />
              {markerAnnotations}
              <MapboxGL.PointAnnotation
                key="cluster-center"
                id="cluster-center"
                coordinate={[location.longitude, location.latitude]}
              >
                <Animated.View
                  style={{
                    transform: [{ scale: pulse }],
                  }}
                  className="w-16 h-16 rounded-full border-2 border-emerald-300/70 items-center justify-center bg-emerald-500/20"
                >
                  <View className="w-10 h-10 rounded-full bg-emerald-500 items-center justify-center">
                    <MapPin size={18} color="white" />
                  </View>
                </Animated.View>
              </MapboxGL.PointAnnotation>
            </MapboxGL.MapView>
          ) : (
            <View className="flex-1 items-center justify-center bg-slate-800">
              <View className="items-center">
                <MapPin size={48} color={colors.status.success} />
                <Text className="text-white text-lg font-bold mt-4">Map Preview</Text>
                <Text className="text-white/70 text-center text-sm mt-2 px-4">
                  Interactive map requires development build.{'\n'}Using Expo Go for testing.
                </Text>
                <View className="mt-4 bg-slate-700 px-4 py-2 rounded-lg">
                  <Text className="text-white/90 text-xs">
                    📍 Location: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                  </Text>
                  <Text className="text-white/90 text-xs mt-1">
                    👥 {participants.length} participants nearby
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>

        <ScrollView className="px-4 pt-5" showsVerticalScrollIndicator={false}>
          <View className="rounded-3xl bg-white p-5 border border-gray-100 shadow-sm mb-4">
            <View className="flex-row items-center justify-between mb-4">
              <View>
                <Text className="text-gray-900 font-bold text-base">Cluster formation</Text>
                <Text className="text-gray-500 text-[11px] mt-1">Consolidated delivery point within 1 km.</Text>
              </View>
              <View className="bg-emerald-100 px-3 py-1 rounded-full">
                <Text className="text-emerald-800 text-[10px] font-bold">40% discount</Text>
              </View>
            </View>
            <View className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
              <View className="h-full bg-emerald-500 rounded-full" style={{ width: `${progress}%` as unknown as number }} />
            </View>
            <View className="flex-row items-center gap-2">
              <Users size={18} color={colors.ventureroot.green} />
              <Text className="text-gray-700 text-[12px]">{participants.length} simulated members in the cluster</Text>
            </View>
          </View>

          <View className="rounded-3xl bg-white p-5 border border-gray-100 shadow-sm mb-4">
            <Text className="text-gray-900 font-bold text-base mb-4">Live cluster animation</Text>
            <LottieView
              source={require('../../../assets/lottie/cluster.json')}
              autoPlay
              loop
              style={{ width: '100%', height: 220 }}
            />
          </View>

          <View className="rounded-3xl bg-white p-5 border border-gray-100 shadow-sm mb-6">
            <Text className="text-gray-900 font-bold text-base mb-4">Nearby contributors</Text>
            {participants.map((participant) => (
              <View key={participant.id} className="flex-row items-center justify-between mb-3">
                <View>
                  <Text className="text-gray-900 font-medium">{participant.label}</Text>
                  <Text className="text-gray-500 text-[10px]">Order {participant.orderReference}</Text>
                </View>
                <Text className="text-emerald-600 text-[10px] font-bold">
                  {participant.joined ? 'Joined' : 'Waiting'}
                </Text>
              </View>
            ))}
          </View>

          <View className="rounded-3xl bg-ventureroot-green p-5 border border-emerald-700 shadow-sm mb-10">
            <View className="flex-row items-center mb-3">
              <ShieldCheck size={20} color="white" />
              <Text className="text-white font-bold text-base ml-3">Cluster Support</Text>
            </View>
            <Text className="text-white/80 text-[12px] leading-6">
              When your neighborhood reaches {TARGET_PARTICIPANTS} verified orders, the consolidated shipment becomes eligible for our 40% discount and faster pickup coordination.
            </Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default ClusterPickupScreen;
