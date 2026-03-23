import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect } from '@react-navigation/native';

export default function Scanner({ onScan }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [isActive, setIsActive] = useState(true);

  // Mantiene la cámara viva solo cuando la pantalla está enfocada
  useFocusEffect(
    useCallback(() => {
      setIsActive(true);
      return () => setIsActive(false);
    }, [])
  );

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Se requiere permiso de cámara</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Activar Cámara</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarcodeScanned = ({ data }) => {
    if (scanned || !isActive) return;
    setScanned(true);
    onScan(data.trim());
    setTimeout(() => setScanned(false), 2000);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.cameraWrapper, scanned && styles.scannedBorder]}>
        {isActive && (
          <CameraView
            style={styles.camera}
            facing="back"
            onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ['ean13', 'ean8', 'qr', 'upc_a', 'upc_e'],
            }}
          />
        )}
        {scanned && (
          <View style={styles.overlay}>
            <View style={styles.badge}><Text style={styles.verifiedText}>OK</Text></View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    backgroundColor: '#020617',
    alignItems: 'center',
  },
  cameraWrapper: {
    width: '100%',
    height: 140,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#1e293b',
    backgroundColor: '#000',
  },
  scannedBorder: {
    borderColor: '#22c55e',
  },
  camera: {
    flex: 1,
  },
  text: { color: '#64748b', marginBottom: 8, fontSize: 12 },
  btn: { backgroundColor: '#4f46e5', padding: 8, borderRadius: 8 },
  btnText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: '#16a34a',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  verifiedText: { color: '#fff', fontWeight: '900', fontSize: 14 },
});
