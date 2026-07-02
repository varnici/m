import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { MapPin, ChevronDown, Check } from 'lucide-react-native';
import OnboardingShell, { OnboardingButton, OnboardingInput } from '@/components/onboarding/OnboardingShell';
import { useOnboardingNav } from '@/hooks/useOnboardingNav';
import { colors } from '@/theme/colors';
import * as Location from 'expo-location';

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
  'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
  'FCT', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi',
  'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun',
  'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
];

const LGA_MAP: Record<string, string[]> = {
  Lagos: ['Agege', 'Ajeromi-Ifelodun', 'Alimosho', 'Amuwo-Odofin', 'Apapa', 'Badagry', 'Epe', 'Eti-Osa', 'Ibeju-Lekki', 'Ifako-Ijaiye', 'Ikeja', 'Ikorodu', 'Kosofe', 'Lagos Island', 'Lagos Mainland', 'Mushin', 'Ojo', 'Oshodi-Isolo', 'Shomolu', 'Surulere'],
  FCT: ['Abaji', 'Bwari', 'Gwagwalada', 'Kuje', 'Kwali', 'Municipal Area Council'],
  Kano: ['Dala', 'Fagge', 'Gwale', 'Kano Municipal', 'Nassarawa', 'Tarauni', 'Ungogo'],
  Rivers: ['Obio-Akpor', 'Port Harcourt', 'Eleme', 'Ikwerre', 'Oyigbo'],
  Ogun: ['Abeokuta North', 'Abeokuta South', 'Ado-Odo/Ota', 'Ifo', 'Sagamu'],
};

const PRODUCT_CATEGORIES = [
  'FMCG',
  'Textiles',
  'Electronics',
  'Pharmaceuticals',
  'Agriculture',
  'Building Materials',
  'Cosmetics',
  'Food & Beverage',
  'Stationery',
  'Auto Parts',
];

type CategoryDetail = {
  monthlyVolume: string;
  keyBrands: string;
  retailClients: string;
};

