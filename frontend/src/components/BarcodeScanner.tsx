import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

interface BarcodeScannerProps {
  onBarcodeScanned: (barcode: string) => void;
}

export default function BarcodeScanner({ onBarcodeScanned }: BarcodeScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);

  const handleBarcode = useCallback(
    (scannedData: { data?: string }) => {
      if (isScanning || !scannedData?.data) return;
      setIsScanning(true);
      onBarcodeScanned(scannedData.data);
      setTimeout(() => setIsScanning(false), 900);
    },
    [isScanning, onBarcodeScanned]
  );

  if (!permission) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>Checking camera…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>Camera access is needed to scan products</Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Allow camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        onBarcodeScanned={handleBarcode}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'qr', 'code128', 'code39', 'upc_a'],
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#0f172a',
  },
  message: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  permissionBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  permissionBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
});
