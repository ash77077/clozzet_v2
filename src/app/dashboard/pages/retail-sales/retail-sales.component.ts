import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { TabsModule } from 'primeng/tabs';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { BadgeModule } from 'primeng/badge';
import { DividerModule } from 'primeng/divider';
import { ConfirmationService, MessageService } from 'primeng/api';
import {
  RetailProductsService,
  RetailProduct,
  ProductVariant,
  SellVariantRequest,
  UpdateRetailProductDto,
} from '../../../services/retail-products.service';

interface VariantInput {
  size: string;
  color: string;
  quantity: number;
  costPrice: number;
}

interface CartItem {
  product: RetailProduct;
  variant: ProductVariant;
  quantity: number;
  unitPrice: number;
}

@Component({
  selector: 'app-retail-sales',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TabsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    TagModule,
    DialogModule,
    ConfirmDialogModule,
    ToastModule,
    BadgeModule,
    DividerModule,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './retail-sales.component.html',
  styleUrl: './retail-sales.component.scss',
})
export class RetailSalesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  products: RetailProduct[] = [];
  filteredProducts: RetailProduct[] = [];
  isLoading = false;
  error = '';

  filterCategory = 'all';
  searchTerm = '';

  // Modals
  showAddModal = false;
  showEditModal = false;
  showCartModal = false;
  showStockModal = false;
  selectedProduct: RetailProduct | null = null;
  editProduct: Partial<RetailProduct> = {};

  // Cart (invoice)
  cart: CartItem[] = [];
  get cartTotal(): number {
    return this.cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  }
  get cartCount(): number {
    return this.cart.reduce((s, i) => s + i.quantity, 0);
  }
  isProcessingCart = false;

  // Add stock modal state
  stockVariantInputs: VariantInput[] = [];
  stockProductId: string | null = null;

  // New product form
  newProduct: Partial<RetailProduct> = {};
  variantInputs: VariantInput[] = [];

  // Lists
  availableSizes = [
    '1-2', '3-4', '5-6', '7-8', '9-10', '11-12', '13-14', '15-16',
    'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL',
  ];
  availableColors = [
    'Կաթնագույն', 'Մանուշակագույն', 'Սպիտակ', 'Սև',
    'Մուգ կանաչ', 'Խակի', 'Դեղին', 'Բորդո',
    'Կարմիր', 'Կապույտ', 'Մուգ կապույտ', 'Մոխրագույն',
    'Շականակագույն', 'Նարնջագույն', 'Վարդագույն', 'Մելանժ',
  ];
  availableCategories = [
    'T-Shirt', 'Hoodie', 'Zip Hoodie', 'Polo', 'Cap', 'Sweatshirt', 'Pants',
  ];

  // Custom add inputs
  customColor = '';
  customCategory = '';
  showCustomColorInput = false;
  showCustomCategoryInput = false;

  // Quick Sell
  showQuickSellModal = false;
  quickSell = { category: '', color: '', size: '', quantity: 1, price: 0 };

  // Stats
  showStats = false;
  showPinModal = false;
  pinInput = '';
  readonly correctPin = '1409';

  constructor(
    private retailProductsService: RetailProductsService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Data ──────────────────────────────────────────────────────────────

  loadProducts(): void {
    this.isLoading = true;
    this.retailProductsService.getAllRetailProducts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (products) => {
          this.products = products;
          this.applyFilters();
          this.isLoading = false;
        },
        error: () => {
          this.error = 'Failed to load products';
          this.isLoading = false;
        },
      });
  }

  applyFilters(): void {
    let list = [...this.products];
    if (this.filterCategory !== 'all') {
      list = list.filter(p => p.category === this.filterCategory);
    }
    if (this.searchTerm.trim()) {
      const q = this.searchTerm.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.variants.some(v => v.color.toLowerCase().includes(q) || v.size.toLowerCase().includes(q))
      );
    }
    this.filteredProducts = list;
  }

  // ── Categories ────────────────────────────────────────────────────────

  getCategories(): string[] {
    return [...new Set(this.filteredProducts.map(p => p.category))].filter(Boolean);
  }

  getAllCategories(): string[] {
    return [...new Set(this.products.map(p => p.category))].filter(Boolean);
  }

  getProductsByCategory(cat: string): RetailProduct[] {
    return this.filteredProducts.filter(p => p.category === cat);
  }

  getCategoryStats(cat: string) {
    const ps = this.getProductsByCategory(cat);
    return {
      available: ps.reduce((s, p) => s + p.totalQuantity, 0),
      sold: ps.reduce((s, p) => s + p.totalSold, 0),
      revenue: ps.reduce((s, p) => {
        return s + (p.salesHistory || []).reduce((r, sale) => r + sale.soldPrice * sale.quantity, 0);
      }, 0),
    };
  }

  // ── Add Product ───────────────────────────────────────────────────────

  openAddModal(): void {
    this.newProduct = { name: '', description: '', price: 0, costPrice: 0, category: '', material: '' };
    this.variantInputs = [{ size: '', color: '', quantity: 1, costPrice: 0 }];
    this.showCustomCategoryInput = false;
    this.customCategory = '';
    this.showAddModal = true;
  }

  addVariantRow(): void {
    this.variantInputs.push({ size: '', color: '', quantity: 1, costPrice: 0 });
  }

  removeVariantRow(i: number): void {
    this.variantInputs.splice(i, 1);
  }

  addCustomColor(): void {
    const c = this.customColor.trim();
    if (c && !this.availableColors.includes(c)) {
      this.availableColors.push(c);
    }
    this.customColor = '';
    this.showCustomColorInput = false;
  }

  addCustomCategory(): void {
    const c = this.customCategory.trim();
    if (c && !this.availableCategories.includes(c)) {
      this.availableCategories.push(c);
    }
    if (c) (this.newProduct as any).category = c;
    this.customCategory = '';
    this.showCustomCategoryInput = false;
  }

  addCustomCategoryForEdit(): void {
    const c = this.customCategory.trim();
    if (c && !this.availableCategories.includes(c)) {
      this.availableCategories.push(c);
    }
    if (c) (this.editProduct as any).category = c;
    this.customCategory = '';
    this.showCustomCategoryInput = false;
  }

  submitAddProduct(): void {
    if (!this.newProduct.name?.trim() || !this.newProduct.category || !this.newProduct.price) {
      this.messageService.add({ severity: 'warn', summary: 'Required', detail: 'Name, category and price are required' });
      return;
    }
    const variants = this.variantInputs
      .filter(v => v.size && v.color && v.quantity > 0)
      .map(v => ({ size: v.size, color: v.color, quantity: v.quantity }));
    if (!variants.length) {
      this.messageService.add({ severity: 'warn', summary: 'Required', detail: 'Add at least one variant' });
      return;
    }
    this.retailProductsService.createRetailProduct({ ...this.newProduct, variants } as RetailProduct)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (p) => {
          this.products.unshift(p);
          this.applyFilters();
          this.showAddModal = false;
          this.messageService.add({ severity: 'success', summary: 'Added', detail: `${p.name} added` });
        },
        error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'Failed' }),
      });
  }

  // ── Edit Product ──────────────────────────────────────────────────────

  openEditModal(product: RetailProduct): void {
    this.selectedProduct = product;
    this.editProduct = { name: product.name, description: product.description, price: product.price, category: product.category, material: product.material };
    this.variantInputs = product.variants.map(v => ({ size: v.size, color: v.color, quantity: v.quantity, costPrice: 0 }));
    this.showCustomCategoryInput = false;
    this.customCategory = '';
    this.showEditModal = true;
  }

  submitEditProduct(): void {
    if (!this.selectedProduct?._id) return;
    const variants = this.variantInputs
      .filter(v => v.size && v.color && v.quantity >= 0)
      .map(v => ({ size: v.size, color: v.color, quantity: v.quantity }));
    const dto: UpdateRetailProductDto = { ...this.editProduct, variants };
    this.retailProductsService.updateRetailProduct(this.selectedProduct._id, dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          const idx = this.products.findIndex(p => p._id === updated._id);
          if (idx !== -1) this.products[idx] = updated;
          this.applyFilters();
          this.showEditModal = false;
          this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'Product updated' });
        },
        error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'Failed' }),
      });
  }

  // ── Add Stock Modal ───────────────────────────────────────────────────

  openStockModal(product: RetailProduct): void {
    this.selectedProduct = product;
    this.stockProductId = product._id!;
    this.stockVariantInputs = [{ size: '', color: '', quantity: 1, costPrice: product.costPrice || 0 }];
    this.showStockModal = true;
  }

  addStockRow(): void {
    this.stockVariantInputs.push({ size: '', color: '', quantity: 1, costPrice: 0 });
  }

  removeStockRow(i: number): void {
    this.stockVariantInputs.splice(i, 1);
  }

  submitAddStock(): void {
    if (!this.selectedProduct?._id) return;
    const existing = this.selectedProduct.variants.map(v => ({ size: v.size, color: v.color, quantity: v.quantity }));
    const additions = this.stockVariantInputs.filter(v => v.size && v.color && v.quantity > 0);
    if (!additions.length) {
      this.messageService.add({ severity: 'warn', summary: 'Required', detail: 'Fill at least one row' });
      return;
    }
    // Merge: if same size+color exists bump quantity, else append
    const merged = [...existing];
    for (const add of additions) {
      const found = merged.find(e => e.size === add.size && e.color === add.color);
      if (found) {
        found.quantity += add.quantity;
      } else {
        merged.push({ size: add.size, color: add.color, quantity: add.quantity });
      }
    }
    this.retailProductsService.updateRetailProduct(this.selectedProduct._id, { variants: merged })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          const idx = this.products.findIndex(p => p._id === updated._id);
          if (idx !== -1) this.products[idx] = updated;
          this.applyFilters();
          this.showStockModal = false;
          this.messageService.add({ severity: 'success', summary: 'Stock Added', detail: 'Inventory updated' });
        },
        error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update stock' }),
      });
  }

  // ── Cart / Invoice ────────────────────────────────────────────────────

  openCartModal(): void {
    this.showCartModal = true;
  }

  closeCartModal(): void {
    this.showCartModal = false;
  }

  addToCart(product: RetailProduct, variant: ProductVariant): void {
    const avail = this.getAvailable(variant);
    if (avail <= 0) return;
    const existing = this.cart.find(i => i.product._id === product._id && i.variant === variant);
    if (existing) {
      if (existing.quantity < avail) existing.quantity++;
    } else {
      this.cart.push({ product, variant, quantity: 1, unitPrice: product.price });
    }
    this.messageService.add({ severity: 'success', summary: 'Added to cart', detail: `${product.name} ${variant.color} ${variant.size}`, life: 1500 });
  }

  removeFromCart(i: number): void {
    this.cart.splice(i, 1);
  }

  getCartItemAvailable(item: CartItem): number {
    return this.getAvailable(item.variant);
  }

  confirmSale(): void {
    if (!this.cart.length) return;
    this.isProcessingCart = true;

    const ops = this.cart.map(item =>
      this.retailProductsService.sellVariant(item.product._id!, {
        size: item.variant.size,
        color: item.variant.color,
        quantity: item.quantity,
        soldPrice: item.unitPrice,
      }).toPromise()
    );

    Promise.all(ops)
      .then(() => {
        this.messageService.add({
          severity: 'success',
          summary: 'Sale Complete',
          detail: `${this.cartCount} item(s) sold — ${this.fmtAMD(this.cartTotal)}`,
        });
        this.cart = [];
        this.showCartModal = false;
        this.loadProducts();
      })
      .catch(() => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Some items could not be processed' });
      })
      .finally(() => { this.isProcessingCart = false; });
  }

  clearCart(): void {
    this.cart = [];
  }

  // ── Delete ────────────────────────────────────────────────────────────

  deleteProduct(product: RetailProduct): void {
    this.confirmationService.confirm({
      message: `Delete "${product.name}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.retailProductsService.deleteRetailProduct(product._id!)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.products = this.products.filter(p => p._id !== product._id);
              this.applyFilters();
              this.messageService.add({ severity: 'success', summary: 'Deleted', detail: product.name });
            },
            error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete' }),
          });
      },
    });
  }

  // ── Statistics PIN ────────────────────────────────────────────────────

  toggleStats(): void {
    if (this.showStats) { this.showStats = false; return; }
    this.pinInput = '';
    this.showPinModal = true;
  }

  submitPin(): void {
    if (this.pinInput === this.correctPin) {
      this.showStats = true;
      this.showPinModal = false;
    } else {
      this.messageService.add({ severity: 'error', summary: 'Wrong PIN', detail: 'Try again' });
      this.pinInput = '';
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  getAvailable(v: ProductVariant): number {
    return v.quantity - v.soldQuantity;
  }

  getTotalStock(): number {
    return this.products.reduce((s, p) => s + p.totalQuantity, 0);
  }

  getTotalSold(): number {
    return this.products.reduce((s, p) => s + p.totalSold, 0);
  }

  getTotalRevenue(): number {
    return this.products.reduce((s, p) =>
      s + (p.salesHistory || []).reduce((r, sale) => r + sale.soldPrice * sale.quantity, 0), 0);
  }

  fmtAMD(n: number): string {
    return new Intl.NumberFormat('hy-AM', { style: 'currency', currency: 'AMD', maximumFractionDigits: 0 }).format(n);
  }

  // ── Aliases / stubs for HTML template references ─────────────────────

  formatCurrency(n: number): string { return this.fmtAMD(n); }
  onSearchChange(): void { this.applyFilters(); }
  onFilterChange(): void { this.applyFilters(); }
  filterStatus = '';

  getAvailableCount(v?: ProductVariant): number { return v ? this.getAvailable(v) : this.getTotalStock() - this.getTotalSold(); }
  getAvailableQuantity(v?: ProductVariant): number { return v ? this.getAvailable(v) : 0; }
  getSoldCount(v?: ProductVariant): number { return v ? v.soldQuantity : this.getTotalSold(); }

  closeAddModal(): void { this.showAddModal = false; }
  addVariantInput(): void { this.addVariantRow(); }
  removeVariantInput(i: number): void { this.removeVariantRow(i); }
  addProduct(): void { this.submitAddProduct(); }

  closeEditModal(): void { this.showEditModal = false; }
  updateProduct(): void { this.submitEditProduct(); }

  // Sell modal (single variant quick sell)
  showSellModal = false;
  selectedVariant: ProductVariant | null = null;
  sellQuantity = 1;
  sellPrice = 0;

  openSellModal(product: RetailProduct, variant?: ProductVariant): void {
    this.selectedProduct = product;
    this.selectedVariant = variant ?? null;
    this.sellQuantity = 1;
    this.sellPrice = product.price;
    this.showSellModal = true;
  }

  closeSellModal(): void { this.showSellModal = false; this.selectedVariant = null; }

  selectVariant(v: ProductVariant): void {
    this.selectedVariant = v;
    if (this.selectedProduct) this.sellPrice = this.selectedProduct.price;
  }

  sellVariant(): void {
    if (!this.selectedProduct?._id || !this.selectedVariant) return;
    this.retailProductsService.sellVariant(this.selectedProduct._id, {
      size: this.selectedVariant.size,
      color: this.selectedVariant.color,
      quantity: this.sellQuantity,
      soldPrice: this.sellPrice,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (updated) => {
        const idx = this.products.findIndex(p => p._id === updated._id);
        if (idx !== -1) this.products[idx] = updated;
        this.applyFilters();
        this.showSellModal = false;
        this.messageService.add({ severity: 'success', summary: 'Sold', detail: 'Sale recorded' });
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Sale failed' }),
    });
  }

  // Edit price modal
  showEditPriceModal = false;
  selectedSale: any = null;
  newSoldPrice = 0;

  openEditPriceModal(sale: any): void {
    this.selectedSale = sale;
    this.newSoldPrice = sale.soldPrice;
    this.showEditPriceModal = true;
  }

  closeEditPriceModal(): void { this.showEditPriceModal = false; this.selectedSale = null; }

  updateSoldPrice(): void {
    this.closeEditPriceModal();
    this.messageService.add({ severity: 'info', summary: 'Info', detail: 'Price editing not yet supported by API' });
  }

  openQuickSellModal(): void {
    this.quickSell = { category: '', color: '', size: '', quantity: 1, price: 0 };
    this.showQuickSellModal = true;
  }

  closeQuickSellModal(): void {
    this.showQuickSellModal = false;
  }

  processQuickSell(): void {
    const { category, color, size, quantity, price } = this.quickSell;
    if (!category || !color || !size || quantity < 1 || price < 0) {
      this.messageService.add({ severity: 'warn', summary: 'Required', detail: 'Fill all fields' });
      return;
    }
    const product = this.products.find(p =>
      p.category === category &&
      p.variants.some(v => v.color === color && v.size === size && (v.quantity - v.soldQuantity) >= quantity)
    );
    if (!product) {
      this.messageService.add({ severity: 'error', summary: 'Not Found', detail: 'No matching product/variant with enough stock' });
      return;
    }
    this.retailProductsService.sellVariant(product._id!, { size, color, quantity, soldPrice: price })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          const idx = this.products.findIndex(p => p._id === updated._id);
          if (idx !== -1) this.products[idx] = updated;
          this.applyFilters();
          this.showQuickSellModal = false;
          this.messageService.add({ severity: 'success', summary: 'Sold', detail: `${quantity}x ${category} ${color} ${size}` });
        },
        error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Sale failed' }),
      });
  }

  closePinModal(): void {
    this.showPinModal = false;
    this.pinInput = '';
  }

  navigateToSalesHistory(): void {
    this.router.navigate(['/sales-history']);
  }
}
