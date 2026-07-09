import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DecalGeometry } from 'three/examples/jsm/geometries/DecalGeometry.js';

// ─── Logo state ───────────────────────────────────────────────────────────────
interface LogoState {
  mesh:       THREE.Mesh;
  targetMesh: THREE.Mesh;
  hitPoint:   THREE.Vector3;
  hitNormal:  THREE.Vector3;
  rotation:   number;
  scale:      number;
}

// ─── Overlay handle ───────────────────────────────────────────────────────────
type HandleType = 'move' | 'rotate' | 'scale-tl' | 'scale-tr' | 'scale-bl' | 'scale-br';

interface OverlayHandle {
  type:   HandleType;
  x:      number;
  y:      number;
  cursor: string;
}

// ─── Part label map ───────────────────────────────────────────────────────────
const PART_LABELS: Record<string, string> = {
  Object_14: 'Front Body',
  Object_20: 'Back Body',
  Object_18: 'Left Sleeve',
  Object_10: 'Right Sleeve',
  Object_8:  'Collar',
};

const DECAL_BASE = 0.32;

@Component({
  selector: 'app-configurator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './configurator.component.html',
  styleUrl: './configurator.component.scss',
})
export class ConfiguratorComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvasContainer', { static: false }) canvasContainer!: ElementRef<HTMLDivElement>;

  // ─── Three.js ────────────────────────────────────────────────────────────────
  private scene!:    THREE.Scene;
  private camera!:   THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private loader    = new GLTFLoader();
  private texLoader = new THREE.TextureLoader();
  private rafId     = 0;

  // ─── Model ───────────────────────────────────────────────────────────────────
  private model:       THREE.Group | null = null;
  private modelRadius  = 2;

  // ─── Colors ──────────────────────────────────────────────────────────────────
  meshParts        = ['Object_14', 'Object_20', 'Object_18', 'Object_10', 'Object_8'];
  private partColors = new Map<string, string>();
  selectedPart     = '';
  globalClothColor = '#ffffff';

  // ─── Logo ────────────────────────────────────────────────────────────────────
  logoTexture: THREE.Texture | null = null;
  private logoAspect = 1;
  private logo: LogoState | null = null;
  get hasLogo() { return !!this.logo; }

  // ─── Overlay ─────────────────────────────────────────────────────────────────
  logoBox          = { cx: 0, cy: 0, hw: 0, hh: 0 };
  logoSelected     = false;
  overlayHandles:    OverlayHandle[] = [];
  overlayBoxStyle:   Record<string, string> = { display: 'none' };
  rotateHandlePos  = { x: 0, y: 0 };
  canvasCursor     = 'default';

  // ─── Drag state ──────────────────────────────────────────────────────────────
  // All coordinates are canvas-local pixels
  private activeHandle: HandleType | null = null;
  private dragStartCanvas = { x: 0, y: 0 };   // canvas-local px at drag start
  private dragOrigin = { rotation: 0, scale: 1, pivotX: 0, pivotY: 0 };

  // ─── UI ──────────────────────────────────────────────────────────────────────
  activeStep: 'color' | 'logo' | 'export' = 'color';

  colorSwatches = [
    { name: 'White',      hex: '#ffffff' },
    { name: 'Light Gray', hex: '#e8edf2' },
    { name: 'Slate',      hex: '#64748b' },
    { name: 'Black',      hex: '#1e293b' },
    { name: 'Navy',       hex: '#1e3a8a' },
    { name: 'Sky Blue',   hex: '#38bdf8' },
    { name: 'Indigo',     hex: '#6366f1' },
    { name: 'Emerald',    hex: '#10b981' },
    { name: 'Red',        hex: '#ef4444' },
    { name: 'Orange',     hex: '#f97316' },
    { name: 'Yellow',     hex: '#facc15' },
    { name: 'Pink',       hex: '#ec4899' },
  ];

  // ─── Bound handlers ──────────────────────────────────────────────────────────
  private _onCanvasPointerDown!: (e: PointerEvent) => void;
  private _onPointerMove!:       (e: PointerEvent) => void;
  private _onPointerUp!:         (e: PointerEvent) => void;
  private _onResize!:            () => void;

  constructor(private ngZone: NgZone) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // Lifecycle
  // ═══════════════════════════════════════════════════════════════════════════

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      this.initScene();
      this.loadModel();

      this._onCanvasPointerDown = this.onCanvasPointerDown.bind(this);
      this._onPointerMove       = this.onPointerMove.bind(this);
      this._onPointerUp         = this.onPointerUp.bind(this);
      this._onResize            = this.onResize.bind(this);

      this.renderer.domElement.addEventListener('pointerdown', this._onCanvasPointerDown);
      window.addEventListener('pointermove', this._onPointerMove);
      window.addEventListener('pointerup',   this._onPointerUp);
      window.addEventListener('resize',      this._onResize);

      this.loop();
    });
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.rafId);
    this.renderer?.domElement.removeEventListener('pointerdown', this._onCanvasPointerDown);
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerup',   this._onPointerUp);
    window.removeEventListener('resize',      this._onResize);
    this.controls?.dispose();
    this.destroyLogo();
    this.logoTexture?.dispose();
    this.renderer?.dispose();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Scene init
  // ═══════════════════════════════════════════════════════════════════════════

  private initScene(): void {
    const el = this.canvasContainer.nativeElement;

    this.scene  = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, el.clientWidth / el.clientHeight, 0.01, 500);
    this.camera.position.set(0, 0, 6);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(el.clientWidth, el.clientHeight);
    this.renderer.shadowMap.enabled = true;
    el.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.enablePan    = false;
    this.controls.minDistance  = 2;
    this.controls.maxDistance  = 14;
    this.controls.target.set(0, 0, 0);
    this.controls.update();

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(4, 6, 5);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.4);
    fill.position.set(-4, 2, -3);
    this.scene.add(fill);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Model loading
  // ═══════════════════════════════════════════════════════════════════════════

  loadModel(): void {
    this.loader.load('./assets/glb/t_shirt.glb', (gltf) => {
      this.model = gltf.scene;

      this.model.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.castShadow = mesh.receiveShadow = true;
        if (mesh.material) {
          mesh.material = Array.isArray(mesh.material)
            ? mesh.material.map((m: THREE.Material) => m.clone())
            : (mesh.material as THREE.Material).clone();
        }
        if (this.meshParts.includes(mesh.name)) {
          this.partColors.set(mesh.name, this.getMeshColor(mesh));
        }
      });

      const rawBox  = new THREE.Box3().setFromObject(this.model);
      const rawSize = rawBox.getSize(new THREE.Vector3());
      if (rawSize.y < rawSize.x * 0.8) this.model.rotation.x = -Math.PI / 2;

      const box1  = new THREE.Box3().setFromObject(this.model);
      const size1 = box1.getSize(new THREE.Vector3());
      this.model.scale.multiplyScalar(2.4 / size1.y);

      const box2   = new THREE.Box3().setFromObject(this.model);
      const center = box2.getCenter(new THREE.Vector3());
      this.model.position.sub(center);

      const sphere = box2.getBoundingSphere(new THREE.Sphere());
      this.modelRadius = sphere.radius;

      const fovRad = (this.camera.fov * Math.PI) / 180;
      const dist   = (this.modelRadius / Math.sin(fovRad / 2)) * 1.15;
      this.camera.position.set(0, 0, dist);
      this.camera.lookAt(0, 0, 0);
      this.controls.target.set(0, 0, 0);
      this.controls.minDistance    = dist * 0.3;
      this.controls.maxDistance    = dist * 3.5;
      this.controls.minPolarAngle  = Math.PI * 0.1;
      this.controls.maxPolarAngle  = Math.PI * 0.9;
      this.controls.update();

      this.scene.add(this.model);
    }, undefined, (err) => console.error('GLB load error:', err));
  }

  private getMeshColor(mesh: THREE.Mesh): string {
    const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as any;
    return mat?.color ? '#' + mat.color.getHexString() : '#ffffff';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Colors
  // ═══════════════════════════════════════════════════════════════════════════

  getPartLabel(p: string) { return PART_LABELS[p] || p; }
  getPartColor(p: string) { return this.partColors.get(p) || '#ffffff'; }

  applyGlobalColor(hex: string): void {
    this.globalClothColor = hex;
    this.meshParts.forEach(p => { this.setMeshColor(p, hex); this.partColors.set(p, hex); });
  }

  onGlobalColorChange(e: Event): void {
    this.applyGlobalColor((e.target as HTMLInputElement).value);
  }

  openGlobalColorPicker(): void {
    (document.getElementById('globalColorPicker') as HTMLInputElement)?.click();
  }

  openColorPicker(i: number, part: string): void {
    this.selectedPart = part;
    (document.getElementById(`colorPicker-${i}`) as HTMLInputElement)?.click();
  }

  onColorChange(e: Event, part: string): void {
    const hex = (e.target as HTMLInputElement).value;
    this.setMeshColor(part, hex);
    this.partColors.set(part, hex);
  }

  private setMeshColor(name: string, hex: string): void {
    const mesh = this.model?.getObjectByName(name) as THREE.Mesh;
    if (!mesh?.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mats.forEach((m: any) => { if (m?.color) { m.color.set(hex); m.needsUpdate = true; } });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Camera controls
  // ═══════════════════════════════════════════════════════════════════════════

  zoomIn(): void {
    const dir = new THREE.Vector3().subVectors(this.controls.target, this.camera.position).normalize();
    this.camera.position.addScaledVector(dir, this.modelRadius * 0.3);
    this.controls.update();
  }

  zoomOut(): void {
    const dir = new THREE.Vector3().subVectors(this.camera.position, this.controls.target).normalize();
    this.camera.position.addScaledVector(dir, this.modelRadius * 0.3);
    this.controls.update();
  }

  resetCamera(): void {
    const fovRad = (this.camera.fov * Math.PI) / 180;
    const dist   = (this.modelRadius / Math.sin(fovRad / 2)) * 1.15;
    this.camera.position.set(0, 0, dist);
    this.camera.lookAt(0, 0, 0);
    this.controls.target.set(0, 0, 0);
    this.controls.minPolarAngle = Math.PI * 0.1;
    this.controls.maxPolarAngle = Math.PI * 0.9;
    this.controls.update();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Logo upload / remove
  // ═══════════════════════════════════════════════════════════════════════════

  handleLogoUpload(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please upload an image.'); return; }
    if (file.size > 5 * 1024 * 1024)    { alert('Max file size is 5 MB.');  return; }

    const reader = new FileReader();
    reader.onload = (ev) => {
      this.texLoader.load(ev.target!.result as string, (tex) => {
        this.logoTexture?.dispose();
        this.logoTexture = tex;
        this.logoAspect  = tex.image?.width && tex.image?.height
          ? tex.image.width / tex.image.height : 1;
        if (this.logo) this.rebuildDecal();
      });
    };
    reader.readAsDataURL(file);
  }

  removeUploadedLogo(): void {
    this.destroyLogo();
    this.logoTexture?.dispose();
    this.logoTexture = null;
    this.logoAspect  = 1;
  }

  removePlacedLogo(): void {
    this.destroyLogo();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Decal
  // ═══════════════════════════════════════════════════════════════════════════

  private buildDecalMaterial(): THREE.MeshBasicMaterial {
    return new THREE.MeshBasicMaterial({
      map:                 this.logoTexture!,
      transparent:         true,
      depthTest:           true,
      depthWrite:          false,
      polygonOffset:       true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits:  -4,
      side:                THREE.FrontSide,
      alphaTest:           0.05,
    });
  }

  private buildDecalGeometry(
    targetMesh:  THREE.Mesh,
    point:       THREE.Vector3,
    normal:      THREE.Vector3,
    rotationRad: number,
    scale:       number,
  ): THREE.BufferGeometry {
    const size = DECAL_BASE * scale;
    const w    = size * this.logoAspect;
    const h    = size;
    const d    = size * 2;

    const up     = Math.abs(normal.y) < 0.9
      ? new THREE.Vector3(0, 1, 0)
      : new THREE.Vector3(1, 0, 0);
    const tan    = new THREE.Vector3().crossVectors(up, normal).normalize();
    const bit    = new THREE.Vector3().crossVectors(normal, tan).normalize();

    const cosR   = Math.cos(rotationRad);
    const sinR   = Math.sin(rotationRad);
    const rotTan = tan.clone().multiplyScalar(cosR).addScaledVector(bit, -sinR);
    const rotBit = tan.clone().multiplyScalar(sinR).addScaledVector(bit,  cosR);

    const mat   = new THREE.Matrix4().makeBasis(rotTan, rotBit, normal);
    const euler = new THREE.Euler().setFromRotationMatrix(mat);

    return new DecalGeometry(targetMesh, point, euler, new THREE.Vector3(w, h, d));
  }

  private rebuildDecal(): void {
    if (!this.logo || !this.logoTexture) return;
    this.scene.remove(this.logo.mesh);
    this.logo.mesh.geometry.dispose();
    (this.logo.mesh.material as THREE.Material).dispose();

    const geom = this.buildDecalGeometry(
      this.logo.targetMesh, this.logo.hitPoint, this.logo.hitNormal,
      this.logo.rotation, this.logo.scale,
    );
    const mesh       = new THREE.Mesh(geom, this.buildDecalMaterial());
    mesh.renderOrder = 999;
    this.scene.add(mesh);
    this.logo.mesh = mesh;
  }

  private placeLogo(targetMesh: THREE.Mesh, hitPoint: THREE.Vector3, hitNormal: THREE.Vector3): void {
    if (!this.logoTexture) return;
    this.destroyLogo();

    const geom       = this.buildDecalGeometry(targetMesh, hitPoint, hitNormal, 0, 1);
    const mesh       = new THREE.Mesh(geom, this.buildDecalMaterial());
    mesh.renderOrder = 999;
    this.scene.add(mesh);

    this.logo = {
      mesh, targetMesh,
      hitPoint:  hitPoint.clone(),
      hitNormal: hitNormal.clone(),
      rotation:  0,
      scale:     1,
    };
    this.logoSelected     = true;
    this.controls.enabled = false;
  }

  private destroyLogo(): void {
    if (!this.logo) return;
    this.scene.remove(this.logo.mesh);
    this.logo.mesh.geometry.dispose();
    (Array.isArray(this.logo.mesh.material)
      ? this.logo.mesh.material
      : [this.logo.mesh.material]
    ).forEach((m: any) => m?.dispose());
    this.logo             = null;
    this.logoSelected     = false;
    this.activeHandle     = null;
    this.controls.enabled = true;
    this.overlayHandles   = [];
    this.overlayBoxStyle  = { display: 'none' };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Overlay projection  (called every frame)
  // ═══════════════════════════════════════════════════════════════════════════

  private projectLogo(): void {
    if (!this.logo) {
      this.logoBox.cx = this.logoBox.cy = this.logoBox.hw = this.logoBox.hh = 0;
      return;
    }
    const { hitPoint, hitNormal, rotation, scale } = this.logo;
    const up  = Math.abs(hitNormal.y) < 0.9 ? new THREE.Vector3(0,1,0) : new THREE.Vector3(1,0,0);
    const tan = new THREE.Vector3().crossVectors(up, hitNormal).normalize();
    const bit = new THREE.Vector3().crossVectors(hitNormal, tan).normalize();

    const cosR   = Math.cos(rotation);
    const sinR   = Math.sin(rotation);
    const rotTan = tan.clone().multiplyScalar(cosR).addScaledVector(bit, -sinR);
    const rotBit = tan.clone().multiplyScalar(sinR).addScaledVector(bit,  cosR);

    const hw3D     = DECAL_BASE * scale * this.logoAspect / 2;
    const hh3D     = DECAL_BASE * scale / 2;
    const center3D = hitPoint.clone().addScaledVector(hitNormal, 0.002);

    const cs = this.toScreen(center3D);
    this.logoBox.cx = cs.x;
    this.logoBox.cy = cs.y;

    const rEdge = this.toScreen(center3D.clone().addScaledVector(rotTan, hw3D));
    const tEdge = this.toScreen(center3D.clone().addScaledVector(rotBit, hh3D));
    this.logoBox.hw = Math.max(18, Math.abs(rEdge.x - cs.x));
    this.logoBox.hh = Math.max(18, Math.abs(tEdge.y - cs.y));
  }

  private toScreen(v: THREE.Vector3): { x: number; y: number } {
    const p  = v.clone().project(this.camera);
    const el = this.canvasContainer.nativeElement;
    return {
      x: (p.x  + 1) / 2 * el.clientWidth,
      y: (-p.y + 1) / 2 * el.clientHeight,
    };
  }

  // Reproject center directly from world — always fresh, never stale
  private getFreshCenter(): { cx: number; cy: number } {
    if (!this.logo) return { cx: 0, cy: 0 };
    const pt = this.logo.hitPoint.clone().addScaledVector(this.logo.hitNormal, 0.002);
    const sc = this.toScreen(pt);
    return { cx: sc.x, cy: sc.y };
  }

  private syncOverlay(): void {
    if (!this.logo || !this.logoSelected) {
      this.overlayBoxStyle = { display: 'none' };
      this.overlayHandles  = [];
      return;
    }
    const { cx, cy, hw, hh } = this.logoBox;
    this.overlayBoxStyle = {
      display: 'block',
      left:    `${cx - hw}px`,
      top:     `${cy - hh}px`,
      width:   `${hw * 2}px`,
      height:  `${hh * 2}px`,
    };
    this.rotateHandlePos = { x: cx, y: cy - hh - 36 };
    this.overlayHandles  = [
      { type: 'scale-tl', x: cx - hw, y: cy - hh, cursor: 'nwse-resize' },
      { type: 'scale-tr', x: cx + hw, y: cy - hh, cursor: 'nesw-resize' },
      { type: 'scale-bl', x: cx - hw, y: cy + hh, cursor: 'nesw-resize' },
      { type: 'scale-br', x: cx + hw, y: cy + hh, cursor: 'nwse-resize' },
    ];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Hit testing  (canvas-local px)
  // ═══════════════════════════════════════════════════════════════════════════

  private hitBody(sx: number, sy: number): boolean {
    const { cx, cy, hw, hh } = this.logoBox;
    return Math.abs(sx - cx) <= hw && Math.abs(sy - cy) <= hh;
  }

  private canvasLocal(e: PointerEvent): { sx: number; sy: number } {
    const rect = this.renderer.domElement.getBoundingClientRect();
    return { sx: e.clientX - rect.left, sy: e.clientY - rect.top };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Raycast
  // ═══════════════════════════════════════════════════════════════════════════

  private raycastShirt(sx: number, sy: number): { mesh: THREE.Mesh; point: THREE.Vector3; normal: THREE.Vector3 } | null {
    if (!this.model) return null;
    const el   = this.canvasContainer.nativeElement;
    const ndcX =  (sx / el.clientWidth)  * 2 - 1;
    const ndcY = -(sy / el.clientHeight) * 2 + 1;
    const ray  = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const hits = ray.intersectObject(this.model, true);
    if (!hits.length || !hits[0].face) return null;
    const hit    = hits[0];
    const normal = hit.face!.normal.clone()
      .transformDirection((hit.object as THREE.Mesh).matrixWorld)
      .normalize();
    return { mesh: hit.object as THREE.Mesh, point: hit.point.clone(), normal };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Drag bootstrap
  // ═══════════════════════════════════════════════════════════════════════════

  private beginDrag(type: HandleType, canvasSx: number, canvasSy: number): void {
    // Reproject center fresh from world — never stale
    const { cx, cy } = this.getFreshCenter();

    this.activeHandle     = type;
    this.dragStartCanvas  = { x: canvasSx, y: canvasSy };
    this.dragOrigin       = {
      rotation: this.logo!.rotation,
      scale:    this.logo!.scale,
      pivotX:   cx,
      pivotY:   cy,
    };
    this.controls.enabled = false;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HTML handle events — called directly from the template
  // These fire BEFORE the canvas pointerdown, so e.stopPropagation() keeps
  // the canvas from also handling the event.
  // ═══════════════════════════════════════════════════════════════════════════

  onRotateHandleDown(e: PointerEvent): void {
    e.stopPropagation();
    const { sx, sy } = this.canvasLocal(e);
    this.beginDrag('rotate', sx, sy);
    (e.target as Element).setPointerCapture(e.pointerId);
  }

  onScaleHandleDown(e: PointerEvent, type: HandleType): void {
    e.stopPropagation();
    const { sx, sy } = this.canvasLocal(e);
    this.beginDrag(type, sx, sy);
    (e.target as Element).setPointerCapture(e.pointerId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Canvas pointer events
  // ═══════════════════════════════════════════════════════════════════════════

  private onCanvasPointerDown(e: PointerEvent): void {
    const { sx, sy } = this.canvasLocal(e);

    if (this.logo) {
      if (this.hitBody(sx, sy)) {
        this.ngZone.run(() => {
          this.logoSelected     = true;
          this.controls.enabled = false;
          this.syncOverlay();
        });
        this.beginDrag('move', sx, sy);
        e.stopPropagation();
        return;
      }

      // Click outside logo body — deselect
      if (this.logoSelected) {
        this.ngZone.run(() => {
          this.logoSelected     = false;
          this.controls.enabled = true;
          this.syncOverlay();
        });
      }
      return;
    }

    // No logo yet — place on shirt
    if (this.logoTexture && this.model) {
      const hit = this.raycastShirt(sx, sy);
      if (hit) {
        this.ngZone.run(() => {
          this.placeLogo(hit.mesh, hit.point, hit.normal);
          this.syncOverlay();
        });
        e.stopPropagation();
      }
    }
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.activeHandle || !this.logo) {
      // Just update cursor when not dragging
      if (!this.activeHandle) {
        const { sx, sy } = this.canvasLocal(e);
        this.updateCursor(sx, sy);
      }
      return;
    }

    const { sx, sy } = this.canvasLocal(e);
    const startSx    = this.dragStartCanvas.x;
    const startSy    = this.dragStartCanvas.y;
    const px         = this.dragOrigin.pivotX;
    const py         = this.dragOrigin.pivotY;

    if (this.activeHandle === 'move') {
      const hit = this.raycastShirt(sx, sy);
      if (hit) {
        this.logo.hitPoint   = hit.point;
        this.logo.hitNormal  = hit.normal;
        this.logo.targetMesh = hit.mesh;
        this.rebuildDecal();
      }

    } else if (this.activeHandle === 'rotate') {
      const a0 = Math.atan2(startSy - py, startSx - px);
      const a1 = Math.atan2(sy      - py, sx      - px);
      this.logo.rotation = this.dragOrigin.rotation + (a1 - a0);
      this.rebuildDecal();

    } else if (this.activeHandle?.startsWith('scale')) {
      const d0    = Math.hypot(startSx - px, startSy - py);
      const d1    = Math.hypot(sx      - px, sy      - py);
      const ratio = d0 > 1 ? d1 / d0 : 1;
      this.logo.scale = Math.max(0.1, Math.min(8, this.dragOrigin.scale * ratio));
      this.rebuildDecal();
    }
  }

  private onPointerUp(_e: PointerEvent): void {
    if (!this.activeHandle) return;
    this.activeHandle     = null;
    this.controls.enabled = !this.logoSelected;
  }

  private updateCursor(sx: number, sy: number): void {
    if (!this.logo) {
      this.canvasCursor = this.logoTexture ? 'crosshair' : 'default';
      return;
    }
    if (this.hitBody(sx, sy)) { this.canvasCursor = 'move';    return; }
    this.canvasCursor = 'default';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Render loop
  // ═══════════════════════════════════════════════════════════════════════════

  private loop(): void {
    this.rafId = requestAnimationFrame(() => this.loop());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    if (this.logo) {
      this.projectLogo();
      if (this.logoSelected) {
        this.ngZone.run(() => this.syncOverlay());
      }
    }
  }

  private onResize(): void {
    const el = this.canvasContainer.nativeElement;
    this.camera.aspect = el.clientWidth / el.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(el.clientWidth, el.clientHeight);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Export
  // ═══════════════════════════════════════════════════════════════════════════

  exportProductionData(): void {
    const colors: any = {};
    this.partColors.forEach((hex, name) => {
      const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      colors[name] = {
        label: this.getPartLabel(name), hex,
        rgb: r ? { r: parseInt(r[1], 16), g: parseInt(r[2], 16), b: parseInt(r[3], 16) } : null,
      };
    });
    const logo = this.logo ? {
      hitPoint:  this.logo.hitPoint.toArray(),
      hitNormal: this.logo.hitNormal.toArray(),
      rotation:  this.logo.rotation,
      scale:     this.logo.scale,
    } : null;
    const json = JSON.stringify(
      { timestamp: new Date().toISOString(), version: 'v6.0', garment: { colors }, logo },
      null, 2,
    );
    const a = Object.assign(document.createElement('a'), {
      href:     URL.createObjectURL(new Blob([json], { type: 'application/json' })),
      download: `design-${Date.now()}.json`,
    });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
