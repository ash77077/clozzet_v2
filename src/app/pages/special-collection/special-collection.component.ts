import { Component, OnInit, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import {
  SpecialCollectionService,
  SpecialCollectionItem,
  SPECIAL_COLLECTION_CATEGORIES,
} from '../../services/special-collection.service';

@Component({
  selector: 'app-special-collection',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './special-collection.component.html',
  styleUrl: './special-collection.component.scss',
})
export class SpecialCollectionComponent implements OnInit {
  items = signal<SpecialCollectionItem[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  currentCategory = signal<string>('');

  // Modal state
  selectedItem = signal<SpecialCollectionItem | null>(null);
  activeImageIndex = signal(0);
  selectedColor = signal<string>('');
  selectedSize = signal<string>('');

  /**
   * Images shown in the modal gallery.
   * Switches to the color-specific set when a color is selected,
   * falls back to general images[] if no color images exist.
   */
  activeImages = computed<string[]>(() => {
    const item = this.selectedItem();
    const color = this.selectedColor();
    if (!item) return [];
    if (color && item.colorImages?.[color]?.length) {
      return item.colorImages[color];
    }
    return item.images ?? [];
  });

  categories = SPECIAL_COLLECTION_CATEGORIES;

  constructor(
    private route: ActivatedRoute,
    private specialCollectionService: SpecialCollectionService,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const category = params.get('category') || '';
      this.currentCategory.set(category);
      this.loadItems(category);
    });
  }

  loadItems(category: string): void {
    this.loading.set(true);
    this.error.set(null);

    const request$ = (category && category !== 'all')
      ? this.specialCollectionService.getByCategory(category)
      : this.specialCollectionService.getAll();

    request$.subscribe({
      next: items => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load items. Please try again.');
        this.loading.set(false);
      },
    });
  }

  getCategoryLabel(value: string): string {
    return this.categories.find(c => c.value === value)?.label || value;
  }

  getAvailableQuantity(item: SpecialCollectionItem): number {
    return item.variants.reduce((sum, v) => sum + (v.quantity - v.soldQuantity), 0);
  }

  getImageUrl(filename: string): string {
    return this.specialCollectionService.getImageUrl(filename);
  }

  getCoverImage(item: SpecialCollectionItem): string | null {
    return item.images && item.images.length > 0 ? item.images[0] : null;
  }

  // ── Modal ────────────────────────────────────────────────

  openModal(item: SpecialCollectionItem): void {
    this.selectedItem.set(item);
    this.activeImageIndex.set(0);

    const colors = this.getUniqueColors(item);
    const sizes = this.getUniqueSizes(item);
    this.selectedColor.set(colors[0] ?? '');
    this.selectedSize.set(sizes[0] ?? '');

    document.body.style.overflow = 'hidden';
  }

  closeModal(): void {
    this.selectedItem.set(null);
    document.body.style.overflow = '';
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.selectedItem()) this.closeModal();
  }

  setActiveImage(index: number): void {
    this.activeImageIndex.set(index);
  }

  prevImage(): void {
    const total = this.activeImages().length;
    if (!total) return;
    this.activeImageIndex.set((this.activeImageIndex() - 1 + total) % total);
  }

  nextImage(): void {
    const total = this.activeImages().length;
    if (!total) return;
    this.activeImageIndex.set((this.activeImageIndex() + 1) % total);
  }

  getUniqueColors(item: SpecialCollectionItem): string[] {
    return [...new Set(item.variants.map(v => v.color))];
  }

  getUniqueSizes(item: SpecialCollectionItem): string[] {
    const order = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
    const sizes = [...new Set(item.variants.map(v => v.size))];
    return sizes.sort((a, b) => {
      const ai = order.indexOf(a.toUpperCase());
      const bi = order.indexOf(b.toUpperCase());
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }

  getVariantStock(item: SpecialCollectionItem, color: string, size: string): number {
    const v = item.variants.find(x => x.color === color && x.size === size);
    return v ? v.quantity - v.soldQuantity : 0;
  }

  isSizeAvailableForColor(item: SpecialCollectionItem, size: string): boolean {
    const color = this.selectedColor();
    if (!color) return true;
    return this.getVariantStock(item, color, size) > 0;
  }

  isColorAvailable(item: SpecialCollectionItem, color: string): boolean {
    return item.variants.some(v => v.color === color && v.quantity - v.soldQuantity > 0);
  }

  getSelectedStock(): number {
    const item = this.selectedItem();
    if (!item) return 0;
    return this.getVariantStock(item, this.selectedColor(), this.selectedSize());
  }

  selectColor(color: string): void {
    this.selectedColor.set(color);
    this.activeImageIndex.set(0); // reset gallery when switching color
    const item = this.selectedItem();
    if (!item) return;
    if (!this.isSizeAvailableForColor(item, this.selectedSize())) {
      const firstAvailable = this.getUniqueSizes(item).find(s =>
        this.isSizeAvailableForColor(item, s),
      );
      this.selectedSize.set(firstAvailable ?? '');
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.closeModal();
    }
  }
}
