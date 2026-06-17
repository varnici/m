import MainTabNavigator from '@/navigation/MainTabNavigator';
import WorkerTabNavigator from '@/navigation/WorkerTabNavigator';
import ComingSoonScreen from '@/screens/ComingSoonScreen';

// Mirror the resolveMainScreen logic from RootNavigator
function resolveMainScreen(accountType: string | null) {
  switch (accountType) {
    case 'retail':
      return MainTabNavigator;
    case 'nine_to_five':
      return WorkerTabNavigator;
    default:
      return ComingSoonScreen;
  }
}

describe('navigation routing by account type', () => {
  it('retail users get MainTabNavigator', () => {
    expect(resolveMainScreen('retail')).toBe(MainTabNavigator);
  });

  it('nine_to_five users get WorkerTabNavigator', () => {
    expect(resolveMainScreen('nine_to_five')).toBe(WorkerTabNavigator);
  });

  it('null account type gets ComingSoonScreen', () => {
    expect(resolveMainScreen(null)).toBe(ComingSoonScreen);
  });

  it('deferred types get ComingSoonScreen', () => {
    expect(resolveMainScreen('distributor')).toBe(ComingSoonScreen);
    expect(resolveMainScreen('personal')).toBe(ComingSoonScreen);
    expect(resolveMainScreen('manufactural')).toBe(ComingSoonScreen);
    expect(resolveMainScreen('logistics')).toBe(ComingSoonScreen);
    expect(resolveMainScreen('artisan')).toBe(ComingSoonScreen);
  });

  it('unknown types get ComingSoonScreen', () => {
    expect(resolveMainScreen('unknown_type')).toBe(ComingSoonScreen);
  });
});
