export type ApparelType = 'polo' | 'hoodie' | 't-shirt';

export type PrintPlacement = 'front' | 'back' | 'left' | 'right' | 'cap';

export interface PrintZone {
  id: string;
  placement: PrintPlacement;
  image: File | null;
  imagePreview: string | null;
  position: { x: number; y: number };
  size: { width: number; height: number };
}

export interface CustomApparel {
  type: ApparelType;
  color: string;
  size: string;
  printZones: PrintZone[];
}

export interface ApparelConfig {
  type: ApparelType;
  name: string;
  availablePlacements: PrintPlacement[];
  baseImage: string;
  colors: string[];
  sizes: string[];
  basePrice: number;
}

export const APPAREL_CONFIGS: ApparelConfig[] = [
  {
    type: 't-shirt',
    name: 'T-Shirt',
    availablePlacements: ['front', 'back', 'left', 'right'],
    baseImage: 'assets/apparel/tshirt-base.png',
    colors: ['White', 'Black', 'Navy', 'Red', 'Gray', 'Green'],
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    basePrice: 15
  },
  {
    type: 'polo',
    name: 'Polo Shirt',
    availablePlacements: ['front', 'back', 'left', 'right'],
    baseImage: 'assets/apparel/polo-base.png',
    colors: ['White', 'Black', 'Navy', 'Red', 'Gray', 'Royal Blue'],
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    basePrice: 25
  },
  {
    type: 'hoodie',
    name: 'Hoodie',
    availablePlacements: ['front', 'back', 'left', 'right', 'cap'],
    baseImage: 'assets/apparel/hoodie-base.png',
    colors: ['White', 'Black', 'Navy', 'Gray', 'Burgundy', 'Forest Green'],
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    basePrice: 40
  }
];
