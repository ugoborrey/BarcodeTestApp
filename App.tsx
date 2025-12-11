import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import {
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
import { Camera as BarcodeCamera } from 'react-native-vision-camera-barcodes-scanner';

type Barcode = {
  rawValue: string;
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
};

function App() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const [scannedCodes, setScannedCodes] = useState<Barcode[]>([]);
  const device = useCameraDevice('back');

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  const handleBarcodeScanned = (barcodes: Barcode[]) => {
    if (barcodes.length > 0) {
      setScannedCodes(barcodes);
    }
  };

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Permission caméra requise</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Autoriser la caméra</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Aucune caméra disponible</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <BarcodeCamera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        callback={handleBarcodeScanned}
        options={['qr', 'ean_13', 'ean_8', 'code_128', 'code_39']}
      />
      <View style={styles.overlay}>
        <Text style={styles.title}>Scanner de codes-barres</Text>
        {scannedCodes.length > 0 && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultTitle}>Code scanné :</Text>
            {scannedCodes.map((code, index) => (
              <Text key={index} style={styles.resultText}>
                {code.rawValue}
              </Text>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  overlay: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  resultContainer: {
    marginTop: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 15,
    borderRadius: 10,
  },
  resultTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  resultText: {
    color: '#00FF00',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default App;
