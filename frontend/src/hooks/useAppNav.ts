import { useCallback } from 'react';
import { useAppNavigationStore } from '@/store/appNavigationStore';
import type { RootStackParamList } from '@/navigation/types';

type RouteName = keyof RootStackParamList;

export function useAppNav() {
  const navigateTo = useAppNavigationStore((s) => s.navigateTo);
  const storeGoBack = useAppNavigationStore((s) => s.goBack);
  const resetTo = useAppNavigationStore((s) => s.resetTo);
  const currentRoute = useAppNavigationStore((s) => s.currentRoute);
  const canGoBack = useAppNavigationStore((s) => s.canGoBack);

  const goTo = useCallback(
    (route: RouteName, params?: any) => {
      navigateTo(route, params);
    },
    [navigateTo],
  );

  const goBack = useCallback(() => {
    storeGoBack();
  }, [storeGoBack]);

  return {
    goTo,
    goBack,
    resetTo,
    currentRoute,
    canGoBack,
  };
}
