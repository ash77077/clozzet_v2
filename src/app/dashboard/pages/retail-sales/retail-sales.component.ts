import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { TabsModule } from 'primeng/tabs';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { RetailProductsService, RetailProduct, ProductVariant, SellVariantRequest, UpdateRetailProductDto, SaleListItem } from '../../../services/retail-products.service';

interface VariantInput {
  size: string;
  color: string;
  quantity: number;
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
    TagModule,
    DialogModule,
    ConfirmDialogModule,
    ToastModule
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

  filterStatus: 'all' | 'available' | 'sold' = 'all';
  searchTerm = '';

  showAddModal = false;
  showEditModal = false;
  showSellModal = false;
  selectedProduct: RetailProduct | null = null;
  editProduct: Partial<RetailProduct> = {};

  // For selling
  selectedVariant: ProductVariant | null = null;
  sellQuantity: number = 1;
  sellPrice: number = 0;

  newProduct: Partial<RetailProduct> = {
    name: '',
    description: '',
    price: 0,
    costPrice: 0,
    category: '',
    material: '',
    images: [],
    variants: []
  };

  // For variant management
  variantInputs: VariantInput[] = [];
  availableSizes = ['5-6', '7-8', '9-10', '11-12', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL'];
  availableColors = ['Կարմիր', 'Կանաչ', 'Սև', 'Սպիտակ', 'Կաթնագույն', 'Բաց Մոխրագույն', 'Մուգ Մոխրագույն', 'Բորդո', 'Մելանժ', 'Մուգ Կապույտ', 'Սալաթ', 'Շականակագույն', 'Խակի'];
  availableCategories = ['T-shirt', 'Hoodie', 'Sweatshirt Srbich', 'Sweatshirt Nachos', 'Ecobag', 'Backpack'];

  // For statistics PIN protection
  showStats = false;
  showPinModal = false;
  pinInput = '';
  readonly correctPin = '1409';

  // For sales list
  sales: SaleListItem[] = [];
  showSalesModal = false;
  isLoadingSales = false;
  showEditPriceModal = false;
  selectedSale: SaleListItem | null = null;
  newSoldPrice: number = 0;

  constructor(
    private retailProductsService: RetailProductsService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadProducts(): void {
    this.isLoading = true;
    this.error = '';

    this.retailProductsService.getAllRetailProducts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (products) => {
          this.products = products;
          this.applyFilters();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error loading retail products:', err);
          this.error = 'Failed to load retail products';
          this.isLoading = false;
        }
      });
  }

