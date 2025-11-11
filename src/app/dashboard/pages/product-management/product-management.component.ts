import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ProductsService, Product } from '../../../services/products.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-product-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './product-management.component.html',
  styleUrls: ['./product-management.component.scss']
})
export class ProductManagementComponent implements OnInit {
  products: Product[] = [];
  selectedProduct: Product | null = null;
  showModal: boolean = false;
  isEditing: boolean = false;
  productForm: FormGroup;
  private destroyRef = inject(DestroyRef);
  loading: boolean = false;
  error: string | null = null;

  constructor(
    private productsService: ProductsService,
    private fb: FormBuilder,
    private router: Router
  ) {
    this.productForm = this.createProductForm();
  }

  ngOnInit(): void {
    this.loadProducts();
  }

  createProductForm(): FormGroup {
    return this.fb.group({
      id: ['', Validators.required],
      name: ['', Validators.required],
      category: ['', Validators.required],
      tagline: ['', Validators.required],
      description: ['', Validators.required],
      images: this.fb.array([this.fb.control('', Validators.required)]),
      features: this.fb.array([this.fb.control('', Validators.required)]),
      variants: this.fb.array([this.createVariantGroup()]),
      useCases: this.fb.array([this.fb.control('', Validators.required)]),
      startingPrice: [0, [Validators.required, Validators.min(0)]],
      isActive: [true]
    });
  }

