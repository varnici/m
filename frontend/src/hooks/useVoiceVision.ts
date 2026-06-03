/**
 * Voice & Vision Hooks
 * Handles unstructured input processing (Audio & Camera).
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryService } from '@/services/inventoryService';
import Toast from 'react-native-toast-message';
import { inventoryKeys } from './inventoryKeys';

/**
 * useProcessVoiceInput - Process voice input mutation
 */
export function useProcessVoiceInput() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      audioBase64,
      storeId,
    }: {
      audioBase64: string;
      storeId: string;
    }) =>
      inventoryService.processVoiceInput(audioBase64, storeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.stock() });
      queryClient.invalidateQueries({
        queryKey: inventoryKeys.products(),
      });
      Toast.show({
        type: 'success',
        text1: 'Voice Input Processed',
      });
    },
    onError: (error: Error) => {
      Toast.show({
        type: 'error',
        text1: 'Failed to Process Voice',
        text2: error.message,
      });
    },
  });
}

/**
 * useScanBarcode - Barcode scanning mutation
 */
export function useScanBarcode() {
  return useMutation({
    mutationFn: ({
      barcodeData,
      storeId,
    }: {
      barcodeData: string;
      storeId: string;
    }) =>
      inventoryService.scanBarcode(barcodeData, storeId),
    onError: (error: Error) => {
      Toast.show({
        type: 'error',
        text1: 'Barcode Scan Failed',
        text2: error.message,
      });
    },
  });
}

/**
 * useProcessCVScan - Computer vision scan mutation
 */
export function useProcessCVScan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      imageBase64,
      storeId,
    }: {
      imageBase64: string;
      storeId: string;
    }) =>
      inventoryService.processCVScan(imageBase64, storeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.stock() });
      Toast.show({
        type: 'success',
        text1: 'Shelf Scan Processed',
      });
    },
    onError: (error: Error) => {
      Toast.show({
        type: 'error',
        text1: 'CV Scan Failed',
        text2: error.message,
      });
    },
  });
}
