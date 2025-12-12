export type Product = {
  name: string;
  ref1: string;
  ref2: string;
};

export type ProductIndex = Record<string, Product>;

export type CartItem = {
  code: string;
  product: Product;
  quantity: number;
  addedAt: number;
};

export type ToastData = {
  type: 'success' | 'error' | 'duplicate';
  code: string;
  product?: Product;
} | null;

export type Barcode = {
  rawValue: string;
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
};

export type DetectionMetrics = {
  firstDetectionTime: number | null;
  lastDetectionTime: number | null;
  detectionLatency: number | null;
  scanCount: number;
  fps: number;
};
