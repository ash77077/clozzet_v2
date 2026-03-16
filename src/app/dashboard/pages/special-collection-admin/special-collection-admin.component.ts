import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  SpecialCollectionService,
  SpecialCollectionItem,
  SPECIAL_COLLECTION_CATEGORIES,
} from '../../../services/special-collection.service';

const MAX_IMAGES = 10;

/** An image entry that can be assigned to a specific color (or left as "general/cover") */
export interface ImageEntry {
  filename: string;
  /** Empty string = general/cover image; non-empty = color-specific */
  color: string;
}

/** Pending upload preview before the server returns the filename */
export interface PreviewEntry {
  url: string;
  file?: File;
  uploading?: boolean;
  color: string;
}

@Component({
  selector: 'app-special-collection-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './special-collection-admin.component.html',
  styleUrl: './special-collection-admin.component.scss',
})
export class SpecialCollectionAdminComponent implements OnInit {
  items = signal<SpecialCollectionItem[]>([]);
  loading = signal(true);
  saving = signal(false);
  error = signal<string | null>(null);
  editingId = signal<string | null>(null);
  showForm = signal(false);
  filterCategory = signal<string>('all');

  /** All images (general + color-specific) once uploaded to the server */
  uploadedImages = signal<ImageEntry[]>([]);
  /** Local object-URL previews for images pending upload */
  imagePreviews = signal<PreviewEntry[]>([]);
  uploadError = signal<string | null>(null);

  readonly maxImages = MAX_IMAGES;

  form!: FormGroup;
  categories = SPECIAL_COLLECTION_CATEGORIES;

  constructor(
    private fb: FormBuilder,
    private service: SpecialCollectionService,
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadItems();
  }

