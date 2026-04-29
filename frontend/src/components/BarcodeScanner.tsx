import React, { useState, useCallback } from 'react';
import { View, Button, Text, StyleSheet, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

interface BarcodeScanner Props {
  onBarcodeScanned: (barcode: string) => void;
}

export default function BarcodeScanner({ onBarcodeScanned }: BarcodeScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);

  const handleCameraPermission = async () => {
    if (!permission?.granted) {
      await requestPermission();
    }
  };

  const handleBarcode = useCallback((scannedData: any) => {
    if (isScanning) return; // Prevent multiple scans
    setIsScanning(true);
    const barcode = scannedData.data;
    onBarcodeScanned(barcode);
    setTimeout(() => setIsScanning(false), 1000);
  }, [isScanning, onBarcodeScanned]);

  if (!permission) {
    return <Text>Camera permission pending...</Text>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text>Camera access required for barcode scanning</Text>
        <Button title="Grant Permission" onPress={handleCameraPermission} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        onBarcodeScanned={handleBarcode}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'qr', 'code128', 'code39'],
        }}
      />
      <Text style={styles.scannerText}>
        {isScanning ? 'Processing...' : 'Point camera at barcode'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  scannerText: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: '#fff',
    padding: 10,
  },
});
