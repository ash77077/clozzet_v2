import * as THREE from 'three';

/**
 * Available apparel types
 */
export type ApparelType = 'hoodie' | 'tshirt' | 'polo';

/**
 * Available customizable parts for each apparel
 */
export type PartName =
  | 'bodyFront'
  | 'bodyBack'
  | 'sleeveLeft'
  | 'sleeveRight'
  | 'hood'
  | 'pocket'
  | 'collar';

/**
 * Camera view positions
 */
export type CameraView = 'front' | 'back' | 'left' | 'right';

/**
 * Interface for storing part references
 */
export interface ModelParts {
  bodyFront: THREE.Mesh | null;
  bodyBack: THREE.Mesh | null;
  sleeveLeft: THREE.Mesh | null;
  sleeveRight: THREE.Mesh | null;
  hood: THREE.Mesh | null;
  pocket: THREE.Mesh | null;
  collar: THREE.Mesh | null;
}

/**
 * Interface for part customization data
 */
export interface PartCustomization {
  name: PartName;
  color: string;
  designImage?: string;
  designText?: string;
}

/**
 * Complete customization configuration
 */
export interface CustomizerConfig {
  apparelType: ApparelType;
  parts: PartCustomization[];
  currentView: CameraView;
}

/**
 * Part metadata for UI
 */
export interface PartMetadata {
  id: PartName;
  displayName: string;
  availableFor: ApparelType[];
  defaultColor: string;
}

/**
 * Camera preset positions
 */
export interface CameraPreset {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
}

/**
 * Fabric.js canvas dimensions
 */
export interface CanvasDimensions {
  width: number;
  height: number;
}
