import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DecalGeometry } from 'three/examples/jsm/geometries/DecalGeometry.js';

@Component({
  selector: 'app-configurator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './configurator.component.html',
  styleUrl: './configurator.component.scss',
})
export class ConfiguratorComponent implements AfterViewInit, OnDestroy {
  // ViewChild to bind the canvas container
  @ViewChild('canvasContainer', { static: false }) canvasContainer!: ElementRef<HTMLDivElement>;

  // Three.js core components
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private transformControl!: TransformControls;
  private loader: GLTFLoader = new GLTFLoader();

  // Store the loaded model for manipulation
  private loadedModel: THREE.Group | null = null;

  // Animation frame ID for cleanup
  private animationFrameId: number = 0;

  // Available mesh parts (assuming the 3D artist named them)
  meshParts = ['Object_14', 'Object_20', 'Object_18', 'Object_10', 'Object_8'];

  // Track part colors (store as hex values)
  private partColors: Map<string, string> = new Map();

  // Currently selected part for color change
  selectedPart: string = '';

  // ===== LOGO PLACEMENT WITH TRANSFORMCONTROLS =====

  // Raycaster for detecting mouse clicks on the mesh
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();

  // Texture loader and logo texture
  private textureLoader: THREE.TextureLoader = new THREE.TextureLoader();
  logoTexture: THREE.Texture | null = null; // Public so template can check if logo is loaded
  private logoAspectRatio: number = 1.0; // Store logo aspect ratio (width / height)

  // Store all placed decals (LIMITED TO ONE)
  decals: THREE.Mesh[] = [];

  // TransformControls mode ('translate', 'rotate', 'scale')
  transformMode: 'translate' | 'rotate' | 'scale' = 'translate';

  // Currently selected decal for transformation
  private selectedDecal: THREE.Mesh | null = null;

  // Global cloth color for changing all parts at once
  globalClothColor: string = '#ffffff';

  // Computed property: check if logo is placed
  get hasLogo(): boolean {
    return this.decals.length > 0;
  }

  ngAfterViewInit(): void {
    this.initThreeJS();
    this.loadModel();
    this.setupClickListener();
    this.animate();
    this.setupResizeListener();
  }

  /**
   * Initialize Three.js Scene, Camera, Renderer, Controls, and Lighting
   */
  private initThreeJS(): void {
    const container = this.canvasContainer.nativeElement;

    // Create Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf0f4f8);

    // Create PerspectiveCamera
    this.camera = new THREE.PerspectiveCamera(
      45, // Field of view
      container.clientWidth / container.clientHeight, // Aspect ratio
      0.1, // Near clipping plane
      1000 // Far clipping plane
    );
    this.camera.position.set(0, 3, 1); // Position camera to view the model

    // Create WebGLRenderer with antialiasing
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Append renderer canvas to the container
    container.appendChild(this.renderer.domElement);

    // Add OrbitControls for user interaction
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = false; // Smooth camera movement
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 10;
    this.controls.target.set(0, 0.5, 0); // Look at the center of the model

    // Lock vertical rotation - only allow horizontal spinning
    this.controls.minPolarAngle = 1;
    this.controls.maxPolarAngle = 1;

    // Disable panning to keep model centered
    this.controls.enablePan = false;

    // Initialize TransformControls
    this.transformControl = new TransformControls(this.camera, this.renderer.domElement);
    this.transformControl.setMode(this.transformMode);
    this.scene.add(this.transformControl as any);

    // Listen to TransformControls dragging events to disable OrbitControls
    this.transformControl.addEventListener('dragging-changed', (event: any) => {
      this.controls.enabled = !event.value;
    });

    // Add Lighting for realistic fabric materials

    // Ambient Light - provides overall scene illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    // Directional Light - simulates sunlight
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    directionalLight.castShadow = false;
    this.scene.add(directionalLight);

    // Additional fill light from the opposite side
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-5, 5, -5);
    this.scene.add(fillLight);

