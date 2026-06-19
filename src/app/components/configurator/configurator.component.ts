import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// ─── Logo state ────────────────────────────────────────────────────────────────
interface LogoState {
  mesh: THREE.Mesh;
  // Anchor: the point on the shirt surface where the logo was placed
  anchorPoint: THREE.Vector3;
  anchorNormal: THREE.Vector3;
  // Offsets from anchor in tangent/bitangent space (for move)
  offsetX: number;
  offsetY: number;
  // Rotation around surface normal (radians)
  rotation: number;
  // Uniform scale
  scale: number;
}

// ─── Overlay handle ────────────────────────────────────────────────────────────
type HandleType = 'move' | 'rotate' | 'scale-tl' | 'scale-tr' | 'scale-bl' | 'scale-br';

interface OverlayHandle {
  type: HandleType;
  x: number; // canvas-local px
  y: number;
  cursor: string;
}

// ─── Part label map ────────────────────────────────────────────────────────────
const PART_LABELS: Record<string, string> = {
  Object_14: 'Front Body',
  Object_20: 'Back Body',
  Object_18: 'Left Sleeve',
  Object_10: 'Right Sleeve',
  Object_8:  'Collar',
};

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
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private loader = new GLTFLoader();
  private texLoader = new THREE.TextureLoader();
  private rafId = 0;

  // ─── Model ───────────────────────────────────────────────────────────────────
  private model: THREE.Group | null = null;
  private modelRadius = 2;

  // ─── Colors ──────────────────────────────────────────────────────────────────
  meshParts = ['Object_14', 'Object_20', 'Object_18', 'Object_10', 'Object_8'];
  private partColors = new Map<string, string>();
  selectedPart = '';
  globalClothColor = '#ffffff';

  // ─── Logo ────────────────────────────────────────────────────────────────────
  logoTexture: THREE.Texture | null = null;
  private logoAspect = 1;
  private logo: LogoState | null = null;

  get hasLogo() { return !!this.logo; }

  // ─── Overlay (2D HTML handles over the 3D canvas) ────────────────────────────
  // logoBox is updated every frame via projectLogo(); used for hit-testing always
  logoBox = { cx: 0, cy: 0, hw: 0, hh: 0 }; // canvas-local px
  logoSelected = false;
  overlayHandles: OverlayHandle[] = [];
  overlayBoxStyle: Record<string, string> = { display: 'none' };
  rotateHandlePos = { x: 0, y: 0 };
  canvasCursor = 'default';

  // ─── Drag state ──────────────────────────────────────────────────────────────
  private activeHandle: HandleType | null = null;
  // Stored at drag-start (client coords)
  private dragStart = { x: 0, y: 0 };
  // Logo state at drag-start
  private dragOrigin = { offsetX: 0, offsetY: 0, rotation: 0, scale: 1 };

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

  // ─── Bound handlers (stored for removeEventListener) ────────────────────────
  private _onPointerDown!: (e: PointerEvent) => void;
  private _onPointerMove!: (e: PointerEvent) => void;
  private _onPointerUp!:   (e: PointerEvent) => void;
  private _onResize!:      () => void;

  constructor(private ngZone: NgZone) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // Lifecycle
  // ═══════════════════════════════════════════════════════════════════════════

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      this.initScene();
      this.loadModel();

      this._onPointerDown = this.onPointerDown.bind(this);
      this._onPointerMove = this.onPointerMove.bind(this);
      this._onPointerUp   = this.onPointerUp.bind(this);
      this._onResize      = this.onResize.bind(this);

      this.renderer.domElement.addEventListener('pointerdown', this._onPointerDown);
      window.addEventListener('pointermove', this._onPointerMove);
      window.addEventListener('pointerup',   this._onPointerUp);
      window.addEventListener('resize',      this._onResize);

      this.loop();
    });
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.rafId);
    this.renderer?.domElement.removeEventListener('pointerdown', this._onPointerDown);
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

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(40, el.clientWidth / el.clientHeight, 0.01, 500);
    this.camera.position.set(0, 0, 6);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(el.clientWidth, el.clientHeight);
    this.renderer.shadowMap.enabled = true;
    el.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping  = true;
    this.controls.dampingFactor  = 0.07;
    this.controls.enablePan      = false;
    this.controls.minDistance    = 2;
    this.controls.maxDistance    = 14;
    this.controls.target.set(0, 0, 0);
    this.controls.update();

    // Lighting
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

      // Clone materials & collect colors
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

      // ── Fix orientation: if model is flat (lying down), rotate upright ──
      const rawBox  = new THREE.Box3().setFromObject(this.model);
      const rawSize = rawBox.getSize(new THREE.Vector3());
      if (rawSize.y < rawSize.x * 0.8) {
        this.model.rotation.x = -Math.PI / 2;
      }

      // ── Scale to fixed height ──
      const box1  = new THREE.Box3().setFromObject(this.model);
      const size1 = box1.getSize(new THREE.Vector3());
      const scale = 2.4 / size1.y;
      this.model.scale.multiplyScalar(scale);

      // ── Center precisely (must recompute after scale) ──
      const box2   = new THREE.Box3().setFromObject(this.model);
      const center = box2.getCenter(new THREE.Vector3());
      this.model.position.sub(center);

      // ── Bounding sphere for camera/zoom math ──
      const sphere = box2.getBoundingSphere(new THREE.Sphere());
      this.modelRadius = sphere.radius;

      // ── Fit camera ──
      const fovRad = (this.camera.fov * Math.PI) / 180;
      const dist   = (this.modelRadius / Math.sin(fovRad / 2)) * 1.15;
      this.camera.position.set(0, 0, dist);
      this.camera.lookAt(0, 0, 0);
      this.controls.target.set(0, 0, 0);
      this.controls.minDistance = dist * 0.3;
      this.controls.maxDistance = dist * 3.5;

      // ── Lock to horizontal orbit only ──
      this.controls.minPolarAngle = Math.PI / 2;
      this.controls.maxPolarAngle = Math.PI / 2;
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
    this.controls.minPolarAngle = Math.PI / 2;
    this.controls.maxPolarAngle = Math.PI / 2;
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
  // Logo 3D mesh  (PlaneGeometry hugging the shirt surface)
  // ═══════════════════════════════════════════════════════════════════════════

  private buildLogoMesh(): THREE.Mesh {
    const h    = this.modelRadius * 0.28;
    const w    = h * this.logoAspect;
    const geom = new THREE.PlaneGeometry(w, h);
    const mat  = new THREE.MeshBasicMaterial({
      map:         this.logoTexture!,
      transparent: true,
      depthWrite:  false,
      side:        THREE.DoubleSide,
      alphaTest:   0.01,
    });
    const mesh       = new THREE.Mesh(geom, mat);
    mesh.renderOrder = 999;
    return mesh;
  }

  // Recomputes position/rotation/scale of logo.mesh from logo state
  private applyLogoTransform(): void {
    if (!this.logo) return;
    const { anchorPoint, anchorNormal, offsetX, offsetY, rotation, scale, mesh } = this.logo;

    // Build tangent frame from surface normal
    const n   = anchorNormal.clone().normalize();
    const up  = Math.abs(n.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const tan = new THREE.Vector3().crossVectors(up, n).normalize();
    const bit = new THREE.Vector3().crossVectors(n, tan).normalize();

    // World position: anchor + offset along tangent/bitangent + small nudge outward
    const nudge = this.modelRadius * 0.015;
    const pos   = anchorPoint.clone()
      .addScaledVector(tan, offsetX)
      .addScaledVector(bit, offsetY)
      .addScaledVector(n,   nudge);

    mesh.position.copy(pos);

    // Orientation: face outward along normal, then rotate around normal
    const baseQ = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
    const rotQ  = new THREE.Quaternion().setFromAxisAngle(n, rotation);
    mesh.quaternion.copy(rotQ).multiply(baseQ);

    mesh.scale.setScalar(scale);
  }

  private placeLogo(hitPoint: THREE.Vector3, hitNormal: THREE.Vector3): void {
    if (!this.logoTexture) return;
    this.destroyLogo();

    const mesh = this.buildLogoMesh();
    this.scene.add(mesh);

    this.logo = {
      mesh,
      anchorPoint:  hitPoint.clone(),
      anchorNormal: hitNormal.clone(),
      offsetX:  0,
      offsetY:  0,
      rotation: 0,
      scale:    1,
    };
    this.applyLogoTransform();

    // Select immediately after placing
    this.logoSelected      = true;
    this.controls.enabled  = false;
  }

  private destroyLogo(): void {
    if (!this.logo) return;
    this.scene.remove(this.logo.mesh);
    this.logo.mesh.geometry.dispose();
    const mats = Array.isArray(this.logo.mesh.material)
      ? this.logo.mesh.material : [this.logo.mesh.material];
    mats.forEach((m: any) => m?.dispose());
    this.logo         = null;
    this.logoSelected = false;
    this.activeHandle = null;
    this.controls.enabled = true;
    this.overlayHandles   = [];
    this.overlayBoxStyle  = { display: 'none' };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2-D overlay: project logo center to screen, compute handle positions
  // Called every frame from the render loop (outside Angular zone).
  // Only touches plain object fields — Angular will pick up changes on next tick
  // via zone re-entry when pointer events fire, or via markForCheck in CD.
  // ═══════════════════════════════════════════════════════════════════════════

  private projectLogo(): void {
    if (!this.logo) {
      this.logoBox.cx = this.logoBox.cy = 0;
      this.logoBox.hw = this.logoBox.hh = 0;
      return;
    }

    const { anchorPoint, anchorNormal, offsetX, offsetY, scale } = this.logo;
    const n   = anchorNormal.clone().normalize();
    const up  = Math.abs(n.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const tan = new THREE.Vector3().crossVectors(up, n).normalize();
    const bit = new THREE.Vector3().crossVectors(n, tan).normalize();
    const nudge = this.modelRadius * 0.015;

    const center3D = anchorPoint.clone()
      .addScaledVector(tan, offsetX)
      .addScaledVector(bit, offsetY)
      .addScaledVector(n,   nudge);

    const cs = this.toScreen(center3D);
    this.logoBox.cx = cs.x;
    this.logoBox.cy = cs.y;

    // Project edge midpoints to estimate screen extents
    const hw3D = this.modelRadius * 0.28 * this.logoAspect * scale / 2;
    const hh3D = this.modelRadius * 0.28 * scale / 2;
    const rEdge = this.toScreen(center3D.clone().addScaledVector(tan, hw3D));
    const tEdge = this.toScreen(center3D.clone().addScaledVector(bit, hh3D));
    this.logoBox.hw = Math.max(16, Math.abs(rEdge.x - cs.x));
    this.logoBox.hh = Math.max(16, Math.abs(tEdge.y - cs.y));
  }

  private toScreen(v: THREE.Vector3): { x: number; y: number } {
    const p  = v.clone().project(this.camera);
    const el = this.canvasContainer.nativeElement;
    return {
      x: (p.x + 1) / 2 * el.clientWidth,
      y: (-p.y + 1) / 2 * el.clientHeight,
    };
  }

  // Sync the visible overlay divs — called from Angular zone after state changes
  private syncOverlay(): void {
    if (!this.logo || !this.logoSelected) {
      this.overlayBoxStyle  = { display: 'none' };
      this.overlayHandles   = [];
      return;
    }
    const { cx, cy, hw, hh } = this.logoBox;
    this.overlayBoxStyle = {
      display: 'block',
      left:   `${cx - hw}px`,
      top:    `${cy - hh}px`,
      width:  `${hw * 2}px`,
      height: `${hh * 2}px`,
    };
    this.rotateHandlePos = { x: cx, y: cy - hh - 36 };
    this.overlayHandles = [
      { type: 'scale-tl', x: cx - hw, y: cy - hh, cursor: 'nwse-resize' },
      { type: 'scale-tr', x: cx + hw, y: cy - hh, cursor: 'nesw-resize' },
      { type: 'scale-bl', x: cx - hw, y: cy + hh, cursor: 'nesw-resize' },
      { type: 'scale-br', x: cx + hw, y: cy + hh, cursor: 'nwse-resize' },
    ];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Hit testing (canvas-local px)
  // ═══════════════════════════════════════════════════════════════════════════

  private hitRotate(sx: number, sy: number): boolean {
    return Math.hypot(sx - this.rotateHandlePos.x, sy - this.rotateHandlePos.y) < 20;
  }

  private hitScale(sx: number, sy: number): OverlayHandle | null {
    return this.overlayHandles.find(h => Math.hypot(h.x - sx, h.y - sy) < 18) ?? null;
  }

  private hitBody(sx: number, sy: number): boolean {
    const { cx, cy, hw, hh } = this.logoBox;
    return Math.abs(sx - cx) <= hw && Math.abs(sy - cy) <= hh;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Pointer events
  // ═══════════════════════════════════════════════════════════════════════════

  private onPointerDown(e: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const sx   = e.clientX - rect.left;
    const sy   = e.clientY - rect.top;

    if (this.logo) {
      // ── Logo selected: check handles first ──
      if (this.logoSelected) {
        if (this.hitRotate(sx, sy)) {
          this.beginDrag('rotate', e);
          e.stopPropagation();
          return;
        }
        const sh = this.hitScale(sx, sy);
        if (sh) {
          this.beginDrag(sh.type, e);
          e.stopPropagation();
          return;
        }
      }

      // ── Click inside logo body: select + start move ──
      if (this.hitBody(sx, sy)) {
        this.ngZone.run(() => {
          this.logoSelected     = true;
          this.controls.enabled = false;
          this.syncOverlay();
        });
        this.beginDrag('move', e);
        e.stopPropagation();
        return;
      }

      // ── Click outside logo: deselect, let orbit run ──
      if (this.logoSelected) {
        this.ngZone.run(() => {
          this.logoSelected     = false;
          this.controls.enabled = true;
          this.syncOverlay();
        });
      }
      return;
    }

    // ── No logo yet: place on shirt ──
    if (this.logoTexture && this.model) {
      const ndcX = (sx / rect.width)  *  2 - 1;
      const ndcY = (sy / rect.height) * -2 + 1;
      const ray  = new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
      const hits = ray.intersectObject(this.model, true);
      if (hits.length && hits[0].face) {
        const hit    = hits[0];
        const normal = hit.face!.normal.clone()
          .transformDirection((hit.object as THREE.Mesh).matrixWorld)
          .normalize();
        this.ngZone.run(() => {
          this.placeLogo(hit.point, normal);
          this.syncOverlay();
        });
        e.stopPropagation();
      }
    }
  }

  private beginDrag(type: HandleType, e: PointerEvent): void {
    this.activeHandle = type;
    this.dragStart    = { x: e.clientX, y: e.clientY };
    this.dragOrigin   = {
      offsetX:  this.logo!.offsetX,
      offsetY:  this.logo!.offsetY,
      rotation: this.logo!.rotation,
      scale:    this.logo!.scale,
    };
    this.controls.enabled = false;
  }

  private onPointerMove(e: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const sx   = e.clientX - rect.left;
    const sy   = e.clientY - rect.top;

    // ── Cursor updates (no drag active) ──
    if (!this.activeHandle) {
      this.updateCursor(sx, sy);
      return;
    }

    if (!this.logo) return;

    const el     = this.canvasContainer.nativeElement;
    // world units per screen pixel (approximate)
    const wpp    = (this.modelRadius * 2.4) / el.clientHeight;
    // canvas-local delta from drag start
    const dsx    = e.clientX - this.dragStart.x;
    const dsy    = e.clientY - this.dragStart.y;
    // current canvas-local mouse pos
    const curSx  = sx;
    const curSy  = sy;
    // drag-start in canvas-local
    const startSx = this.dragStart.x - rect.left;
    const startSy = this.dragStart.y - rect.top;

    if (this.activeHandle === 'move') {
      this.logo.offsetX = this.dragOrigin.offsetX + dsx * wpp;
      this.logo.offsetY = this.dragOrigin.offsetY - dsy * wpp;
      this.applyLogoTransform();

    } else if (this.activeHandle === 'rotate') {
      const cx = this.logoBox.cx;
      const cy = this.logoBox.cy;
      const a0 = Math.atan2(startSy - cy, startSx - cx);
      const a1 = Math.atan2(curSy  - cy, curSx  - cx);
      this.logo.rotation = this.dragOrigin.rotation + (a1 - a0);
      this.applyLogoTransform();

    } else if (this.activeHandle?.startsWith('scale')) {
      const cx  = this.logoBox.cx;
      const cy  = this.logoBox.cy;
      const d0  = Math.hypot(startSx - cx, startSy - cy);
      const d1  = Math.hypot(curSx   - cx, curSy   - cy);
      const ratio = d0 > 1 ? d1 / d0 : 1;
      this.logo.scale = Math.max(0.05, this.dragOrigin.scale * ratio);
      this.applyLogoTransform();
    }
  }

  private onPointerUp(_e: PointerEvent): void {
    if (!this.activeHandle) return;
    this.activeHandle = null;
    // Keep orbit disabled while logo is selected
    this.controls.enabled = !this.logoSelected;
  }

  private updateCursor(sx: number, sy: number): void {
    if (!this.logo) {
      this.canvasCursor = this.logoTexture ? 'crosshair' : 'default';
      return;
    }
    if (this.logoSelected) {
      if (this.hitRotate(sx, sy))           { this.canvasCursor = 'grab';       return; }
      const sh = this.hitScale(sx, sy);
      if (sh)                               { this.canvasCursor = sh.cursor;    return; }
    }
    if (this.hitBody(sx, sy))              { this.canvasCursor = 'move';       return; }
    this.canvasCursor = 'default';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Render loop
  // ═══════════════════════════════════════════════════════════════════════════

  private loop(): void {
    this.rafId = requestAnimationFrame(() => this.loop());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    // Always project logo so hit-testing is accurate even when deselected
    if (this.logo) {
      this.projectLogo();
      if (this.logoSelected) {
        // Sync overlay every frame while selected so it tracks the model as it rotates
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
      offsetX:  this.logo.offsetX,
      offsetY:  this.logo.offsetY,
      rotation: this.logo.rotation,
      scale:    this.logo.scale,
    } : null;
    const json = JSON.stringify(
      { timestamp: new Date().toISOString(), version: 'v5.0', garment: { colors }, logo },
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
