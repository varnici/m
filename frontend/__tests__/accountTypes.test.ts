import {
  ALL_ACCOUNT_TYPES,
  ENABLED_ACCOUNT_TYPES,
  getEnabledTypes,
  getTypeConfig,
  isEnabledType,
} from '@/config/accountTypes';

describe('accountTypes config', () => {
  it('should have all 7 account types defined', () => {
    expect(ALL_ACCOUNT_TYPES).toHaveLength(7);
  });

  it('should only enable retail and nine_to_five for launch', () => {
    expect(ENABLED_ACCOUNT_TYPES).toEqual(['retail', 'nine_to_five']);
  });

  it('getEnabledTypes returns only enabled configs', () => {
    const enabled = getEnabledTypes();
    expect(enabled).toHaveLength(2);
    expect(enabled.map((t) => t.id)).toEqual(['retail', 'nine_to_five']);
  });

  it('getTypeConfig returns config for valid type', () => {
    const config = getTypeConfig('retail');
    expect(config).toBeDefined();
    expect(config?.label).toBe('Retail Business Owner');
  });

  it('getTypeConfig returns undefined for invalid type', () => {
    expect(getTypeConfig('unknown' as any)).toBeUndefined();
  });

  it('isEnabledType correctly identifies enabled types', () => {
    expect(isEnabledType('retail')).toBe(true);
    expect(isEnabledType('nine_to_five')).toBe(true);
    expect(isEnabledType('distributor')).toBe(false);
    expect(isEnabledType('personal')).toBe(false);
    expect(isEnabledType('artisan')).toBe(false);
  });

  it('every enabled type has an icon, label, and description', () => {
    for (const type of getEnabledTypes()) {
      expect(type.icon).toBeDefined();
      expect(type.label.length).toBeGreaterThan(0);
      expect(type.description.length).toBeGreaterThan(0);
    }
  });

  it('deferred types are still in ALL_ACCOUNT_TYPES', () => {
    const allIds = ALL_ACCOUNT_TYPES.map((t) => t.id);
    expect(allIds).toContain('distributor');
    expect(allIds).toContain('personal');
    expect(allIds).toContain('manufactural');
    expect(allIds).toContain('logistics');
    expect(allIds).toContain('artisan');
  });
});