  createVariantGroup(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required],
      colors: this.fb.array([this.fb.control('', Validators.required)]),
      sizes: this.fb.array([this.fb.control('', Validators.required)]),
      materials: this.fb.array([this.fb.control('', Validators.required)]),
      gsm: this.fb.array([this.fb.control('')]),
      image: ['']
    });
  }

  get images(): FormArray {
    return this.productForm.get('images') as FormArray;
  }

  get features(): FormArray {
    return this.productForm.get('features') as FormArray;
  }

  get variants(): FormArray {
    return this.productForm.get('variants') as FormArray;
  }

  get useCases(): FormArray {
    return this.productForm.get('useCases') as FormArray;
  }

  getVariantColors(variantIndex: number): FormArray {
    return this.variants.at(variantIndex).get('colors') as FormArray;
  }

  getVariantSizes(variantIndex: number): FormArray {
    return this.variants.at(variantIndex).get('sizes') as FormArray;
  }

  getVariantMaterials(variantIndex: number): FormArray {
    return this.variants.at(variantIndex).get('materials') as FormArray;
  }

  getVariantGsm(variantIndex: number): FormArray {
    return this.variants.at(variantIndex).get('gsm') as FormArray;
  }

  addImage(): void {
    this.images.push(this.fb.control('', Validators.required));
  }

  removeImage(index: number): void {
    this.images.removeAt(index);
  }

  addFeature(): void {
    this.features.push(this.fb.control('', Validators.required));
  }

  removeFeature(index: number): void {
    this.features.removeAt(index);
  }

  addVariant(): void {
    this.variants.push(this.createVariantGroup());
  }

  removeVariant(index: number): void {
    this.variants.removeAt(index);
  }

  addUseCase(): void {
    this.useCases.push(this.fb.control('', Validators.required));
  }

  removeUseCase(index: number): void {
    this.useCases.removeAt(index);
  }

  addVariantColor(variantIndex: number): void {
    this.getVariantColors(variantIndex).push(this.fb.control('', Validators.required));
  }

  removeVariantColor(variantIndex: number, colorIndex: number): void {
    this.getVariantColors(variantIndex).removeAt(colorIndex);
  }

  addVariantSize(variantIndex: number): void {
    this.getVariantSizes(variantIndex).push(this.fb.control('', Validators.required));
  }

  removeVariantSize(variantIndex: number, sizeIndex: number): void {
    this.getVariantSizes(variantIndex).removeAt(sizeIndex);
  }

  addVariantMaterial(variantIndex: number): void {
    this.getVariantMaterials(variantIndex).push(this.fb.control('', Validators.required));
  }

  removeVariantMaterial(variantIndex: number, materialIndex: number): void {
    this.getVariantMaterials(variantIndex).removeAt(materialIndex);
  }

  addVariantGsm(variantIndex: number): void {
    this.getVariantGsm(variantIndex).push(this.fb.control(''));
  }

  removeVariantGsm(variantIndex: number, gsmIndex: number): void {
    this.getVariantGsm(variantIndex).removeAt(gsmIndex);
  }

  loadProducts(): void {
    this.loading = true;
    this.error = null;
    this.productsService.getAllProductsAdmin()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (products) => {
          this.products = products;
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Failed to load products';
          this.loading = false;
          console.error(err);
        }
      });
  }

  openCreateModal(): void {
    this.isEditing = false;
    this.selectedProduct = null;
    this.error = null;
    this.productForm = this.createProductForm();
    this.showModal = true;
  }

  openEditModal(product: Product): void {
    this.isEditing = true;
    this.selectedProduct = product;
    this.error = null;
    this.patchFormWithProduct(product);
    this.showModal = true;
  }

  patchFormWithProduct(product: Product): void {
    // Clear all arrays first
    while (this.images.length) this.images.removeAt(0);
    while (this.features.length) this.features.removeAt(0);
    while (this.variants.length) this.variants.removeAt(0);
    while (this.useCases.length) this.useCases.removeAt(0);

    // Add images
    product.images.forEach(img => this.images.push(this.fb.control(img, Validators.required)));

    // Add features
    product.features.forEach(feature => this.features.push(this.fb.control(feature, Validators.required)));

    // Add variants
    product.variants.forEach(variant => {
      const variantGroup = this.fb.group({
        name: [variant.name, Validators.required],
        colors: this.fb.array(variant.colors.map(c => this.fb.control(c, Validators.required))),
        sizes: this.fb.array(variant.sizes.map(s => this.fb.control(s, Validators.required))),
        materials: this.fb.array(variant.materials.map(m => this.fb.control(m, Validators.required))),
        gsm: this.fb.array((variant.gsm || []).map(g => this.fb.control(g))),
        image: [variant.image || '']
      });
      this.variants.push(variantGroup);
    });

    // Add use cases
    product.useCases.forEach(useCase => this.useCases.push(this.fb.control(useCase, Validators.required)));

    // Patch simple values
    this.productForm.patchValue({
      id: product.id,
      name: product.name,
      category: product.category,
      tagline: product.tagline,
      description: product.description,
      startingPrice: product.startingPrice,
      isActive: product.isActive
    });
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedProduct = null;
    this.productForm.reset();
  }

  saveProduct(): void {
    console.log('Save product called');
    console.log('Form valid:', this.productForm.valid);
    console.log('Form value:', this.productForm.value);

    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      console.log('Form errors:', this.getFormValidationErrors());
      this.error = 'Please fill in all required fields correctly.';
      return;
    }

    this.loading = true;
    this.error = null;
    const productData = this.productForm.value;

    console.log('Submitting product data:', productData);

    if (this.isEditing && this.selectedProduct) {
      console.log('Updating product:', this.selectedProduct.id);
      this.productsService.updateProduct(this.selectedProduct.id, productData)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (response) => {
            console.log('Product updated successfully:', response);
            this.loading = false;
            this.closeModal();
            this.loadProducts();
          },
          error: (err) => {
            this.error = 'Failed to update product: ' + (err.error?.message || err.message);
            this.loading = false;
            console.error('Update error:', err);
          }
        });
    } else {
      console.log('Creating new product');
      this.productsService.createProduct(productData)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (response) => {
            console.log('Product created successfully:', response);
            this.loading = false;
            this.closeModal();
            this.loadProducts();
            // Navigate to the newly created product's detail page
            this.router.navigate(['/products', productData.id]);
          },
          error: (err) => {
            this.error = 'Failed to create product: ' + (err.error?.message || err.message);
            this.loading = false;
            console.error('Create error:', err);
          }
        });
    }
  }

  getFormValidationErrors(): any {
    const errors: any = {};
    Object.keys(this.productForm.controls).forEach(key => {
      const control = this.productForm.get(key);
      if (control && control.errors) {
        errors[key] = control.errors;
      }
    });
    return errors;
  }

  toggleProductActive(product: Product): void {
    this.productsService.toggleActive(product.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loadProducts();
        },
        error: (err) => {
          this.error = 'Failed to toggle product status';
          console.error(err);
        }
      });
  }

  deleteProduct(product: Product): void {
    if (!confirm(`Are you sure you want to delete ${product.name}?`)) {
      return;
    }

    this.productsService.deleteProduct(product.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loadProducts();
        },
        error: (err) => {
          this.error = 'Failed to delete product';
          console.error(err);
        }
      });
  }

  onVariantImageSelected(event: Event, variantIndex: number): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      // Upload the image
      this.productsService.uploadVariantImage(file)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (response) => {
            // Update the variant image field with the filename
            this.variants.at(variantIndex).patchValue({
              image: response.data.filename
            });
            console.log('Variant image uploaded:', response.data.filename);
          },
          error: (err) => {
            this.error = 'Failed to upload variant image: ' + (err.error?.message || err.message);
            console.error('Upload error:', err);
          }
        });
    }
  }

  getVariantImageUrl(filename: string): string {
    return this.productsService.getVariantImageUrl(filename);
  }

  hasVariantImage(variantIndex: number): boolean {
    return !!this.variants.at(variantIndex).get('image')?.value;
  }
}