    // Optional: Add a ground plane for better visualization
    const planeGeometry = new THREE.PlaneGeometry(20, 20);
    const planeMaterial = new THREE.ShadowMaterial({ opacity: 0.2 });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = 0;
    plane.receiveShadow = true;
    this.scene.add(plane);
  }

  /**
   * Load the 3D Model using GLTFLoader
   */
  loadModel(): void {
    // Replace with your actual model path
    const modelPath = './assets/glb/t_shirt.glb';

    this.loader.load(
      modelPath,
      (gltf) => {
        this.loadedModel = gltf.scene;

        // Traverse the model to inspect meshes
        this.loadedModel.traverse((child) => {
          // Check if the child is a mesh
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;

            // Enable shadow casting and receiving
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            console.log('Found mesh:', mesh.name);

            // Ensure the material is a MeshStandardMaterial for proper lighting
            if (mesh.material) {
              // Clone the material to avoid shared references
              if (Array.isArray(mesh.material)) {
                mesh.material = mesh.material.map(mat => mat.clone());
              } else {
                mesh.material = (mesh.material as THREE.Material).clone();
              }
            }

            // Initialize part color tracking
            if (mesh.name && this.meshParts.includes(mesh.name)) {
              const currentColor = this.getMeshCurrentColor(mesh);
              this.partColors.set(mesh.name, currentColor);
            }
          }
        });

        // Center the model using bounding box calculation
        const box = new THREE.Box3().setFromObject(this.loadedModel);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // Move model so its center is at origin
        this.loadedModel.position.sub(center);

        // Position model at a comfortable height
        this.loadedModel.position.y = 0.5;

        // Calculate the actual center position after repositioning
        const finalCenter = new THREE.Vector3(0, 1, 0);

        // Update OrbitControls target to the exact center of the model
        this.controls.target.copy(finalCenter);

        // Position camera to look at the center
        // Adjust camera distance based on model size
        const maxDim = Math.max(size.x, size.y, size.z);
        const cameraDistance = maxDim * 5; // Adjust multiplier as needed
        this.camera.position.set(
          0,
          finalCenter.y,
          cameraDistance
        );

        // Update controls to apply the new target
        this.controls.update();

        // Add the model to the scene
        this.scene.add(this.loadedModel);

        console.log('Model centered at:', finalCenter);
        console.log('Model size:', size);
        console.log('Camera positioned at:', this.camera.position);
      },
      (progress) => {
        // Loading progress
        const percentComplete = (progress.loaded / progress.total) * 100;
        console.log(`Model loading: ${percentComplete.toFixed(2)}%`);
      },
      (error) => {
        console.error('Error loading model:', error);
      }
    );
  }

  /**
   * Get the current color of a mesh (for initialization)
   */
  private getMeshCurrentColor(mesh: THREE.Mesh): string {
    if (mesh.material) {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const firstMaterial = materials[0];

      if (firstMaterial instanceof THREE.MeshStandardMaterial ||
          firstMaterial instanceof THREE.MeshPhongMaterial ||
          firstMaterial instanceof THREE.MeshBasicMaterial) {
        return '#' + firstMaterial.color.getHexString();
      }
    }
    return '#ffffff'; // Default to white
  }

  /**
   * Get the current color of a part (for display)
   */
  getPartColor(partName: string): string {
    return this.partColors.get(partName) || '#ffffff';
  }

  /**
   * Open the global color picker
   */
  openGlobalColorPicker(): void {
    const colorPicker = document.getElementById('globalColorPicker') as HTMLInputElement;
    if (colorPicker) {
      colorPicker.click();
    }
  }

  /**
   * Handle global color change - changes all parts
   */
  onGlobalColorChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const hexColor = input.value;
    this.globalClothColor = hexColor;

    // Update all parts with the same color
    this.meshParts.forEach(partName => {
      this.changePartColor(partName, hexColor);
      this.partColors.set(partName, hexColor);
    });

    console.log(`Changed all parts to ${hexColor}`);
  }

  /**
   * Open the native color picker for a specific part
   */
  openColorPicker(index: number, partName: string): void {
    this.selectedPart = partName;
    const colorPicker = document.getElementById(`colorPicker-${index}`) as HTMLInputElement;
    if (colorPicker) {
      colorPicker.click();
    }
  }

  /**
   * Handle color change from native color picker
   */
  onColorChange(event: Event, partName: string): void {
    const input = event.target as HTMLInputElement;
    const hexColor = input.value;

    // Update the part color
    this.changePartColor(partName, hexColor);

    // Store the color
    this.partColors.set(partName, hexColor);

    console.log(`Changed ${partName} to ${hexColor}`);
  }

  /**
   * Change the color of a specific mesh part by name
   */
  changePartColor(meshName: string, hexColor: string): void {
    if (!this.loadedModel) {
      console.warn('Model not loaded yet');
      return;
    }

    // Find the mesh by name in the scene
    const mesh = this.loadedModel.getObjectByName(meshName) as THREE.Mesh;

    if (mesh && mesh.isMesh) {
      // Ensure the material exists
      if (mesh.material) {
        // Handle both single material and material arrays
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

        materials.forEach((material) => {
          if (material instanceof THREE.MeshStandardMaterial ||
              material instanceof THREE.MeshPhongMaterial ||
              material instanceof THREE.MeshBasicMaterial) {
            // Update the material color
            material.color.set(hexColor);
            material.needsUpdate = true;
          }
        });
      }
    } else {
      console.warn(`Mesh with name "${meshName}" not found`);
    }
  }

  /**
   * Animation loop
   */
  private animate(): void {
    this.animationFrameId = requestAnimationFrame(() => this.animate());

    // Update controls for damping effect
    this.controls.update();

    // Render the scene
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Setup window resize listener to keep the scene responsive
   */
  private setupResizeListener(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  /**
   * Handle window resize events
   */
  private onWindowResize(): void {
    const container = this.canvasContainer.nativeElement;

    // Update camera aspect ratio
    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();

    // Update renderer size
    this.renderer.setSize(container.clientWidth, container.clientHeight);
  }

  // ===== LOGO PLACEMENT WITH TRANSFORMCONTROLS =====

  /**
   * Handle logo file upload from user
   */
  handleLogoUpload(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please upload a valid image file (PNG, JPG, JPEG)');
        return;
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        alert('File size too large. Please upload an image smaller than 5MB.');
        return;
      }

      // Create FileReader to read the uploaded file
      const reader = new FileReader();

      reader.onload = (e: ProgressEvent<FileReader>) => {
        if (e.target?.result) {
          const imageUrl = e.target.result as string;

          // Load the image as a THREE.js texture
          this.textureLoader.load(
            imageUrl,
            (texture) => {
              // Dispose old texture if exists
              if (this.logoTexture) {
                this.logoTexture.dispose();
              }

              // Set the new texture
              this.logoTexture = texture;

              // Calculate and store aspect ratio (width / height)
              const image = texture.image;
              if (image && image.width && image.height) {
                this.logoAspectRatio = image.width / image.height;
                console.log(`Custom logo uploaded: ${image.width}x${image.height}, aspect ratio: ${this.logoAspectRatio.toFixed(2)}`);
              } else {
                this.logoAspectRatio = 1.0; // Default to square if dimensions unavailable
              }
            },
            undefined,
            (error) => {
              console.error('Error loading uploaded logo:', error);
              alert('Failed to load the logo. Please try another image.');
            }
          );
        }
      };

      reader.onerror = () => {
        alert('Failed to read the file. Please try again.');
      };

      // Read the file as a data URL
      reader.readAsDataURL(file);
    }
  }

  /**
   * Remove uploaded logo and reset
   */
  removeUploadedLogo(): void {
    if (this.logoTexture) {
      this.logoTexture.dispose();
      this.logoTexture = null;
    }

    // Reset aspect ratio
    this.logoAspectRatio = 1.0;

    // Clear all existing decals
    this.clearAllDecals();

    // Detach transform control
    this.transformControl.detach();
    this.selectedDecal = null;

    console.log('Logo removed');
  }

  /**
   * Setup click listener for decal placement
   */
  private setupClickListener(): void {
    const canvas = this.renderer.domElement;
    canvas.addEventListener('click', this.onCanvasClick.bind(this));
  }

  /**
   * Handle canvas click events for decal placement and selection
   */
  private onCanvasClick(event: MouseEvent): void {
    // If transform control is being used, don't place new decals
    if (this.transformControl.dragging) {
      return;
    }

    // Calculate mouse position in normalized device coordinates (-1 to +1)
    const canvas = this.renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Update raycaster with camera and mouse position
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // First, check if clicking on an existing decal
    const decalIntersects = this.raycaster.intersectObjects(this.decals, false);

    if (decalIntersects.length > 0) {
      // Clicked on a decal - attach TransformControls to it
      const clickedDecal = decalIntersects[0].object as THREE.Mesh;
      this.selectedDecal = clickedDecal;
      this.transformControl.attach(clickedDecal);
      console.log('Decal selected for transformation');
      return;
    }

    // If no decal clicked and logo is loaded, place a new decal
    if (!this.logoTexture || !this.loadedModel) {
      return;
    }

    // Find intersections with the loaded model meshes
    const intersects = this.raycaster.intersectObject(this.loadedModel, true);

    if (intersects.length > 0) {
      const intersection = intersects[0];

      // Ensure we hit a mesh
      if (intersection.object instanceof THREE.Mesh && intersection.face) {
        const position = intersection.point;
        const normal = intersection.face.normal.clone();

        // Transform the normal to world space
        const mesh = intersection.object;
        normal.transformDirection(mesh.matrixWorld);

        // Add decal at the intersection point
        this.addDecal(position, normal, mesh);
      }
    }
  }

  /**
   * Add a decal to the mesh at the specified position and orientation
   * ONLY ONE LOGO ALLOWED - removes existing logo before placing new one
   */
  private addDecal(position: THREE.Vector3, normal: THREE.Vector3, targetMesh: THREE.Mesh): void {
    if (!this.logoTexture) {
      console.warn('Logo texture not loaded yet');
      return;
    }

    // IMPORTANT: Remove existing logo if present (only one logo allowed)
    if (this.decals.length > 0) {
      this.removePlacedLogo();
    }

    // Calculate decal size with aspect ratio
    const baseSize = 0.5;
    const size = new THREE.Vector3(
      baseSize * this.logoAspectRatio, // Width: adjusted by aspect ratio
      baseSize,                         // Height: base size
      baseSize                          // Depth
    );

    // Create a helper object to calculate the correct orientation
    const orientation = new THREE.Euler();
    const dummy = new THREE.Object3D();

    // Orient the dummy object to face along the normal
    dummy.position.copy(position);
    dummy.lookAt(position.clone().add(normal));

    // Get the rotation from the dummy object
    orientation.copy(dummy.rotation);

    // Create DecalGeometry
    const decalGeometry = new DecalGeometry(targetMesh, position, orientation, size);

    // Create material for the decal with proper settings to prevent z-fighting
    const decalMaterial = new THREE.MeshPhongMaterial({
      map: this.logoTexture,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -50,
      polygonOffsetUnits: -20,
    });

    // Create the decal mesh
    const decalMesh = new THREE.Mesh(decalGeometry, decalMaterial);

    // Add to scene
    this.scene.add(decalMesh);

    // Add to decals array
    this.decals.push(decalMesh);

    // Automatically select and attach transform control to the new decal
    this.selectedDecal = decalMesh;
    this.transformControl.attach(decalMesh);

    console.log('Logo placed at', position);
  }

  /**
   * Set the TransformControls mode
   */
  setTransformMode(mode: 'translate' | 'rotate' | 'scale'): void {
    this.transformMode = mode;
    this.transformControl.setMode(mode);
    console.log(`Transform mode set to: ${mode}`);
  }

  /**
   * Remove the placed logo (but keep the uploaded texture)
   */
  removePlacedLogo(): void {
    if (this.decals.length === 0) {
      return;
    }

    // Remove from scene and dispose
    this.decals.forEach((decal) => {
      this.scene.remove(decal);
      if (decal.geometry) {
        decal.geometry.dispose();
      }
      if (decal.material) {
        const materials = Array.isArray(decal.material) ? decal.material : [decal.material];
        materials.forEach(mat => mat.dispose());
      }
    });

    this.decals = [];
    this.selectedDecal = null;
    this.transformControl.detach();

    console.log('Placed logo removed');
  }

  /**
   * Clear all placed decals from the scene (same as removePlacedLogo since we only have one)
   */
  clearAllDecals(): void {
    this.removePlacedLogo();
  }

  // ===== EXPORT PRODUCTION DATA =====

  /**
   * Export the current design configuration as JSON for the manufacturing team
   */
  exportProductionData(): void {
    const productionData: any = {
      timestamp: new Date().toISOString(),
      version: 'v2.0',
      garment: {
        colors: this.extractGarmentColors()
      },
      logos: this.extractLogoData()
    };

    // Convert to formatted JSON string
    const jsonString = JSON.stringify(productionData, null, 2);

    // Log to console
    console.log('=== PRODUCTION DATA EXPORT ===');
    console.log(jsonString);

    // Download as JSON file
    this.downloadJSON(jsonString, `design-export-${Date.now()}.json`);

    // Show success message
    alert('Design exported successfully! Check console and downloads folder.');
  }

  /**
   * Extract garment color information
   */
  private extractGarmentColors(): any {
    const colors: any = {};

    // Use the stored part colors
    this.partColors.forEach((color, partName) => {
      colors[partName] = {
        hex: color,
        rgb: this.hexToRgb(color)
      };
    });

    return colors;
  }

  /**
   * Convert hex color to RGB object
   */
  private hexToRgb(hex: string): { r: number, g: number, b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  /**
   * Extract logo/decal placement data
   */
  private extractLogoData(): any[] {
    const logoData: any[] = [];

    this.decals.forEach((decal, index) => {
      const logoEntry: any = {
        id: `logo_${index + 1}`,
        position: {
          x: parseFloat(decal.position.x.toFixed(4)),
          y: parseFloat(decal.position.y.toFixed(4)),
          z: parseFloat(decal.position.z.toFixed(4))
        },
        rotation: {
          x: parseFloat(decal.rotation.x.toFixed(4)),
          y: parseFloat(decal.rotation.y.toFixed(4)),
          z: parseFloat(decal.rotation.z.toFixed(4))
        },
        scale: {
          x: parseFloat(decal.scale.x.toFixed(4)),
          y: parseFloat(decal.scale.y.toFixed(4)),
          z: parseFloat(decal.scale.z.toFixed(4))
        },
        logoTexture: 'custom_uploaded_logo.png'
      };

      logoData.push(logoEntry);
    });

    return logoData;
  }

  /**
   * Download JSON data as a file
   */
  private downloadJSON(jsonString: string, filename: string): void {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Cleanup on component destroy to prevent memory leaks
   */
  ngOnDestroy(): void {
    // Remove resize listener
    window.removeEventListener('resize', this.onWindowResize.bind(this));

    // Remove click listener
    if (this.renderer && this.renderer.domElement) {
      this.renderer.domElement.removeEventListener('click', this.onCanvasClick.bind(this));
    }

    // Cancel animation frame
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    // Dispose of controls
    if (this.controls) {
      this.controls.dispose();
    }

    // Dispose of transform control
    if (this.transformControl) {
      this.transformControl.dispose();
    }

    // Dispose of all decals
    this.clearAllDecals();

    // Dispose of logo texture
    if (this.logoTexture) {
      this.logoTexture.dispose();
    }

    // Dispose of renderer
    if (this.renderer) {
      this.renderer.dispose();
    }

    // Dispose of all geometries and materials in the scene
    if (this.scene) {
      this.scene.traverse((object) => {
        if ((object as THREE.Mesh).isMesh) {
          const mesh = object as THREE.Mesh;

          // Dispose geometry
          if (mesh.geometry) {
            mesh.geometry.dispose();
          }

          // Dispose materials
          if (mesh.material) {
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            materials.forEach((material) => {
              // Dispose any textures
              const mat = material as any;
              if (mat.map) mat.map.dispose();
              if (mat.normalMap) mat.normalMap.dispose();
              if (mat.roughnessMap) mat.roughnessMap.dispose();
              if (mat.metalnessMap) mat.metalnessMap.dispose();
              if (mat.emissiveMap) mat.emissiveMap.dispose();
              if (mat.bumpMap) mat.bumpMap.dispose();
              if (mat.displacementMap) mat.displacementMap.dispose();

              // Dispose material
              material.dispose();
            });
          }
        }
      });
    }

    // Clear the scene
    if (this.scene) {
      while (this.scene.children.length > 0) {
        this.scene.remove(this.scene.children[0]);
      }
    }
  }
}
