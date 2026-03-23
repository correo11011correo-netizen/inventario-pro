import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function Scanner({ onScan }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Necesitamos permiso para usar la cámara</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Conceder Permiso</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarcodeScanned = ({ type, data }) => {
    if (scanned) return;
    setScanned(true);
    onScan(data);
    
    // Auto-resume after 2 seconds
    setTimeout(() => {
      setScanned(false);
    }, 2000);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.cameraWrapper, scanned && styles.scannedBorder]}>
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['ean13', 'ean8', 'qr', 'upc_a', 'upc_e'],
          }}
        />
        {scanned && (
          <View style={styles.overlay}>
            <Text style={styles.verifiedText}>VERIFICADO</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraWrapper: {
    width: '100%',
    height: 150,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#1e293b',
    position: 'relative',
  },
  scannedBorder: {
    borderColor: '#22c55e',
  },
  camera: {
    flex: 1,
  },
  text: {
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  btn: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(34, 197, 94, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedText: {
    backgroundColor: '#16a34a',
    color: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 2,
  },
});
