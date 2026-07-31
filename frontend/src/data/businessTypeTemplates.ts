import type { LucideIcon } from 'lucide-react-native';
import {
  Store, Pill, Shirt, Smartphone, Hammer, Sparkles,
} from 'lucide-react-native';
import type { BusinessType } from '@/types/inventory';

export interface BusinessTypeFieldFlags {
  /** Absolute expiry date is relevant (pharmacy, sometimes provision) */
  expiry: boolean;
  /** Batch/regulatory number (nafdac_number) is relevant (pharmacy) */
  batch: boolean;
  /** Size (apparel/footwear) is relevant */
  size: boolean;
  /** IMEI (handsets) is relevant */
  imei: boolean;
}

export interface StarterCategory {
  name: string;
  icon: string;
  tint: string;
}

export interface BusinessTypeTemplate {
  id: BusinessType;
  label: string;
  Icon: LucideIcon;
  units: string[];
  fields: BusinessTypeFieldFlags;
  starterCategories: StarterCategory[];
}

export const BUSINESS_TYPE_TEMPLATES: Record<BusinessType, BusinessTypeTemplate> = {
  provision: {
    id: 'provision',
    label: 'Provision store',
    Icon: Store,
    units: ['Piece', 'Pack', 'Carton', 'Bag', 'Satchet', 'Crate'],
    fields: { expiry: true, batch: false, size: false, imei: false },
    starterCategories: [
      { name: 'Beverages', icon: 'Droplet', tint: '#2E6E9E' },
      { name: 'Dairy & drinks powder', icon: 'Coffee', tint: '#7A5AA8' },
      { name: 'Noodles & pasta', icon: 'Utensils', tint: '#B0730C' },
      { name: 'Home care', icon: 'Sparkles', tint: '#16654A' },
      { name: 'Grains & staples', icon: 'Wheat', tint: '#8A6A2F' },
      { name: 'Confectionery', icon: 'Cookie', tint: '#A32036' },
    ],
  },
  pharmacy: {
    id: 'pharmacy',
    label: 'Pharmacy',
    Icon: Pill,
    units: ['Card', 'Satchet', 'Bottle', 'Pack', 'Tube', 'Vial'],
    fields: { expiry: true, batch: true, size: false, imei: false },
    starterCategories: [
      { name: 'Antimalarials', icon: 'Bug', tint: '#16654A' },
      { name: 'Antibiotics', icon: 'FlaskConical', tint: '#2E6E9E' },
      { name: 'Analgesics', icon: 'HeartPulse', tint: '#A32036' },
      { name: 'Vitamins & supplements', icon: 'Citrus', tint: '#B0730C' },
      { name: 'Cough & cold', icon: 'Wind', tint: '#7A5AA8' },
      { name: 'Medical consumables', icon: 'Stethoscope', tint: '#5B6F76' },
    ],
  },
  boutique: {
    id: 'boutique',
    label: 'Boutique / apparel',
    Icon: Shirt,
    units: ['Piece', 'Set', 'Pack', 'Pair'],
    fields: { expiry: false, batch: false, size: true, imei: false },
    starterCategories: [
      { name: 'Menswear', icon: 'User', tint: '#0E1F26' },
      { name: 'Womenswear', icon: 'Users', tint: '#A32036' },
      { name: 'Children', icon: 'Baby', tint: '#B0730C' },
      { name: 'Footwear', icon: 'Footprints', tint: '#16654A' },
      { name: 'Bags', icon: 'Briefcase', tint: '#7A5AA8' },
      { name: 'Accessories', icon: 'Glasses', tint: '#2E6E9E' },
    ],
  },
  phones: {
    id: 'phones',
    label: 'Phone & accessories',
    Icon: Smartphone,
    units: ['Piece', 'Pack', 'Carton'],
    fields: { expiry: false, batch: false, size: false, imei: true },
    starterCategories: [
      { name: 'Handsets', icon: 'Smartphone', tint: '#0E1F26' },
      { name: 'Charging', icon: 'Cable', tint: '#B0730C' },
      { name: 'Audio', icon: 'Headphones', tint: '#7A5AA8' },
      { name: 'Protection', icon: 'Shield', tint: '#2E6E9E' },
      { name: 'Power banks', icon: 'Battery', tint: '#16654A' },
      { name: 'Cases & pouches', icon: 'Box', tint: '#5B6F76' },
    ],
  },
  building: {
    id: 'building',
    label: 'Building materials',
    Icon: Hammer,
    units: ['Bag', 'Length', 'Bucket', 'Roll', 'Carton', 'Piece'],
    fields: { expiry: false, batch: false, size: true, imei: false },
    starterCategories: [
      { name: 'Cement & binders', icon: 'Building2', tint: '#5B6F76' },
      { name: 'Reinforcement', icon: 'Ruler', tint: '#0E1F26' },
      { name: 'Paints & finishes', icon: 'Paintbrush', tint: '#A32036' },
      { name: 'Fasteners', icon: 'Wrench', tint: '#B0730C' },
      { name: 'Plumbing', icon: 'Waves', tint: '#2E6E9E' },
      { name: 'Tiling', icon: 'LayoutGrid', tint: '#16654A' },
    ],
  },
  custom: {
    id: 'custom',
    label: 'Other business',
    Icon: Sparkles,
    units: ['Piece', 'Pack', 'Carton'],
    fields: { expiry: false, batch: false, size: false, imei: false },
    starterCategories: [],
  },
};

export const BUSINESS_TYPE_LIST = Object.values(BUSINESS_TYPE_TEMPLATES);

export function getBusinessTypeTemplate(businessType?: string | null): BusinessTypeTemplate {
  if (businessType && businessType in BUSINESS_TYPE_TEMPLATES) {
    return BUSINESS_TYPE_TEMPLATES[businessType as BusinessType];
  }
  return BUSINESS_TYPE_TEMPLATES.custom;
}
