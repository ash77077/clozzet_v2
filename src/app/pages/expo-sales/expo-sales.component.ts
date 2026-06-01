import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DividerModule } from 'primeng/divider';
import { TooltipModule } from 'primeng/tooltip';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { MessageService, ConfirmationService } from 'primeng/api';
import { Subject, takeUntil } from 'rxjs';
import {
  ExpoSalesService, ExpoStock, ExpoStockItem, ExpoSaleRecord, CartLine, ExpoSummary,
} from '../../services/expo-sales.service';
import { AuthService } from '../../services/auth.service';

interface CartItem {
  item: ExpoStockItem;
  itemIndex: number;
  quantity: number;
  unitPrice: number;
}

interface NewItemRow {
  type: string;
  color: string;
  size: string;
  quantity: number;
  costPrice: number;
  sellPrice: number;
}

@Component({
  selector: 'app-expo-sales',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule,
    ButtonModule, CardModule, TagModule, DialogModule,
    InputTextModule, InputNumberModule, ToastModule,
    ConfirmDialogModule, DividerModule, TooltipModule,
    TextareaModule, SelectModule, ToggleSwitch,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './expo-sales.component.html',
  styleUrl: './expo-sales.component.scss',
})
export class ExpoSalesComponent implements OnInit {
  private destroy$ = new Subject<void>();

  // ── Views: 'list' | 'stock' | 'sell' ─────────────────────────────────
  view: 'list' | 'stock' | 'sell' = 'list';
  activeExpo: ExpoStock | null = null;
  summary: ExpoSummary | null = null;
  isLoading = false;

  // ── Expo list ─────────────────────────────────────────────────────────
  expos: ExpoStock[] = [];
  showCreateDialog = false;
  newExpoName = '';
  newExpoDescription = '';

  // ── Stock manager ─────────────────────────────────────────────────────
  showAddItemsDialog = false;
  newItems: NewItemRow[] = [];
  showImportDialog = false;
  importSourceId = '';
  showCloseDialog = false;
  returnUnsoldOnClose = true;
  private _filterType = '';
  private _filterColor = '';

  get filterType(): string { return this._filterType; }
  set filterType(v: string) { this._filterType = v; this.applyFilter(); }

  get filterColor(): string { return this._filterColor; }
  set filterColor(v: string) { this._filterColor = v; this.applyFilter(); }

  filteredItems: { item: ExpoStockItem; idx: number }[] = [];
  stockTypes: string[] = [];
  stockColors: string[] = [];

  // Item editing
  editingItemIndex: number | null = null;
  editingItem: Partial<ExpoStockItem> = {};

  // ── Sell (cart) ───────────────────────────────────────────────────────
  cart: CartItem[] = [];
  isProcessingSale = false;
  showSalesLogDialog = false;

  // ── Return sale dialog ────────────────────────────────────────────────
  showReturnDialog = false;
  returnTargetSale: ExpoSaleRecord | null = null;
  returnQty = 1;

  // ── Lookup lists ──────────────────────────────────────────────────────
  readonly SIZES = [
    '1-2','3-4','5-6','7-8','9-10','11-12','13-14','15-16',
    'XS','S','M','L','XL','2XL','3XL','4XL',
  ];
  readonly COLORS = [
    'Կաթնագույն','Մանուշակագույն','Սպիտակ','Սև',
    'Մուգ կանաչ','Խակի','Դեղին','Բորդո',
    'Կարմիր','Կապույտ','Մուգ կապույտ','Մոխրագույն',
    'Շականակագույն','Նարնջագույն','Վարդագույն','Մելանժ',
  ];
  readonly TYPES = [
    'T-Shirt','Hoodie','Zip Hoodie','Polo','Cap','Sweatshirt','Pants',
  ];

  // custom additions
  customColor = '';
  customType = '';
  colors = [...this.COLORS];
  types = [...this.TYPES];

  isAdmin = false;

  constructor(
    private expoService: ExpoSalesService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private authService: AuthService,
  ) {
    this.isAdmin = this.authService.getCurrentUser()?.role === 'admin';
  }

  ngOnInit(): void { this.loadExpos(); }

  // ── List ──────────────────────────────────────────────────────────────

  loadExpos(): void {
    this.isLoading = true;
    this.expoService.getAll().pipe(takeUntil(this.destroy$)).subscribe({
      next: (list) => { this.expos = list; this.isLoading = false; },
      error: () => { this.isLoading = false; },
    });
  }

