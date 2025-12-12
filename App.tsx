import React, { useState } from 'react';
import { ScannerScreen } from './src/screens/ScannerScreen';
import { CartScreen } from './src/screens/CartScreen';
import type { CartItem } from './src/types';

function App() {
  const [currentScreen, setCurrentScreen] = useState<'scanner' | 'cart'>('scanner');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const handleAddToCart = (item: Omit<CartItem, 'quantity'>) => {
    setCartItems(prev => [...prev, { ...item, quantity: 1 }]);
  };

  const handleUpdateQuantity = (code: string, quantity: number) => {
    setCartItems(prev =>
      prev.map(item =>
        item.code === code ? { ...item, quantity } : item
      )
    );
  };

  const handleRemoveItem = (code: string) => {
    setCartItems(prev => prev.filter(item => item.code !== code));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  if (currentScreen === 'cart') {
    return (
      <CartScreen
        items={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClear={handleClearCart}
        onBack={() => setCurrentScreen('scanner')}
      />
    );
  }

  return (
    <ScannerScreen
      cartItems={cartItems}
      onAddToCart={handleAddToCart}
      onUpdateQuantity={handleUpdateQuantity}
      onOpenCart={() => setCurrentScreen('cart')}
    />
  );
}

export default App;
