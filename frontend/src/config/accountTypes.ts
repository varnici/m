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
  { id: 'retail', label: 'Retail Business Owner', tagline: 'RETAIL_OPERATOR', icon: Store, description: 'Storefronts and traditional trade nodes' },
  { id: 'nine_to_five', label: '9-5 Worker', tagline: 'WORKER_PROTOCOL', icon: Briefcase, description: 'Salaried income and smart investing' },
  { id: 'personal', label: 'Personal', tagline: 'PERSONAL_PROTOCOL', icon: User, description: 'Individual financial identifiers' },
  { id: 'distributor', label: 'Distributor', tagline: 'MINI_DISTRIBUTOR', icon: Package, description: 'Supply chain relay nodes' },
  { id: 'manufactural', label: 'Manufacturer', tagline: 'PRODUCTION_UNIT', icon: Factory, description: 'Manufacturing and assembly assets' },
  { id: 'logistics', label: 'Logistics / Transportation', tagline: 'LOGISTICS_NODE', icon: Truck, description: 'Transit and fleet operations' },
  { id: 'artisan', label: 'Artisan', tagline: 'ARTISAN_PROTOCOL', icon: Wrench, description: 'Specialized technical services' },
];

export const ENABLED_ACCOUNT_TYPES: AccountTypeId[] = ['retail', 'nine_to_five'];

export function getEnabledTypes(): AccountTypeConfig[] {
  return ALL_ACCOUNT_TYPES.filter((t) => ENABLED_ACCOUNT_TYPES.includes(t.id));
}

export function getTypeConfig(id: AccountTypeId): AccountTypeConfig | undefined {
  return ALL_ACCOUNT_TYPES.find((t) => t.id === id);
}

export function isEnabledType(id: string): id is AccountTypeId {
  return ENABLED_ACCOUNT_TYPES.includes(id as AccountTypeId);
}
