import { Store, User, Package, Factory, Truck, Wrench, Briefcase } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

export type AccountTypeId =
  | 'retail'
  | 'nine_to_five'
  | 'personal'
  | 'distributor'
  | 'manufactural'
  | 'logistics'
  | 'artisan';

export interface AccountTypeConfig {
  id: AccountTypeId;
  label: string;
  tagline: string;
  icon: LucideIcon;
  description: string;
}

export const ALL_ACCOUNT_TYPES: AccountTypeConfig[] = [
  { id: 'retail', label: 'Business Owner', tagline: 'BUSINESS_OWNER', icon: Store, description: 'Small business, shop, or market trader' },
  { id: 'nine_to_five', label: '9-5 Worker', tagline: 'WORKER_PROTOCOL', icon: Briefcase, description: 'Salaried employee looking to invest' },
  { id: 'personal', label: 'Personal', tagline: 'PERSONAL_PROTOCOL', icon: User, description: 'Individual financial identifiers' },
  { id: 'distributor', label: 'Distributor', tagline: 'DISTRIBUTOR', icon: Package, description: 'Wholesale supplier to businesses' },
  { id: 'manufactural', label: 'Manufacturer', tagline: 'PRODUCTION_UNIT', icon: Factory, description: 'Manufacturing and assembly assets' },
  { id: 'logistics', label: 'Logistics and Transport', tagline: 'LOGISTICS_NODE', icon: Truck, description: 'Delivery and fleet operations' },
  { id: 'artisan', label: 'Artisan', tagline: 'ARTISAN_PROTOCOL', icon: Wrench, description: 'Specialized technical services' },
];

// 'logistics' is defined but disabled: onboarding collects data into
// LogisticsPartnerProfile and a full transport/booking system already
// exists (app/api/v1/endpoints/transport.py), but there's no dashboard
// surfacing any of it yet — re-enable once that's built.
export const ENABLED_ACCOUNT_TYPES: AccountTypeId[] = ['retail', 'nine_to_five', 'distributor'];

export function getEnabledTypes(): AccountTypeConfig[] {
  return ALL_ACCOUNT_TYPES.filter((t) => ENABLED_ACCOUNT_TYPES.includes(t.id));
}

export function getTypeConfig(id: AccountTypeId): AccountTypeConfig | undefined {
  return ALL_ACCOUNT_TYPES.find((t) => t.id === id);
}

export function isEnabledType(id: string): id is AccountTypeId {
  return ENABLED_ACCOUNT_TYPES.includes(id as AccountTypeId);
}
