import React from 'react';
import type { RootStackScreenProps } from '@/navigation/types';
import { StockMovementScreen } from './StockMovementScreen';

const IssueStockScreen = ({ navigation, route }: RootStackScreenProps<'IssueStock'>) => (
  <StockMovementScreen
    direction="out"
    storeIdOverride={route.params?.storeId}
    onDone={() => navigation.goBack()}
  />
);

export default IssueStockScreen;