  createExpo(): void {
    if (!this.newExpoName.trim()) return;
    this.expoService.create({ name: this.newExpoName.trim(), description: this.newExpoDescription.trim() })
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: (expo) => {
          this.expos.unshift(expo);
          this.showCreateDialog = false;
          this.newExpoName = '';
          this.newExpoDescription = '';
          this.messageService.add({ severity: 'success', summary: 'Created', detail: expo.name });
        },
        error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to create expo' }),
      });
  }

  openExpo(expo: ExpoStock): void {
    this.activeExpo = expo;
    this.cart = [];
    this._filterType = '';
    this._filterColor = '';
    this.editingItemIndex = null;
    this.applyFilter();
    this.view = 'stock';
    this.loadSummary();
  }

  loadSummary(): void {
    if (!this.activeExpo?.id) return;
    this.expoService.getSummary(this.activeExpo.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (s) => this.summary = s,
    });
  }

  deleteExpo(expo: ExpoStock): void {
    this.confirmationService.confirm({
      message: `Delete "${expo.name}"? This cannot be undone.`,
      header: 'Delete Expo',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.expoService.deleteExpo(expo.id!).pipe(takeUntil(this.destroy$)).subscribe({
          next: () => {
            this.expos = this.expos.filter(e => e.id !== expo.id);
            this.messageService.add({ severity: 'success', summary: 'Deleted', detail: expo.name });
          },
        });
      },
    });
  }

  backToList(): void {
    this.view = 'list';
    this.activeExpo = null;
    this.summary = null;
    this.cart = [];
    this.loadExpos();
  }

  // ── Stock Manager ─────────────────────────────────────────────────────

  applyFilter(): void {
    if (!this.activeExpo) { this.filteredItems = []; return; }
    this.stockTypes = [...new Set(this.activeExpo.items.map(i => i.type))];
    this.stockColors = [...new Set(this.activeExpo.items.map(i => i.color))];
    this.filteredItems = this.activeExpo.items
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => {
        const tMatch = !this._filterType || item.type === this._filterType;
        const cMatch = !this._filterColor || item.color === this._filterColor;
        return tMatch && cMatch;
      });
  }

  openAddItemsDialog(): void {
    this.newItems = [{ type: '', color: '', size: '', quantity: 1, costPrice: 0, sellPrice: 0 }];
    this.showAddItemsDialog = true;
  }

  addNewItemRow(): void {
    this.newItems.push({ type: '', color: '', size: '', quantity: 1, costPrice: 0, sellPrice: 0 });
  }

  removeNewItemRow(i: number): void {
    this.newItems.splice(i, 1);
  }

  addCustomColor(): void {
    const c = this.customColor.trim();
    if (c && !this.colors.includes(c)) this.colors.push(c);
    this.customColor = '';
  }

  addCustomType(): void {
    const t = this.customType.trim();
    if (t && !this.types.includes(t)) this.types.push(t);
    this.customType = '';
  }

  submitAddItems(): void {
    const valid = this.newItems.filter(r => r.type && r.color && r.size && r.quantity > 0);
    if (!valid.length) {
      this.messageService.add({ severity: 'warn', summary: 'Required', detail: 'Fill at least one item row' });
      return;
    }
    this.expoService.addItems(this.activeExpo!.id!, valid)
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: (expo) => {
          this.activeExpo = expo;
          this.applyFilter();
          this.showAddItemsDialog = false;
          this.loadSummary();
          this.messageService.add({ severity: 'success', summary: 'Stock Added', detail: `${valid.length} item(s) added` });
        },
        error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to add items' }),
      });
  }

  startEditItem(idx: number): void {
    this.editingItemIndex = idx;
    const { soldQuantity, ...rest } = this.activeExpo!.items[idx] as any;
    this.editingItem = { ...rest };
  }

  saveEditItem(): void {
    if (this.editingItemIndex === null) return;
    this.expoService.updateItem(this.activeExpo!.id!, this.editingItemIndex, this.editingItem)
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: (expo) => {
          this.activeExpo = expo;
          this.editingItemIndex = null;
          this.applyFilter();
          this.loadSummary();
        },
        error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update item' }),
      });
  }

  deleteItem(idx: number): void {
    const item = this.activeExpo!.items[idx];
    this.confirmationService.confirm({
      message: `Delete <strong>${item.type} · ${item.color} · ${item.size}</strong>?`,
      header: 'Delete Item',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.expoService.removeItem(this.activeExpo!.id!, idx)
          .pipe(takeUntil(this.destroy$)).subscribe({
            next: (expo) => { this.activeExpo = expo; this.applyFilter(); this.loadSummary(); },
          });
      },
    });
  }

  openImportDialog(): void {
    this.importSourceId = '';
    this.showImportDialog = true;
  }

  otherExpos(): ExpoStock[] {
    return this.expos.filter(e => e.id !== this.activeExpo?.id);
  }

  submitImport(): void {
    if (!this.importSourceId) return;
    this.expoService.importFromExpo(this.activeExpo!.id!, this.importSourceId)
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: (expo) => {
          this.activeExpo = expo;
          this.applyFilter();
          this.showImportDialog = false;
          this.loadSummary();
          this.messageService.add({ severity: 'success', summary: 'Imported', detail: 'Stock imported successfully' });
        },
        error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Import failed' }),
      });
  }

  submitCloseExpo(): void {
    this.expoService.closeExpo(this.activeExpo!.id!, this.returnUnsoldOnClose)
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: (expo) => {
          this.activeExpo = expo;
          this.applyFilter();
          this.showCloseDialog = false;
          this.loadSummary();
          const msg = this.returnUnsoldOnClose ? 'Expo closed and unsold stock returned to retail' : 'Expo closed';
          this.messageService.add({ severity: 'success', summary: 'Closed', detail: msg });
        },
        error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to close expo' }),
      });
  }

  reopenExpo(): void {
    this.expoService.reopen(this.activeExpo!.id!).pipe(takeUntil(this.destroy$)).subscribe({
      next: (expo) => {
        this.activeExpo = expo;
        this.applyFilter();
        this.messageService.add({ severity: 'success', summary: 'Reopened', detail: expo.name });
      },
    });
  }

  // ── Cart / Sell ───────────────────────────────────────────────────────

  goToSell(): void {
    this.view = 'sell';
  }

  backToStock(): void {
    this.view = 'stock';
    this.cart = [];
  }

  available(item: ExpoStockItem): number {
    return item.quantity - item.soldQuantity;
  }

  inCart(item: ExpoStockItem): number {
    const found = this.cart.find(c => c.item === item);
    return found?.quantity ?? 0;
  }

  addToCart(item: ExpoStockItem, idx: number): void {
    const avail = this.available(item) - this.inCart(item);
    if (avail <= 0) return;
    const existing = this.cart.find(c => c.item === item);
    if (existing) {
      existing.quantity++;
    } else {
      this.cart.push({ item, itemIndex: idx, quantity: 1, unitPrice: item.sellPrice || 0 });
    }
  }

  removeFromCart(i: number): void {
    this.cart.splice(i, 1);
  }

  get cartTotal(): number {
    return this.cart.reduce((s, c) => s + c.unitPrice * c.quantity, 0);
  }

  get cartCount(): number {
    return this.cart.reduce((s, c) => s + c.quantity, 0);
  }

  confirmSale(): void {
    if (!this.cart.length) return;
    this.isProcessingSale = true;
    const lines: CartLine[] = this.cart.map(c => ({
      type: c.item.type,
      color: c.item.color,
      size: c.item.size,
      quantity: c.quantity,
      soldPrice: c.unitPrice,
    }));
    this.expoService.sellCart(this.activeExpo!.id!, lines)
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: (expo) => {
          this.activeExpo = expo;
          this.applyFilter();
          this.messageService.add({
            severity: 'success',
            summary: 'Sale Complete',
            detail: `${this.cartCount} item(s) — ${this.fmtAMD(this.cartTotal)}`,
          });
          this.cart = [];
          this.view = 'stock';
          this.loadSummary();
          this.isProcessingSale = false;
        },
        error: (err) => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'Sale failed' });
          this.isProcessingSale = false;
        },
      });
  }

  returnSale(sale: ExpoSaleRecord): void {
    this.returnTargetSale = sale;
    this.returnQty = sale.quantity;
    this.showReturnDialog = true;
  }

  confirmReturn(): void {
    if (!this.returnTargetSale) return;
    this.expoService.returnSale(this.activeExpo!.id!, this.returnTargetSale._id!, this.returnQty)
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: (expo) => {
          this.activeExpo = expo;
          this.applyFilter();
          this.loadSummary();
          this.showReturnDialog = false;
          this.returnTargetSale = null;
          this.messageService.add({ severity: 'info', summary: 'Returned', detail: `${this.returnQty} item(s) reversed` });
        },
        error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Return failed' }),
      });
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  fmtAMD(n: number): string {
    return new Intl.NumberFormat('hy-AM', { style: 'currency', currency: 'AMD', maximumFractionDigits: 0 }).format(n);
  }

  activeSales(): ExpoSaleRecord[] {
    return (this.activeExpo?.sales || []).filter(s => !s.isReturn).reverse();
  }

  getExpoStatusSeverity(status: string): 'success' | 'secondary' {
    return status === 'active' ? 'success' : 'secondary';
  }
}
