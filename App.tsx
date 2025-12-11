import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  StatusBar,
  TouchableOpacity,
} from 'react-native';

// Types pour les métriques de performance
type DetectionMetrics = {
  firstDetectionTime: number | null; // Temps jusqu'à première détection (ms)
  lastDetectionTime: number | null; // Timestamp de la dernière détection
  detectionLatency: number | null; // Latence pour détecter un nouveau code (ms)
  scanCount: number; // Nombre total de scans
  fps: number; // Fréquence de détection (scans/seconde)
};
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

  // États pour les métriques de performance
  const [metrics, setMetrics] = useState<DetectionMetrics>({
    firstDetectionTime: null,
    lastDetectionTime: null,
    detectionLatency: null,
    scanCount: 0,
    fps: 0,
  });

  // Refs pour le tracking sans re-render
  const cameraStartTime = useRef<number | null>(null);
  const lastCodeValue = useRef<string | null>(null);
  const newCodeStartTime = useRef<number | null>(null);
  const scanTimestamps = useRef<number[]>([]);

  // Initialiser le timer quand la caméra devient active
  useEffect(() => {
    if (hasPermission && device) {
      cameraStartTime.current = Date.now();
    }
  }, [hasPermission, device]);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  // Calculer le FPS basé sur les timestamps des dernières secondes
  const calculateFPS = useCallback(() => {
    const now = Date.now();
    const oneSecondAgo = now - 1000;

    // Garder seulement les timestamps de la dernière seconde
    scanTimestamps.current = scanTimestamps.current.filter(
      ts => ts > oneSecondAgo,
    );

    return scanTimestamps.current.length;
  }, []);

  const handleBarcodeScanned = useCallback(
    (barcodes: Barcode[]) => {
      if (barcodes.length > 0) {
        const now = Date.now();
        const currentCode = barcodes[0].rawValue;

        setScannedCodes(barcodes);

        // Enregistrer le timestamp pour le calcul du FPS
        scanTimestamps.current.push(now);

        setMetrics(prev => {
          const newMetrics = { ...prev };

          // Première détection
          if (prev.firstDetectionTime === null && cameraStartTime.current) {
            newMetrics.firstDetectionTime = now - cameraStartTime.current;
          }

          // Nouveau code détecté (différent du précédent)
          if (currentCode !== lastCodeValue.current) {
            if (newCodeStartTime.current !== null) {
              // Calculer la latence pour détecter ce nouveau code
              newMetrics.detectionLatency = now - newCodeStartTime.current;
            }
            // Démarrer le timer pour le prochain nouveau code
            newCodeStartTime.current = now;
            lastCodeValue.current = currentCode;
          }

          // Mettre à jour les compteurs
          newMetrics.lastDetectionTime = now;
          newMetrics.scanCount = prev.scanCount + 1;
          newMetrics.fps = calculateFPS();

          return newMetrics;
        });
      }
    },
    [calculateFPS],
  );

  // Reset des métriques
  const resetMetrics = useCallback(() => {
    cameraStartTime.current = Date.now();
    lastCodeValue.current = null;
    newCodeStartTime.current = null;
    scanTimestamps.current = [];
    setMetrics({
      firstDetectionTime: null,
      lastDetectionTime: null,
      detectionLatency: null,
      scanCount: 0,
      fps: 0,
    });
    setScannedCodes([]);
  }, []);

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

        {/* Panneau des métriques de performance */}
        <View style={styles.metricsContainer}>
          <Text style={styles.metricsTitle}>📊 Métriques de performance</Text>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Première détection :</Text>
            <Text style={styles.metricValue}>
              {metrics.firstDetectionTime !== null
                ? `${metrics.firstDetectionTime} ms`
                : '—'}
            </Text>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Latence nouveau code :</Text>
            <Text style={styles.metricValue}>
              {metrics.detectionLatency !== null
                ? `${metrics.detectionLatency} ms`
                : '—'}
            </Text>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Fréquence (FPS) :</Text>
            <Text style={styles.metricValue}>{metrics.fps} scan/s</Text>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Total scans :</Text>
            <Text style={styles.metricValue}>{metrics.scanCount}</Text>
          </View>

          <TouchableOpacity style={styles.resetButton} onPress={resetMetrics}>
            <Text style={styles.resetButtonText}>🔄 Réinitialiser</Text>
          </TouchableOpacity>
        </View>
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
  metricsContainer: {
    marginTop: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  metricsTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  metricLabel: {
    color: '#aaa',
    fontSize: 14,
  },
  metricValue: {
    color: '#00BFFF',
    fontSize: 14,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  resetButton: {
    marginTop: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 6,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default App;
