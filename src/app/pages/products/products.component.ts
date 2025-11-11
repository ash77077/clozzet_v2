import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import { ProductsComponent as ProductsShowcaseComponent } from '../../components/products/products.component';
import { ProductQuoteService} from '../../services/product-quote.service';
import { ProductsService, Product } from '../../services/products.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-products-page',
  standalone: true,
  imports: [CommonModule, ProductsShowcaseComponent, RouterLink],
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss']
})
export class ProductsPageComponent implements OnInit {
  private destroyRef = inject(DestroyRef);

  productType: string | null = null;
  currentProduct: Product | null = null;
  selectedImageIndex: number = 0;
  loading: boolean = true;
  error: string | null = null;

  products: { [key: string]: Product } = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productQuoteService: ProductQuoteService,
    private productsService: ProductsService
  ) {}

  ngOnInit(): void {
    this.loadAllProducts();

    // Subscribe to route params to get the product ID dynamically
    this.route.params.subscribe(params => {
      const productId = params['id'];
      if (productId) {
        this.productType = productId;
        this.loadProduct();
      }
    });
  }

  loadAllProducts(): void {
    this.loading = true;
    this.error = null;

    this.productsService.getAllProducts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (products: Product[]) => {
          // Convert array to dictionary for easy lookup by id
          this.products = products.reduce((acc, product) => {
            acc[product.id] = product;
            return acc;
          }, {} as { [key: string]: Product });

          this.loading = false;
          // Load current product if productType is already set
          if (this.productType) {
            this.loadProduct();
          }
        },
        error: (err) => {
          this.error = 'Failed to load products. Please try again later.';
          this.loading = false;
          console.error('Error loading products:', err);
        }
      });
  }

  loadProduct(): void {
    if (this.productType && this.products[this.productType]) {
      this.currentProduct = this.products[this.productType];
      this.selectedImageIndex = 0;
      this.loading = false;
    } else if (this.productType && !this.loading) {
      // Product not found and not loading
      this.error = `Product "${this.productType}" not found.`;
    }
  }

  selectImage(index: number): void {
    this.selectedImageIndex = index;
  }

  requestQuote(): void {
    if (this.currentProduct) {
      this.productQuoteService.setSelectedProduct({
        productName: this.currentProduct.name,
        category: this.currentProduct.category
      });
      this.router.navigate(['/'], { fragment: 'quote-section' });
    }
  }
}
