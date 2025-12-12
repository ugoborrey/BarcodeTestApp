import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  StatusBar,
  TouchableOpacity,
  Vibration,
} from 'react-native';
import {
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
import { Camera as BarcodeCamera } from 'react-native-vision-camera-barcodes-scanner';

import type { Barcode, CartItem, DetectionMetrics, ToastData, ProductIndex, Product } from '../types';
import { ProductToast } from '../components/ProductToast';
import { CartButton } from '../components/CartButton';
import productIndex from '../../assets/productIndex.json';

type Props = {
  cartItems: CartItem[];
  onAddToCart: (item: Omit<CartItem, 'quantity'>) => void;
  onUpdateQuantity: (code: string, quantity: number) => void;
  onOpenCart: () => void;
};

const typedProductIndex = productIndex as ProductIndex;

export function ScannerScreen({ cartItems, onAddToCart, onUpdateQuantity, onOpenCart }: Props) {
  const { hasPermission, requestPermission } = useCameraPermission();
  const [scannedCodes, setScannedCodes] = useState<Barcode[]>([]);
  const device = useCameraDevice('back');
  const [toast, setToast] = useState<ToastData>(null);

  const [metrics, setMetrics] = useState<DetectionMetrics>({
    firstDetectionTime: null,
    lastDetectionTime: null,
    detectionLatency: null,
    scanCount: 0,
    fps: 0,
  });

  const cameraStartTime = useRef<number | null>(null);
  const lastCodeValue = useRef<string | null>(null);
  const newCodeStartTime = useRef<number | null>(null);
  const scanTimestamps = useRef<number[]>([]);

  // Pour le debounce des codes connus
  const lastAddedCode = useRef<string | null>(null);
  const lastAddedTime = useRef<number>(0);

  // Pour la détection des codes inconnus persistants
  const unknownCodeTracker = useRef<{ code: string; firstSeen: number } | null>(null);

  // Ref pour avoir accès à la valeur actuelle du panier dans le callback
  const cartItemsRef = useRef<CartItem[]>(cartItems);
  useEffect(() => {
    cartItemsRef.current = cartItems;
  }, [cartItems]);

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

  const calculateFPS = useCallback(() => {
    const now = Date.now();
    const oneSecondAgo = now - 1000;
    scanTimestamps.current = scanTimestamps.current.filter(ts => ts > oneSecondAgo);
    return scanTimestamps.current.length;
  }, []);

  const handleBarcodeScanned = useCallback(
    (barcodes: Barcode[]) => {
      if (barcodes.length === 0) return;

      const now = Date.now();
      const code = barcodes[0].rawValue;
      const product = typedProductIndex[code];

      setScannedCodes(barcodes);
      scanTimestamps.current.push(now);

      // Mise à jour des métriques
      setMetrics(prev => {
        const newMetrics = { ...prev };

        if (prev.firstDetectionTime === null && cameraStartTime.current) {
          newMetrics.firstDetectionTime = now - cameraStartTime.current;
        }

        if (code !== lastCodeValue.current) {
          if (newCodeStartTime.current !== null) {
            newMetrics.detectionLatency = now - newCodeStartTime.current;
          }
          newCodeStartTime.current = now;
          lastCodeValue.current = code;
        }

        newMetrics.lastDetectionTime = now;
        newMetrics.scanCount = prev.scanCount + 1;
        newMetrics.fps = calculateFPS();

        return newMetrics;
      });

      // Logique de lookup et ajout au panier
      if (product) {
        // Code connu - reset tracker inconnu
        unknownCodeTracker.current = null;

        // Debounce: ignorer si même code traité récemment
        if (lastAddedCode.current === code && now - lastAddedTime.current < 2000) {
          return;
        }

        // Vérifier si le produit est déjà dans le panier (utiliser la ref pour éviter stale closure)
        const isAlreadyInCart = cartItemsRef.current.some(item => item.code === code);

        if (isAlreadyInCart) {
          // Produit déjà dans le panier - pas de vibration forte
          Vibration.vibrate(20);
          setToast({ type: 'duplicate', code, product });
          lastAddedCode.current = code;
          lastAddedTime.current = now;
        } else {
          // Ajouter au panier
          Vibration.vibrate(50);
          onAddToCart({ code, product, addedAt: now });
          lastAddedCode.current = code;
          lastAddedTime.current = now;
          setToast({ type: 'success', code, product });
        }
      } else {
        // Code pas dans productIndex - vérifier s'il est déjà dans le panier (ajouté manuellement)
        const existingCartItem = cartItemsRef.current.find(item => item.code === code);

        if (existingCartItem) {
          // Code inconnu mais déjà dans le panier - traiter comme duplicate
          unknownCodeTracker.current = null;

          // Debounce
          if (lastAddedCode.current === code && now - lastAddedTime.current < 2000) {
            return;
          }

          Vibration.vibrate(20);
          setToast({ type: 'duplicate', code, product: existingCartItem.product });
          lastAddedCode.current = code;
          lastAddedTime.current = now;
        } else {
          // Vraiment inconnu - toast erreur après persistance
          if (unknownCodeTracker.current?.code === code) {
            // Même code inconnu - vérifier persistance
            if (now - unknownCodeTracker.current.firstSeen > 1500) {
              Vibration.vibrate([0, 50, 50, 50]); // Double vibration pour erreur
              setToast({ type: 'error', code });
              unknownCodeTracker.current = null; // Reset pour éviter spam
            }
          } else {
            // Nouveau code inconnu
            unknownCodeTracker.current = { code, firstSeen: now };
          }
        }
      }
    },
    [calculateFPS, onAddToCart],
  );

  const resetMetrics = useCallback(() => {
    cameraStartTime.current = Date.now();
    lastCodeValue.current = null;
    newCodeStartTime.current = null;
    scanTimestamps.current = [];
    lastAddedCode.current = null;
    lastAddedTime.current = 0;
    unknownCodeTracker.current = null;
    setMetrics({
      firstDetectionTime: null,
      lastDetectionTime: null,
      detectionLatency: null,
      scanCount: 0,
      fps: 0,
    });
    setScannedCodes([]);
  }, []);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  const handleAddUnknown = useCallback((code: string) => {
    const placeholderProduct: Product = {
      name: `Produit inconnu (${code})`,
      ref1: code,
      ref2: '-',
    };
    onAddToCart({ code, product: placeholderProduct, addedAt: Date.now() });
    setToast({ type: 'success', code, product: placeholderProduct });
  }, [onAddToCart]);

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Permission camera requise</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Autoriser la camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Aucune camera disponible</Text>
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
        options={['all']}
      />

      <CartButton count={cartItems.length} onPress={onOpenCart} />

      <View style={styles.overlay}>
        <Text style={styles.title}>Scanner de codes-barres</Text>
        {scannedCodes.length > 0 && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultTitle}>Code scanne :</Text>
            {scannedCodes.map((barcode, index) => (
              <Text key={index} style={styles.resultText}>
                {barcode.rawValue}
              </Text>
            ))}
          </View>
        )}

        <View style={styles.metricsContainer}>
          <Text style={styles.metricsTitle}>Metriques de performance</Text>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Premiere detection :</Text>
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
            <Text style={styles.metricLabel}>Frequence (FPS) :</Text>
            <Text style={styles.metricValue}>{metrics.fps} scan/s</Text>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Total scans :</Text>
            <Text style={styles.metricValue}>{metrics.scanCount}</Text>
          </View>

          <TouchableOpacity style={styles.resetButton} onPress={resetMetrics}>
            <Text style={styles.resetButtonText}>Reinitialiser</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ProductToast
        data={toast}
        currentQuantity={toast ? (cartItemsRef.current.find(item => item.code === toast.code)?.quantity ?? 1) : 1}
        onDismiss={dismissToast}
        onQuantityChange={onUpdateQuantity}
        onAddUnknown={handleAddUnknown}
      />
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
    right: 70,
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