export default function DistributorOperationsScreen() {
  const { goNext, goBack, step, total } = useOnboardingNav();
  const { width } = useWindowDimensions();
  const hp = Math.max(20, width * 0.06);

  // Warehouse address
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [lga, setLga] = useState('');
  const [stateOpen, setStateOpen] = useState(false);
  const [lgaOpen, setLgaOpen] = useState(false);
  const [capturingGPS, setCapturingGPS] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Product categories
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categoryDetails, setCategoryDetails] = useState<Record<string, CategoryDetail>>({});

  const availableLGAs = state ? (LGA_MAP[state] || ['Please enter LGA manually']) : [];

  const toggleCategory = useCallback((cat: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(cat)) {
        const next = prev.filter((c) => c !== cat);
        setCategoryDetails((d) => {
          const copy = { ...d };
          delete copy[cat];
          return copy;
        });
        return next;
      }
      setCategoryDetails((d) => ({
        ...d,
        [cat]: { monthlyVolume: '', keyBrands: '', retailClients: '' },
      }));
      return [...prev, cat];
    });
  }, []);

  const updateCategoryDetail = (cat: string, field: keyof CategoryDetail, value: string) => {
    setCategoryDetails((prev) => ({
      ...prev,
      [cat]: { ...prev[cat], [field]: value },
    }));
  };

  const handleCaptureGPS = async () => {
    setCapturingGPS(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Location access is required to record your warehouse coordinates.');
      setCapturingGPS(false);
      return;
    }
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setGpsCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    } catch {
      Alert.alert('Error', 'Could not capture location. Please try again.');
    }
    setCapturingGPS(false);
  };

  const isAddressValid = street.trim().length > 0 && city.trim().length > 0 && state.length > 0 && lga.length > 0;
  const hasCategoryDetails = selectedCategories.length > 0 && selectedCategories.every((cat) => {
    const d = categoryDetails[cat];
    return d && d.monthlyVolume.trim().length > 0 && d.keyBrands.trim().length > 0 && d.retailClients.trim().length > 0;
  });
  const isFormValid = isAddressValid && hasCategoryDetails;

  return (
    <OnboardingShell
      currentStep={step}
      totalSteps={total}
      title="Operations Details"
      subtitle="Tell us about your warehouse location and the product categories you distribute."
      onBack={goBack}
      footer={
        <OnboardingButton
          title="Continue"
          onPress={() => goNext({ warehouseAddress: { street, city, state, lga }, gpsCoords, selectedCategories, categoryDetails })}
          disabled={!isFormValid}
        />
      }
    >
      {/* Warehouse Address Section */}
      <Text style={styles.sectionTitle}>WAREHOUSE ADDRESS</Text>

      <OnboardingInput
        label="STREET ADDRESS"
        value={street}
        onChangeText={setStreet}
        placeholder="e.g. 12 Industrial Avenue, Apapa"
      />

      <OnboardingInput
        label="CITY"
        value={city}
        onChangeText={setCity}
        placeholder="e.g. Lagos"
      />

      {/* State Dropdown */}
      <View style={styles.fieldWrap}>
        <Text style={styles.label}>STATE</Text>
        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => { setStateOpen(!stateOpen); setLgaOpen(false); }}
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          <Text style={state ? styles.dropdownText : styles.dropdownPlaceholder}>
            {state || 'Select state'}
          </Text>
          <ChevronDown size={18} color="#94A3B8" />
        </TouchableOpacity>
        {stateOpen && (
          <View style={styles.dropdownList}>
            {NIGERIAN_STATES.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.dropdownItem, state === s && styles.dropdownItemActive]}
                onPress={() => {
                  setState(s);
                  setLga('');
                  setStateOpen(false);
                }}
              >
                <Text style={[styles.dropdownItemText, state === s && styles.dropdownItemTextActive]}>
                  {s}
                </Text>
                {state === s && <Check size={16} color={colors.ventureroot.green} />}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* LGA Dropdown */}
      <View style={styles.fieldWrap}>
        <Text style={styles.label}>LOCAL GOVERNMENT AREA (LGA)</Text>
        {state && availableLGAs.length > 0 && availableLGAs[0] !== 'Please enter LGA manually' ? (
          <>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => { setLgaOpen(!lgaOpen); setStateOpen(false); }}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <Text style={lga ? styles.dropdownText : styles.dropdownPlaceholder}>
                {lga || 'Select LGA'}
              </Text>
              <ChevronDown size={18} color="#94A3B8" />
            </TouchableOpacity>
            {lgaOpen && (
              <View style={styles.dropdownList}>
                {availableLGAs.map((l) => (
                  <TouchableOpacity
                    key={l}
                    style={[styles.dropdownItem, lga === l && styles.dropdownItemActive]}
                    onPress={() => {
                      setLga(l);
                      setLgaOpen(false);
                    }}
                  >
                    <Text style={[styles.dropdownItemText, lga === l && styles.dropdownItemTextActive]}>
                      {l}
                    </Text>
                    {lga === l && <Check size={16} color={colors.ventureroot.green} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        ) : (
          <OnboardingInput
            label=""
            value={lga}
            onChangeText={setLga}
            placeholder={state ? 'Type your LGA' : 'Select a state first'}
          />
        )}
      </View>

      {/* GPS Capture */}
      <View style={{ marginBottom: 20 }}>
        <TouchableOpacity
          style={styles.gpsButton}
          onPress={handleCaptureGPS}
          disabled={capturingGPS}
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          {capturingGPS ? (
            <ActivityIndicator size="small" color={colors.ventureroot.green} />
          ) : (
            <MapPin size={18} color={colors.ventureroot.green} />
          )}
          <Text style={styles.gpsButtonText}>
            {gpsCoords
              ? `GPS Captured (${gpsCoords.lat.toFixed(4)}, ${gpsCoords.lng.toFixed(4)})`
              : capturingGPS
              ? 'Capturing location...'
              : 'Capture GPS Coordinates'}
          </Text>
        </TouchableOpacity>
        {!gpsCoords && (
          <Text style={styles.gpsHelper}>
            GPS coordinates help verify your warehouse location
          </Text>
        )}
      </View>

      {/* Product Categories */}
      <Text style={[styles.sectionTitle, { marginTop: 8 }]}>PRODUCT CATEGORIES</Text>
      <Text style={styles.sectionSubtitle}>
        Select all categories you distribute. For each, provide supply details.
      </Text>

      <View className="flex-row flex-wrap" style={{ marginBottom: 16 }}>
        {PRODUCT_CATEGORIES.map((cat) => {
          const selected = selectedCategories.includes(cat);
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryChip, selected && styles.categoryChipActive]}
              onPress={() => toggleCategory(cat)}
              activeOpacity={0.7}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
            >
              {selected && <Check size={14} color="#FFFFFF" style={{ marginRight: 4 }} />}
              <Text style={[styles.categoryChipText, selected && styles.categoryChipTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Category Details */}
      {selectedCategories.map((cat) => (
        <View key={cat} style={styles.categoryDetailCard}>
          <Text style={styles.categoryDetailTitle}>{cat}</Text>

          <View style={styles.categoryField}>
            <Text style={styles.categoryFieldLabel}>Monthly Supply Volume</Text>
            <TextInput
              style={styles.categoryInput}
              value={categoryDetails[cat]?.monthlyVolume || ''}
              onChangeText={(v) => updateCategoryDetail(cat, 'monthlyVolume', v)}
              placeholder="e.g. 500 units or N2,000,000"
              placeholderTextColor="#94A3B8"
            />
          </View>

          <View style={styles.categoryField}>
            <Text style={styles.categoryFieldLabel}>Key Brands</Text>
            <TextInput
              style={styles.categoryInput}
              value={categoryDetails[cat]?.keyBrands || ''}
              onChangeText={(v) => updateCategoryDetail(cat, 'keyBrands', v)}
              placeholder="e.g. Nestle, Unilever, Dangote"
              placeholderTextColor="#94A3B8"
            />
          </View>

          <View style={[styles.categoryField, { marginBottom: 0 }]}>
            <Text style={styles.categoryFieldLabel}>Number of Retail Clients</Text>
            <TextInput
              style={styles.categoryInput}
              value={categoryDetails[cat]?.retailClients || ''}
              onChangeText={(v) => updateCategoryDetail(cat, 'retailClients', v.replace(/\D/g, ''))}
              placeholder="e.g. 150"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
            />
          </View>
        </View>
      ))}
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 1,
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  fieldWrap: {
    marginBottom: 16,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dropdownText: {
    fontSize: 15,
    color: '#0F172A',
  },
  dropdownPlaceholder: {
    fontSize: 15,
    color: '#94A3B8',
  },
  dropdownList: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    marginTop: 4,
    maxHeight: 200,
    overflow: 'scroll',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownItemActive: {
    backgroundColor: '#F0FDF4',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#334155',
  },
  dropdownItemTextActive: {
    color: '#004D2C',
    fontWeight: '700',
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    paddingVertical: 14,
    minHeight: 48,
  },
  gpsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#004D2C',
    marginLeft: 8,
  },
  gpsHelper: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
    lineHeight: 16,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginRight: 8,
    marginBottom: 8,
    minHeight: 44,
  },
  categoryChipActive: {
    backgroundColor: '#004D2C',
    borderColor: '#004D2C',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  categoryDetailCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  categoryDetailTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#004D2C',
    marginBottom: 12,
  },
  categoryField: {
    marginBottom: 12,
  },
  categoryFieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  categoryInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
  },
});
