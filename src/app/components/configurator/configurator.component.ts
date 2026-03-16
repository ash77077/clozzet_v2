import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
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
  private loader: GLTFLoader = new GLTFLoader();

  // Store the loaded model for manipulation
  private loadedModel: THREE.Group | null = null;

  // Animation frame ID for cleanup
  private animationFrameId: number = 0;

  // Color swatches for UI
  colorSwatches = [
    { name: 'Red', hex: '#ff0000' },
    { name: 'Blue', hex: '#0000ff' },
    { name: 'Green', hex: '#00ff00' },
    { name: 'Yellow', hex: '#ffff00' },
    { name: 'Purple', hex: '#800080' },
    { name: 'Orange', hex: '#ff8800' },
    { name: 'White', hex: '#ffffff' },
    { name: 'Black', hex: '#000000' },
  ];

  // Available mesh parts (assuming the 3D artist named them)
  meshParts = ['Object_14', 'Object_20', 'Object_18', 'Object_10', 'Object_8'];

  // Currently selected part for color change
  selectedPart: string = '';

  // ===== PHASE 2: Decal/Logo Placement =====

  // Raycaster for detecting mouse clicks on the mesh
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();

  // Texture loader and logo texture
  private textureLoader: THREE.TextureLoader = new THREE.TextureLoader();
  logoTexture: THREE.Texture | null = null; // Public so template can check if logo is loaded
  private logoAspectRatio: number = 1.0; // Store logo aspect ratio (width / height)

  // Decal state management
  private activeDecalMesh: THREE.Mesh | null = null;
  private decalState: {
    position: THREE.Vector3;
    normal: THREE.Vector3;
    size: THREE.Vector3;
    rotation: number;
  } | null = null;

  // UI controls for decal manipulation
  decalScale: number = 1.0;
  decalRotation: number = 0;
  decalMode: boolean = false; // Toggle decal placement mode

  // Store all placed decals
  private decals: THREE.Mesh[] = [];

  // ===== PHASE 3: Drag & Drop =====
  private isDraggingDecal: boolean = false;
  private draggedDecal: THREE.Mesh | null = null;
  private targetMeshForDrag: THREE.Mesh | null = null;

  ngAfterViewInit(): void {
    this.initThreeJS();
    this.loadModel();
    this.loadLogoTexture();
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
    this.scene.background = new THREE.Color(0xf0f0f0);

    // Create PerspectiveCamera
    // Parameters: FOV, aspect ratio, near clipping plane, far clipping plane
    this.camera = new THREE.PerspectiveCamera(
      45, // Field of view
      container.clientWidth / container.clientHeight, // Aspect ratio
      0.1, // Near clipping plane
      1000 // Far clipping plane
    );
    this.camera.position.set(0, 3, 1); // Position camera to view the model

    // Create WebGLRenderer with antialiasing and transparent background
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
    this.controls.enableDamping = true; // Smooth camera movement
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 10;
    this.controls.target.set(0, 0.5, 0); // Look at the center of the model

    // Add Lighting for realistic fabric materials

    // Ambient Light - provides overall scene illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    // Directional Light - simulates sunlight
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    directionalLight.castShadow = false;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;
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

            // IMPORTANT: Check the mesh name to identify specific parts
            // The 3D artist should name meshes like "Body", "LeftSleeve", "RightSleeve"
            // You can log the names to see what's available in your model:
            console.log('Found mesh:', mesh.name);

            // Ensure the material is a MeshStandardMaterial for proper lighting
            if (mesh.material) {
              // Clone the material to avoid shared references
              // This is crucial so changing one part doesn't affect others
              if (Array.isArray(mesh.material)) {
                mesh.material = mesh.material.map(mat => mat.clone());
              } else {
                mesh.material = (mesh.material as THREE.Material).clone();
              }
            }
          }
        });

        // Center and scale the model if needed
        const box = new THREE.Box3().setFromObject(this.loadedModel);
        const center = box.getCenter(new THREE.Vector3());
        this.loadedModel.position.sub(center);
        this.loadedModel.position.y = 0.5;

        // Add the model to the scene
        this.scene.add(this.loadedModel);
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
   * Change the color of a specific mesh part by name
   * @param meshName - The name of the mesh to change (e.g., "Body", "LeftSleeve")
   * @param hexColor - The color in hex format (e.g., "#ff0000")
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

        console.log(`Changed ${meshName} to ${hexColor}`);
      }
    } else {
      console.warn(`Mesh with name "${meshName}" not found. Available meshes:`);
      // Log all available mesh names for debugging
      this.loadedModel.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          console.log('- ', child.name || 'Unnamed mesh');
        }
      });
    }
  }

  /**
   * Change color of all meshes (for when mesh names are not available)
   */
  changeAllColors(hexColor: string): void {
    if (!this.loadedModel) return;

    this.loadedModel.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material) {
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach((material) => {
            if (material instanceof THREE.MeshStandardMaterial ||
                material instanceof THREE.MeshPhongMaterial ||
                material instanceof THREE.MeshBasicMaterial) {
              material.color.set(hexColor);
              material.needsUpdate = true;
            }
          });
        }
      }
    });
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

  // ===== PHASE 2: DECAL/LOGO PLACEMENT METHODS =====

  /**
   * Load the logo texture for decals
   * This is now optional - users can upload their own logos
   */
  private loadLogoTexture(): void {
    // Optional: Load a default placeholder logo
    // Users can now upload their own logos via the file input
    // Commenting out auto-load so users must upload their own:

    // const logoPath = 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/decal/decal-diffuse.png';
    // this.textureLoader.load(
    //   logoPath,
    //   (texture) => {
    //     this.logoTexture = texture;
    //     console.log('Logo texture loaded successfully');
    //   },
    //   undefined,
    //   (error) => {
    //     console.error('Error loading logo texture:', error);
    //   }
    // );
  }

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

              // Optional: Update existing decals with new texture
              // (You could add this functionality if needed)
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

    // Clear all existing decals since they use the old logo
    this.clearAllDecals();

    // Disable decal mode
    if (this.decalMode) {
      this.toggleDecalMode();
    }

    console.log('Logo removed');
  }

  /**
   * Setup click listener for decal placement and drag listeners
   */
  private setupClickListener(): void {
    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', this.onPointerDown.bind(this));
    canvas.addEventListener('pointermove', this.onPointerMove.bind(this));
    canvas.addEventListener('pointerup', this.onPointerUp.bind(this));
  }

  /**
   * Handle pointer down events for decal placement and drag detection
   */
  private onPointerDown(event: PointerEvent): void {
    // Calculate mouse position in normalized device coordinates (-1 to +1)
    const canvas = this.renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Update raycaster with camera and mouse position
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // PHASE 3: Check if clicking on an existing decal first
    const decalIntersects = this.raycaster.intersectObjects(this.decals, false);

    if (decalIntersects.length > 0) {
      // Clicked on a decal - start dragging
      this.isDraggingDecal = true;
      this.draggedDecal = decalIntersects[0].object as THREE.Mesh;
      this.controls.enabled = false; // Disable orbit controls during drag

      // Find the garment mesh to raycast against
      if (this.loadedModel) {
        this.loadedModel.traverse((child) => {
          if ((child as THREE.Mesh).isMesh && !this.targetMeshForDrag) {
            this.targetMeshForDrag = child as THREE.Mesh;
          }
        });
      }

      console.log('Started dragging decal');
      return;
    }

    // If not dragging, check for decal placement (only if decal mode is active)
    if (!this.decalMode || !this.loadedModel || !this.logoTexture) {
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

        // Store the target mesh for dragging
        this.targetMeshForDrag = mesh;

        // Add decal at the intersection point
        this.addDecal(position, normal, mesh);
      }
    }
  }

  /**
   * Handle pointer move events for dragging decals
   */
  private onPointerMove(event: PointerEvent): void {
    if (!this.isDraggingDecal || !this.draggedDecal || !this.targetMeshForDrag) {
      return;
    }

    // Calculate mouse position
    const canvas = this.renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Update raycaster
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Raycast against the garment mesh only
    const intersects = this.raycaster.intersectObject(this.targetMeshForDrag, true);

    if (intersects.length > 0 && intersects[0].face) {
      const intersection = intersects[0];
      const newPosition = intersection.point;

      // Ensure face is not null
      if (!intersection.face) return;

      const newNormal = intersection.face.normal.clone();
      newNormal.transformDirection(this.targetMeshForDrag.matrixWorld);

      // Dispose old decal geometry
      if (this.draggedDecal.geometry) {
        this.draggedDecal.geometry.dispose();
      }

      // Get current scale and rotation from decal state or use current values
      // Apply aspect ratio to maintain logo proportions
      const size = new THREE.Vector3(
        0.5 * this.decalScale * this.logoAspectRatio, // Width: adjusted by aspect ratio
        0.5 * this.decalScale,                         // Height: base size
        0.5 * this.decalScale                          // Depth: increased to help prevent z-fighting
      );

      // Calculate orientation
      const orientation = new THREE.Euler();
      const dummy = new THREE.Object3D();
      dummy.position.copy(newPosition);
      dummy.lookAt(newPosition.clone().add(newNormal));
      dummy.rotateZ(this.decalRotation * (Math.PI / 180));
      orientation.copy(dummy.rotation);

      // Create new DecalGeometry at new position
      const newDecalGeometry = new DecalGeometry(
        this.targetMeshForDrag,
        newPosition,
        orientation,
        size
      );

      // Update the dragged decal mesh
      this.draggedDecal.geometry = newDecalGeometry;

      // Update decal state if this is the active decal
      if (this.draggedDecal === this.activeDecalMesh && this.decalState) {
        this.decalState.position = newPosition.clone();
        this.decalState.normal = newNormal.clone();
      }
    }
  }

  /**
   * Handle pointer up events to stop dragging
   */
  private onPointerUp(event: PointerEvent): void {
    if (this.isDraggingDecal) {
      this.isDraggingDecal = false;
      this.draggedDecal = null;
      this.controls.enabled = true; // Re-enable orbit controls
      console.log('Stopped dragging decal');
    }
  }

  /**
   * Add a decal to the mesh at the specified position and orientation
   */
  private addDecal(position: THREE.Vector3, normal: THREE.Vector3, targetMesh: THREE.Mesh): void {
    if (!this.logoTexture) {
      console.warn('Logo texture not loaded yet');
      return;
    }

    // Calculate decal size based on the scale slider
    // Apply aspect ratio to maintain logo proportions (width / height)
    const size = new THREE.Vector3(
      0.5 * this.decalScale * this.logoAspectRatio, // Width: adjusted by aspect ratio
      0.5 * this.decalScale,                         // Height: base size
      0.5 * this.decalScale                          // Depth: increased to help prevent z-fighting
    );

    // Create a helper object to calculate the correct orientation
    const orientation = new THREE.Euler();
    const dummy = new THREE.Object3D();

    // Orient the dummy object to face along the normal
    dummy.position.copy(position);
    dummy.lookAt(position.clone().add(normal));

    // Apply the rotation from the slider
    dummy.rotateZ(this.decalRotation * (Math.PI / 180)); // Convert degrees to radians

    // Get the rotation from the dummy object
    orientation.copy(dummy.rotation);

    // Create DecalGeometry
    // DecalGeometry constructor: (mesh, position, orientation, size)
    const decalGeometry = new DecalGeometry(targetMesh, position, orientation, size);

    // Create material for the decal with proper settings to prevent z-fighting
    const decalMaterial = new THREE.MeshPhongMaterial({
      map: this.logoTexture,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -50, // Dramatically increased to eliminate z-fighting on sharp folds
      polygonOffsetUnits: -20,  // Dramatically increased for maximum depth separation
    });

    // Create the decal mesh
    const decalMesh = new THREE.Mesh(decalGeometry, decalMaterial);

    // Add to scene
    this.scene.add(decalMesh);

    // Store as active decal and save its state
    this.activeDecalMesh = decalMesh;
    this.decalState = {
      position: position.clone(),
      normal: normal.clone(),
      size: size.clone(),
      rotation: this.decalRotation
    };

    // Add to decals array
    this.decals.push(decalMesh);

    console.log('Decal placed at', position);
  }

  /**
   * Update the active decal with new scale and rotation values
   * This is called when sliders change
   */
  updateActiveDecal(): void {
    if (!this.activeDecalMesh || !this.decalState || !this.loadedModel) {
      return;
    }

    // Remove the old decal mesh from the scene
    this.scene.remove(this.activeDecalMesh);

    // Dispose of the old geometry to prevent memory leaks
    if (this.activeDecalMesh.geometry) {
      this.activeDecalMesh.geometry.dispose();
    }

    // Remove from decals array
    const index = this.decals.indexOf(this.activeDecalMesh);
    if (index > -1) {
      this.decals.splice(index, 1);
    }

    // Find the target mesh from the raycaster intersection
    // We need to re-raycast or store the target mesh reference
    const intersects = this.raycaster.intersectObject(this.loadedModel, true);
    let targetMesh: THREE.Mesh | null = null;

    if (intersects.length > 0 && intersects[0].object instanceof THREE.Mesh) {
      targetMesh = intersects[0].object;
    } else {
      // Fallback: try to find any mesh in the loaded model
      this.loadedModel.traverse((child) => {
        if ((child as THREE.Mesh).isMesh && !targetMesh) {
          targetMesh = child as THREE.Mesh;
        }
      });
    }

    if (!targetMesh) {
      console.warn('Could not find target mesh for decal update');
      return;
    }

    // Create new decal with updated parameters
    // Apply aspect ratio to maintain logo proportions
    const size = new THREE.Vector3(
      0.5 * this.decalScale * this.logoAspectRatio, // Width: adjusted by aspect ratio
      0.5 * this.decalScale,                         // Height: base size
      0.5 * this.decalScale                          // Depth: increased to help prevent z-fighting
    );

    const orientation = new THREE.Euler();
    const dummy = new THREE.Object3D();

    dummy.position.copy(this.decalState.position);
    dummy.lookAt(this.decalState.position.clone().add(this.decalState.normal));
    dummy.rotateZ(this.decalRotation * (Math.PI / 180));

    orientation.copy(dummy.rotation);

    // Create new DecalGeometry
    const decalGeometry = new DecalGeometry(
      targetMesh,
      this.decalState.position,
      orientation,
      size
    );

    // Reuse the material or create a new one
    const decalMaterial = new THREE.MeshPhongMaterial({
      map: this.logoTexture!,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -50, // Dramatically increased to eliminate z-fighting on sharp folds
      polygonOffsetUnits: -20,  // Dramatically increased for maximum depth separation
    });

    // Create new mesh
    const newDecalMesh = new THREE.Mesh(decalGeometry, decalMaterial);

    // Add to scene
    this.scene.add(newDecalMesh);

    // Update references
    this.activeDecalMesh = newDecalMesh;
    this.decalState.size = size;
    this.decalState.rotation = this.decalRotation;

    // Add to decals array
    this.decals.push(newDecalMesh);
  }

  /**
   * Toggle decal placement mode
   */
  toggleDecalMode(): void {
    this.decalMode = !this.decalMode;

    if (this.decalMode) {
      // Disable orbit controls while placing decals
      this.controls.enabled = false;
      console.log('Decal mode enabled - Click on the model to place logos');
    } else {
      // Re-enable orbit controls
      this.controls.enabled = true;
      console.log('Decal mode disabled');
    }
  }

  /**
   * Clear all placed decals from the scene
   */
  clearAllDecals(): void {
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
    this.activeDecalMesh = null;
    this.decalState = null;

    console.log('All decals cleared');
  }

  // ===== PHASE 3: EXPORT PRODUCTION DATA =====

  /**
   * Export the current design configuration as JSON for the manufacturing team
   * Includes garment colors and logo placement details
   */
  exportProductionData(): void {
    const productionData: any = {
      timestamp: new Date().toISOString(),
      version: 'v1.0',
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

    if (!this.loadedModel) {
      return colors;
    }

    // Traverse the model and extract colors from each mesh part
    this.loadedModel.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const meshName = mesh.name || 'Unnamed';

        if (mesh.material) {
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach((material, index) => {
            if (material instanceof THREE.MeshStandardMaterial ||
                material instanceof THREE.MeshPhongMaterial ||
                material instanceof THREE.MeshBasicMaterial) {
              const color = material.color;
              const colorKey = materials.length > 1 ? `${meshName}_material_${index}` : meshName;
              colors[colorKey] = {
                hex: '#' + color.getHexString(),
                rgb: {
                  r: Math.round(color.r * 255),
                  g: Math.round(color.g * 255),
                  b: Math.round(color.b * 255)
                }
              };
            }
          });
        }
      }
    });

    return colors;
  }

  /**
   * Extract logo/decal placement data
   */
  private extractLogoData(): any[] {
    const logoData: any[] = [];

    this.decals.forEach((decal, index) => {
      // Get decal geometry to extract position
      const decalGeometry = decal.geometry as DecalGeometry;

      // Extract position from decal mesh
      const position = decal.position.clone();

      // Try to get the stored state for this decal
      let storedState = null;
      if (decal === this.activeDecalMesh && this.decalState) {
        storedState = this.decalState;
      }

      // Calculate the center position from geometry if available
      if (decalGeometry && decalGeometry.boundingSphere) {
        position.copy(decalGeometry.boundingSphere.center);
      }

      const logoEntry: any = {
        id: `logo_${index + 1}`,
        position: {
          x: parseFloat(position.x.toFixed(4)),
          y: parseFloat(position.y.toFixed(4)),
          z: parseFloat(position.z.toFixed(4))
        },
        scale: parseFloat(this.decalScale.toFixed(3)),
        rotation: parseFloat(this.decalRotation.toFixed(2)),
        logoTexture: this.logoTexture ? 'custom_uploaded_logo.png' : 'none'
      };

      // Add normal if available from stored state
      if (storedState && storedState.normal) {
        logoEntry.normal = {
          x: parseFloat(storedState.normal.x.toFixed(4)),
          y: parseFloat(storedState.normal.y.toFixed(4)),
          z: parseFloat(storedState.normal.z.toFixed(4))
        };
      }

      // Add size if available
      if (storedState && storedState.size) {
        logoEntry.size = {
          x: parseFloat(storedState.size.x.toFixed(4)),
          y: parseFloat(storedState.size.y.toFixed(4)),
          z: parseFloat(storedState.size.z.toFixed(4))
        };
      }

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

    // Remove click and drag listeners for decals
    if (this.renderer && this.renderer.domElement) {
      this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown.bind(this));
      this.renderer.domElement.removeEventListener('pointermove', this.onPointerMove.bind(this));
      this.renderer.domElement.removeEventListener('pointerup', this.onPointerUp.bind(this));
    }

    // Cancel animation frame
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    // Dispose of controls
    if (this.controls) {
      this.controls.dispose();
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
