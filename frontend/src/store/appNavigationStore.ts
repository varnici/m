import { create } from 'zustand';
import { createRef } from 'react';
import type { NavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from '@/navigation/types';

type RouteName = keyof RootStackParamList;

export const navigationRef = createRef<NavigationContainerRef<RootStackParamList>>();

interface AppNavigationState {
  currentRoute: string | null;
  previousRoute: string | null;
  history: string[];
  canGoBack: boolean;

  setCurrentRoute: (route: string) => void;
  navigateTo: (route: RouteName, params?: any) => void;
  goBack: () => void;
  resetTo: (route: RouteName) => void;
}

export const useAppNavigationStore = create<AppNavigationState>()((set, get) => ({
  currentRoute: null,
  previousRoute: null,
  history: [],
  canGoBack: false,

  setCurrentRoute: (route) =>
    set((state) => ({
      previousRoute: state.currentRoute,
      currentRoute: route,
      history: [...state.history.slice(-19), route],
      canGoBack: navigationRef.current?.canGoBack() ?? false,
    })),

  navigateTo: (route, params) => {
    const nav = navigationRef.current;
    if (!nav) return;
    nav.navigate(route as any, params);
  },

  goBack: () => {
    const nav = navigationRef.current;
    if (!nav) return;
    if (nav.canGoBack()) {
      nav.goBack();
    }
  },

  resetTo: (route) => {
    const nav = navigationRef.current;
    if (!nav) return;
    nav.reset({ index: 0, routes: [{ name: route as any }] });
  },
}));