  applyFilters(): void {
    let filtered = [...this.products];

    // Apply status filter
    if (this.filterStatus === 'available') {
      filtered = filtered.filter(p => p.totalQuantity > 0);
    } else if (this.filterStatus === 'sold') {
      filtered = filtered.filter(p => p.totalSold > 0);
    }

    // Apply search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term)
      );
    }

    this.filteredProducts = filtered;
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  openAddModal(): void {
    this.newProduct = {
      name: '',
      description: '',
      price: 0,
      costPrice: 0,
      category: '',
      material: '',
      images: [],
      variants: []
    };
    this.variantInputs = [{ size: '', color: '', quantity: 1 }];
    this.showAddModal = true;
  }

  closeAddModal(): void {
    this.showAddModal = false;
  }

  addVariantInput(): void {
    this.variantInputs.push({ size: '', color: '', quantity: 1 });
  }

  removeVariantInput(index: number): void {
    this.variantInputs.splice(index, 1);
  }

  addProduct(): void {
    if (!this.newProduct.name || !this.newProduct.price) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please fill in required fields'
      });
      return;
    }

    // Filter out empty variants and map to correct structure
    const variants = this.variantInputs
      .filter(v => v.size && v.color && v.quantity > 0)
      .map(v => ({
        size: v.size,
        color: v.color,
        quantity: v.quantity
      }));

    if (variants.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please add at least one variant with size, color, and quantity'
      });
      return;
    }

    const productData = {
      ...this.newProduct,
      variants
    } as RetailProduct;

    this.retailProductsService.createRetailProduct(productData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (product) => {
          this.products.unshift(product);
          this.applyFilters();
          this.closeAddModal();
          this.messageService.add({
            severity: 'success',
            summary: 'Product Created',
            detail: 'Product created successfully!'
          });
        },
        error: (err) => {
          console.error('Error creating product:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to create product: ' + (err.error?.message || 'Unknown error')
          });
        }
      });
  }

  openEditModal(product: RetailProduct): void {
    this.editProduct = {
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      material: product.material,
      images: product.images || [],
      variants: product.variants || []
    };

    // Populate variant inputs with existing variants
    this.variantInputs = product.variants.map(v => ({
      size: v.size,
      color: v.color,
      quantity: v.quantity
    }));

    this.selectedProduct = product;
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedProduct = null;
    this.editProduct = {};
  }

  updateProduct(): void {
    if (!this.editProduct.name || !this.editProduct.price || !this.selectedProduct?._id) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please fill in required fields'
      });
      return;
    }

    // Filter out empty variants and map to correct structure
    // Note: Do NOT send soldQuantity - backend preserves it automatically
    const variants = this.variantInputs
      .filter(v => v.size && v.color && v.quantity >= 0)
      .map(v => ({
        size: v.size,
        color: v.color,
        quantity: v.quantity
      }));

    if (variants.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please add at least one variant with size, color, and quantity'
      });
      return;
    }

    const productData: UpdateRetailProductDto = {
      ...this.editProduct,
      variants
    };

    this.retailProductsService.updateRetailProduct(this.selectedProduct._id, productData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedProduct) => {
          const index = this.products.findIndex(p => p._id === updatedProduct._id);
          if (index !== -1) {
            this.products[index] = updatedProduct;
          }
          this.applyFilters();
          this.closeEditModal();
          this.messageService.add({
            severity: 'success',
            summary: 'Product Updated',
            detail: 'Product updated successfully!'
          });
        },
        error: (err) => {
          console.error('Error updating product:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to update product: ' + (err.error?.message || 'Unknown error')
          });
        }
      });
  }

  openSellModal(product: RetailProduct): void {
    this.selectedProduct = product;
    this.selectedVariant = null;
    this.sellQuantity = 1;
    this.sellPrice = product.price;
    this.showSellModal = true;
  }

  closeSellModal(): void {
    this.showSellModal = false;
    this.selectedProduct = null;
    this.selectedVariant = null;
  }

  selectVariant(variant: ProductVariant): void {
    this.selectedVariant = variant;
    this.sellQuantity = 1;
  }

  getAvailableQuantity(variant: ProductVariant): number {
    return variant.quantity - variant.soldQuantity;
  }

  sellVariant(): void {
    if (!this.selectedProduct || !this.selectedProduct._id || !this.selectedVariant) {
      return;
    }

    const available = this.getAvailableQuantity(this.selectedVariant);
    if (this.sellQuantity > available) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Insufficient Stock',
        detail: `Not enough stock. Available: ${available}`
      });
      return;
    }

    const sellRequest: SellVariantRequest = {
      size: this.selectedVariant.size,
      color: this.selectedVariant.color,
      quantity: this.sellQuantity,
      soldPrice: this.sellPrice
    };

    this.retailProductsService.sellVariant(this.selectedProduct._id, sellRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedProduct) => {
          const index = this.products.findIndex(p => p._id === updatedProduct._id);
          if (index !== -1) {
            this.products[index] = updatedProduct;
          }
          this.applyFilters();
          this.closeSellModal();
          this.messageService.add({
            severity: 'success',
            summary: 'Sale Completed',
            detail: 'Variant sold successfully!'
          });
        },
        error: (err) => {
          console.error('Error selling variant:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to sell variant: ' + (err.error?.message || 'Unknown error')
          });
        }
      });
  }

  deleteProduct(product: RetailProduct): void {
    if (!product._id) {
      return;
    }

    this.confirmationService.confirm({
      message: `Are you sure you want to delete product "${product.name}"?`,
      header: 'Delete Confirmation',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => {
        this.retailProductsService.deleteRetailProduct(product._id!)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.products = this.products.filter(p => p._id !== product._id);
              this.applyFilters();
              this.messageService.add({
                severity: 'success',
                summary: 'Product Deleted',
                detail: `Product "${product.name}" has been deleted successfully`
              });
            },
            error: (err) => {
              console.error('Error deleting product:', err);
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to delete product: ' + (err.error?.message || 'Unknown error')
              });
            }
          });
      }
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('hy-AM', {
      style: 'currency',
      currency: 'AMD'
    }).format(amount);
  }

  formatDate(date: Date | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getAvailableCount(): number {
    return this.products.reduce((sum, p) => sum + p.totalQuantity, 0);
  }

  getSoldCount(): number {
    return this.products.reduce((sum, p) => sum + p.totalSold, 0);
  }

  getTotalRevenue(): number {
    return this.products.reduce((sum, p) => {
      if (p.salesHistory) {
        return sum + p.salesHistory.reduce((s, sale) => s + (sale.soldPrice * sale.quantity), 0);
      }
      return sum;
    }, 0);
  }

  getVariantStock(product: RetailProduct): string {
    const variants = product.variants
      .map(v => `${v.color} ${v.size}: ${this.getAvailableQuantity(v)}`)
      .filter(v => !v.endsWith(': 0'))
      .join(', ');
    return variants || 'No stock';
  }

  getCategories(): string[] {
    const categories = [...new Set(this.filteredProducts.map(p => p.category))];
    return categories.filter(c => c && c.trim().length > 0);
  }

  getProductsByCategory(category: string): RetailProduct[] {
    return this.filteredProducts.filter(p => p.category === category);
  }

  getCategoryStats(category: string): { available: number; sold: number; revenue: number } {
    const categoryProducts = this.getProductsByCategory(category);
    return {
      available: categoryProducts.reduce((sum, p) => sum + p.totalQuantity, 0),
      sold: categoryProducts.reduce((sum, p) => sum + p.totalSold, 0),
      revenue: categoryProducts.reduce((sum, p) => {
        if (p.salesHistory) {
          return sum + p.salesHistory.reduce((s, sale) => s + (sale.soldPrice * sale.quantity), 0);
        }
        return sum;
      }, 0)
    };
  }

  // PIN modal methods
  openPinModal(): void {
    this.pinInput = '';
    this.showPinModal = true;
  }

  closePinModal(): void {
    this.showPinModal = false;
    this.pinInput = '';
  }

  submitPin(): void {
    if (this.pinInput === this.correctPin) {
      this.showStats = true;
      this.closePinModal();
      this.messageService.add({
        severity: 'success',
        summary: 'Access Granted',
        detail: 'Statistics unlocked successfully'
      });
    } else {
      this.messageService.add({
        severity: 'error',
        summary: 'Access Denied',
        detail: 'Incorrect PIN. Please try again.'
      });
      this.pinInput = '';
    }
  }

  toggleStats(): void {
    if (this.showStats) {
      this.showStats = false;
      this.messageService.add({
        severity: 'info',
        summary: 'Statistics Hidden',
        detail: 'Statistics have been hidden'
      });
    } else {
      this.openPinModal();
    }
  }

  // Sales list methods
  openSalesListModal(): void {
    this.showSalesModal = true;
    this.loadSales();
  }

  closeSalesModal(): void {
    this.showSalesModal = false;
  }

  loadSales(): void {
    this.isLoadingSales = true;
    this.retailProductsService.getAllSales()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (sales) => {
          this.sales = sales;
          this.isLoadingSales = false;
        },
        error: (err) => {
          console.error('Error loading sales:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load sales history'
          });
          this.isLoadingSales = false;
        }
      });
  }

  openEditPriceModal(sale: SaleListItem): void {
    this.selectedSale = sale;
    this.newSoldPrice = sale.soldPrice;
    this.showEditPriceModal = true;
  }

  closeEditPriceModal(): void {
    this.showEditPriceModal = false;
    this.selectedSale = null;
  }

  updateSoldPrice(): void {
    if (!this.selectedSale || this.newSoldPrice <= 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Invalid Price',
        detail: 'Please enter a valid price'
      });
      return;
    }

    this.retailProductsService.updateSalePrice(
      this.selectedSale.productId,
      this.selectedSale.saleId,
      this.newSoldPrice
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Update the sale in the list
          if (this.selectedSale) {
            this.selectedSale.soldPrice = this.newSoldPrice;
          }
          this.loadProducts(); // Reload to update revenue stats
          this.closeEditPriceModal();
          this.messageService.add({
            severity: 'success',
            summary: 'Price Updated',
            detail: 'Sold price updated successfully'
          });
        },
        error: (err) => {
          console.error('Error updating price:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to update price'
          });
        }
      });
  }

  confirmReturnSale(sale: SaleListItem): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to return this sale? (${sale.productName} - ${sale.color} ${sale.size} x${sale.quantity})`,
      header: 'Return Sale Confirmation',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => {
        this.returnSale(sale);
      }
    });
  }

  returnSale(sale: SaleListItem): void {
    this.retailProductsService.returnSale(sale.productId, sale.saleId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Remove the sale from the list
          this.sales = this.sales.filter(s => s.saleId !== sale.saleId);
          this.loadProducts(); // Reload to update stock and stats
          this.messageService.add({
            severity: 'success',
            summary: 'Sale Returned',
            detail: 'Sale returned successfully. Stock has been restored.'
          });
        },
        error: (err) => {
          console.error('Error returning sale:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to return sale: ' + (err.error?.message || 'Unknown error')
          });
        }
      });
  }
}
