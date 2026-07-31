import {
  Package, Droplet, Coffee, Utensils, Sparkles, Wheat, Cookie, Bug,
  FlaskConical, HeartPulse, Citrus, Wind, Stethoscope, User, Users, Baby,
  Footprints, Briefcase, Glasses, Smartphone, Cable, Headphones, Shield,
  Battery, Box, Building2, Ruler, Paintbrush, Wrench, Waves, LayoutGrid,
  type LucideIcon,
} from 'lucide-react-native';

/**
 * Symbolic icon keys stored on Category.icon — mapped to components here
 * rather than persisting a component reference, so the icon renders
 * consistently regardless of which screen reads the category.
 */
export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  Package, Droplet, Coffee, Utensils, Sparkles, Wheat, Cookie, Bug,
  FlaskConical, HeartPulse, Citrus, Wind, Stethoscope, User, Users, Baby,
  Footprints, Briefcase, Glasses, Smartphone, Cable, Headphones, Shield,
  Battery, Box, Building2, Ruler, Paintbrush, Wrench, Waves, LayoutGrid,
};

export const CATEGORY_ICON_CHOICES = Object.keys(CATEGORY_ICON_MAP);

export const CATEGORY_TINTS = [
  '#0E1F26', '#2E6E9E', '#16654A', '#B0730C', '#A32036',
  '#7A5AA8', '#8A6A2F', '#5B6F76',
];

export const DEFAULT_CATEGORY_ICON = 'Package';
export const DEFAULT_CATEGORY_TINT = '#2E6E9E';

export function getCategoryIconComponent(iconKey?: string | null): LucideIcon {
  if (iconKey && CATEGORY_ICON_MAP[iconKey]) return CATEGORY_ICON_MAP[iconKey];
  return Package;
}
