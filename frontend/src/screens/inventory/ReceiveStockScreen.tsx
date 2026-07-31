import React from 'react';
import type { RootStackScreenProps } from '@/navigation/types';
import { StockMovementScreen } from './StockMovementScreen';

const ReceiveStockScreen = ({ navigation, route }: RootStackScreenProps<'ReceiveStock'>) => (
  <StockMovementScreen
    direction="in"
    storeIdOverride={route.params?.storeId}
    onDone={() => navigation.goBack()}
  />
);

export default ReceiveStockScreen;
