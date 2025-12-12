import React, { useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { ToastData } from '../types';

type Props = {
  data: ToastData;
  currentQuantity?: number;
  onDismiss: () => void;
  onQuantityChange?: (code: string, newQuantity: number) => void;
  onAddUnknown?: (code: string) => void;
};

export function ProductToast({ data, currentQuantity = 1, onDismiss, onQuantityChange, onAddUnknown }: Props) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      onDismiss();
    }, 2500);
  }, [onDismiss]);

  useEffect(() => {
    if (data) {
      resetTimer();
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [data, resetTimer]);

  const handleIncrement = () => {
    if (data && onQuantityChange) {
      onQuantityChange(data.code, currentQuantity + 1);
      resetTimer();
    }
  };

  const handleDecrement = () => {
    if (data && onQuantityChange && currentQuantity > 1) {
      onQuantityChange(data.code, currentQuantity - 1);
      resetTimer();
    }
  };

  if (!data) {
    return null;
  }

  const handleAddUnknown = () => {
    if (data && onAddUnknown) {
      onAddUnknown(data.code);
    }
  };

  if (data.type === 'error') {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <Text style={styles.codeText}>{data.code}</Text>
        <Text style={styles.errorText}>Code non reconnu</Text>
        <TouchableOpacity style={styles.addUnknownButton} onPress={handleAddUnknown}>
          <Text style={styles.addUnknownButtonText}>Ajouter quand même</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isSuccess = data.type === 'success';
  const containerStyle = isSuccess ? styles.successContainer : styles.duplicateContainer;
  const statusText = isSuccess ? 'Ajoute au panier' : 'Deja dans le panier';

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.codeText}>{data.code}</Text>
      <Text style={styles.productName}>{data.product?.name}</Text>
      <Text style={styles.refsText}>
        {data.product?.ref1} | {data.product?.ref2}
      </Text>

      <View style={styles.quantityRow}>
        <TouchableOpacity
          style={[styles.quantityButton, currentQuantity <= 1 && styles.quantityButtonDisabled]}
          onPress={handleDecrement}
          disabled={currentQuantity <= 1}
        >
          <Text style={[styles.quantityButtonText, currentQuantity <= 1 && styles.quantityButtonTextDisabled]}>-</Text>
        </TouchableOpacity>
        <Text style={styles.quantityText}>{currentQuantity}</Text>
        <TouchableOpacity style={styles.quantityButton} onPress={handleIncrement}>
          <Text style={styles.quantityButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statusRow}>
        <Text style={styles.statusText}>{statusText}</Text>
        {isSuccess && <Text style={styles.checkIcon}> </Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  successContainer: {
    backgroundColor: 'rgba(34, 139, 34, 0.95)',
  },
  errorContainer: {
    backgroundColor: 'rgba(220, 53, 69, 0.95)',
  },
  duplicateContainer: {
    backgroundColor: 'rgba(255, 165, 0, 0.95)',
  },
  codeText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginBottom: 4,
  },
  productName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  refsText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
    marginBottom: 12,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonDisabled: {
    opacity: 0.4,
  },
  quantityButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  quantityButtonTextDisabled: {
    opacity: 0.5,
  },
  quantityText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginHorizontal: 24,
    minWidth: 40,
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  checkIcon: {
    fontSize: 16,
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addUnknownButton: {
    marginTop: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  addUnknownButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