  private initForm(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: ['', [Validators.required]],
      price: [0, [Validators.required, Validators.min(0)]],
      costPrice: [0, [Validators.min(0)]],
      category: ['', [Validators.required]],
      material: [''],
      isActive: [true],
      variants: this.fb.array([]),
    });
  }

  get variantsArray(): FormArray {
    return this.form.get('variants') as FormArray;
  }

  /** Unique colors defined across all current variant rows */
  get availableColors(): string[] {
    return [
      ...new Set(
        this.variantsArray.controls
          .map(c => (c.get('color')?.value as string)?.trim())
          .filter(Boolean),
      ),
    ];
  }

  addVariant(): void {
    this.variantsArray.push(
      this.fb.group({
        size: ['', Validators.required],
        color: ['', Validators.required],
        quantity: [0, [Validators.required, Validators.min(0)]],
      }),
    );
  }

  removeVariant(index: number): void {
    this.variantsArray.removeAt(index);
  }

  // ─────────────────────────── Image handling ───────────────────────────

  onImageFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    const files = Array.from(input.files);
    const currentCount = this.uploadedImages().length + this.imagePreviews().filter(p => p.file).length;
    const available = MAX_IMAGES - currentCount;

    if (available <= 0) {
      this.uploadError.set(`Maximum ${MAX_IMAGES} images allowed.`);
      input.value = '';
      return;
    }

    const toUpload = files.slice(0, available);
    if (files.length > available) {
      this.uploadError.set(`Only ${available} more image(s) allowed. Extra files ignored.`);
    } else {
      this.uploadError.set(null);
    }

    toUpload.forEach(file => this.uploadSingleImage(file));
    input.value = '';
  }

  private uploadSingleImage(file: File, color = ''): void {
    const previewUrl = URL.createObjectURL(file);
    const entry: PreviewEntry = { url: previewUrl, file, uploading: true, color };

    this.imagePreviews.update(prev => [...prev, entry]);

    this.service.uploadImage(file).subscribe({
      next: res => {
        // Inherit the color the user may have set while the upload was in progress
        const currentEntry = this.imagePreviews().find(p => p === entry);
        const finalColor = currentEntry?.color ?? '';
        this.imagePreviews.update(prev => prev.filter(p => p !== entry));
        URL.revokeObjectURL(previewUrl);
        this.uploadedImages.update(imgs => [
          ...imgs,
          { filename: res.data.filename, color: finalColor },
        ]);
      },
      error: () => {
        this.imagePreviews.update(prev => prev.filter(p => p !== entry));
        URL.revokeObjectURL(previewUrl);
        this.uploadError.set(`Failed to upload "${file.name}". Please try again.`);
      },
    });
  }

  /** Assign (or reassign) a color to an already-uploaded image */
  setImageColor(filename: string, color: string): void {
    this.uploadedImages.update(imgs =>
      imgs.map(img => (img.filename === filename ? { ...img, color } : img)),
    );
  }

  /** Assign a color to a pending preview (while still uploading) */
  setPreviewColor(entry: PreviewEntry, color: string): void {
    this.imagePreviews.update(prev =>
      prev.map(p => (p === entry ? { ...p, color } : p)),
    );
  }

  removeUploadedImage(filename: string): void {
    this.service.deleteImage(filename).subscribe();
    this.uploadedImages.update(imgs => imgs.filter(i => i.filename !== filename));
  }

  removePendingPreview(entry: PreviewEntry): void {
    URL.revokeObjectURL(entry.url);
    this.imagePreviews.update(prev => prev.filter(p => p !== entry));
  }

  get totalImageCount(): number {
    return this.uploadedImages().length + this.imagePreviews().length;
  }

  get canAddMoreImages(): boolean {
    return this.totalImageCount < MAX_IMAGES;
  }

  getImageUrl(filename: string): string {
    return this.service.getImageUrl(filename);
  }

  /** True if this is the first general (no-color) image → it becomes the cover */
  isCoverImage(entry: ImageEntry): boolean {
    const generals = this.uploadedImages().filter(i => !i.color);
    return generals.length > 0 && generals[0].filename === entry.filename;
  }

  // ─────────────────────────── CRUD ───────────────────────────

  loadItems(): void {
    this.loading.set(true);
    this.service.getAllAdmin().subscribe({
      next: items => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load items.');
        this.loading.set(false);
      },
    });
  }

  openCreateForm(): void {
    this.editingId.set(null);
    this.form.reset({ price: 0, costPrice: 0, isActive: true });
    while (this.variantsArray.length) this.variantsArray.removeAt(0);
    this.addVariant();
    this.uploadedImages.set([]);
    this.imagePreviews.set([]);
    this.uploadError.set(null);
    this.showForm.set(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  editItem(item: SpecialCollectionItem): void {
    this.editingId.set(item.id!);
    this.form.patchValue({
      name: item.name,
      description: item.description,
      price: item.price,
      costPrice: item.costPrice,
      category: item.category,
      material: item.material || '',
      isActive: item.isActive,
    });

    while (this.variantsArray.length) this.variantsArray.removeAt(0);
    item.variants.forEach(v => {
      this.variantsArray.push(
        this.fb.group({
          size: [v.size, Validators.required],
          color: [v.color, Validators.required],
          quantity: [v.quantity, [Validators.required, Validators.min(0)]],
        }),
      );
    });

    // Merge general images + color-specific images into a flat ImageEntry list
    const allImages: ImageEntry[] = [];
    (item.images || []).forEach(f => allImages.push({ filename: f, color: '' }));
    if (item.colorImages) {
      Object.entries(item.colorImages).forEach(([color, files]) => {
        (files || []).forEach(f => allImages.push({ filename: f, color }));
      });
    }
    this.uploadedImages.set(allImages);
    this.imagePreviews.set([]);
    this.uploadError.set(null);
    this.showForm.set(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelForm(): void {
    this.imagePreviews().forEach(p => URL.revokeObjectURL(p.url));
    this.showForm.set(false);
    this.editingId.set(null);
    this.form.reset();
    while (this.variantsArray.length) this.variantsArray.removeAt(0);
    this.uploadedImages.set([]);
    this.imagePreviews.set([]);
    this.uploadError.set(null);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.imagePreviews().some(p => p.uploading)) {
      alert('Please wait for all images to finish uploading.');
      return;
    }

    this.saving.set(true);

    // Split flat image list into general images[] and colorImages{}
    const images = this.uploadedImages()
      .filter(i => !i.color)
      .map(i => i.filename);

    const colorImages: Record<string, string[]> = {};
    this.uploadedImages()
      .filter(i => !!i.color)
      .forEach(i => {
        if (!colorImages[i.color]) colorImages[i.color] = [];
        colorImages[i.color].push(i.filename);
      });

    const dto = { ...this.form.value, images, colorImages };

    const request$ = this.editingId()
      ? this.service.update(this.editingId()!, dto)
      : this.service.create(dto);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.cancelForm();
        this.loadItems();
      },
      error: () => {
        this.saving.set(false);
        alert('Failed to save item. Please try again.');
      },
    });
  }

  deleteItem(id: string): void {
    if (!confirm('Delete this item? This action cannot be undone.')) return;

    this.service.remove(id).subscribe({
      next: () => this.loadItems(),
      error: () => alert('Failed to delete item.'),
    });
  }

  get filteredItems(): SpecialCollectionItem[] {
    const cat = this.filterCategory();
    if (cat === 'all') return this.items();
    return this.items().filter(i => i.category === cat);
  }

  getCategoryLabel(value: string): string {
    return this.categories.find(c => c.value === value)?.label || value;
  }

  getAvailableQuantity(item: SpecialCollectionItem): number {
    return item.variants.reduce((sum, v) => sum + (v.quantity - v.soldQuantity), 0);
  }

  isInvalid(controlName: string): boolean {
    const ctrl = this.form.get(controlName);
    return !!(ctrl?.invalid && ctrl?.touched);
  }
}
