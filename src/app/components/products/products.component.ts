import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductQuoteService } from '../../services/product-quote.service';
import { ProductsService, Product } from '../../services/products.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss']
})
export class ProductsComponent implements OnInit {
  selectedProduct: Product | null = null;
  showImageModal: boolean = false;
  showDetailsModal: boolean = false;
  products: Product[] = [];
  loading: boolean = true;
  error: string | null = null;

  constructor(
    private productQuoteService: ProductQuoteService,
    private productsService: ProductsService,
  ) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.loading = true;
    this.error = null;

    this.productsService.getAllProducts().subscribe({
      next: (products) => {
        this.products = products;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading products:', error);
        this.error = 'Failed to load products';
        this.loading = false;
      }
    });
  }

  requestQuote(): void {
    // Pass product information to the service
    if (this.selectedProduct) {
      this.productQuoteService.setSelectedProduct({
        productName: this.selectedProduct.name,
        category: this.selectedProduct.category
      });
    }

    // Close any open modals
    this.closeModal();

    // Navigate to quote section
    const element = document.getElementById('quote-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }

  trackByProductId(index: number, product: Product): string {
    return product.id;
  }

  // Helper method to get the first image or a fallback
  getProductImage(product: Product): string {
    return product.images && product.images.length > 0
      ? product.images[0]
      : 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80';
  }

  // Helper method to get materials from variants
  getMaterials(product: Product): string[] {
    if (!product.variants || product.variants.length === 0) {
      return [];
    }
    // Collect all unique materials from all variants
    const allMaterials = product.variants.flatMap(v => v.materials || []);
    return [...new Set(allMaterials)];
  }

  // Helper method to get GSM/thickness options from variants
  getThickness(product: Product): string[] {
    if (!product.variants || product.variants.length === 0) {
      return [];
    }
    // Collect all unique GSM values from all variants
    const allGsm = product.variants.flatMap(v => v.gsm || []);
    return [...new Set(allGsm)];
  }

  viewProductImage(product: Product): void {
    this.selectedProduct = product;
    this.showImageModal = true;
  }

  viewProductDetails(product: Product): void {
    this.selectedProduct = product;
    this.showDetailsModal = true;
  }

  closeModal(): void {
    this.showImageModal = false;
    this.showDetailsModal = false;
    this.selectedProduct = null;
  }
}
