import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ProductDetailsService, ProductDetailsFormData } from '../../services/product-details.service';
import { getPriorityDisplayName } from '../../shared/utils/priority.utils';

interface ClothTypeOption {
  value: string;
  label: string;
  description: string;
}

interface TextileType {
  value: string;
  label: string;
}

interface ColorOption {
  value: string;
  label: string;
  hex: string;
}

@Component({
  selector: 'app-product-details-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './product-details-form.component.html',
  styleUrls: ['./product-details-form.component.scss']
})
export class ProductDetailsFormComponent {
  productForm: FormGroup;
  isSubmitting = false;
  submitSuccess = false;
  submitError = false;
  selectedClothType = '';
  submittedOrderId: string | null = null;

  // File upload properties
  logoFiles: File[] = [];
  designFiles: File[] = [];
  referenceImages: File[] = [];
  uploadingFiles = false;
  uploadedFilePaths: { logoFiles?: string[], designFiles?: string[], referenceImages?: string[] } = {};

  clothTypes: ClothTypeOption[] = [
    { value: 't-shirts', label: 'T-Shirts', description: 'Cotton, Poly-cotton, Performance fabrics' },
    { value: 'hoodies', label: 'Hoodies', description: 'Fleece, Cotton blends, Sweatshirt materials' },
    { value: 'polos', label: 'Polo Shirts', description: 'Pique cotton, Performance polo fabrics' },
    { value: 'ecobags', label: 'Eco Bags', description: 'Canvas, Non-woven, Recycled materials' },
    { value: 'caps', label: 'Caps', description: 'Cotton twill, Mesh, Performance materials' },
    { value: 'aprons', label: 'Aprons', description: 'Canvas, Poly-cotton, Waterproof materials' }
  ];

  textileTypes: TextileType[] = [
    { value: 'cotton', label: '100% Cotton' },
    { value: 'poly-cotton', label: 'Poly-Cotton Blend' },
    { value: 'polyester', label: '100% Polyester' },
    { value: 'performance', label: 'Performance Fabric' },
    { value: 'organic-cotton', label: 'Organic Cotton' },
    { value: 'bamboo', label: 'Bamboo Fiber' },
    { value: 'fleece', label: 'Fleece' },
    { value: 'canvas', label: 'Canvas' },
    { value: 'non-woven', label: 'Non-Woven' },
    { value: 'mesh', label: 'Mesh' }
  ];

  colorOptions: ColorOption[] = [
    { value: 'white', label: 'White', hex: '#FFFFFF' },
    { value: 'black', label: 'Black', hex: '#000000' },
    { value: 'navy', label: 'Navy Blue', hex: '#000080' },
    { value: 'royal-blue', label: 'Royal Blue', hex: '#4169E1' },
    { value: 'red', label: 'Red', hex: '#FF0000' },
    { value: 'forest-green', label: 'Forest Green', hex: '#228B22' },
    { value: 'gray', label: 'Gray', hex: '#808080' },
    { value: 'maroon', label: 'Maroon', hex: '#800000' },
    { value: 'yellow', label: 'Yellow', hex: '#FFFF00' },
    { value: 'orange', label: 'Orange', hex: '#FFA500' },
    { value: 'purple', label: 'Purple', hex: '#800080' },
    { value: 'pink', label: 'Pink', hex: '#FFC0CB' },
    { value: 'brown', label: 'Brown', hex: '#A52A2A' },
    { value: 'custom', label: 'Custom Color', hex: '#CCCCCC' }
  ];

  sizeOptions = {
    'apparel': ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'],
    'caps': ['One Size', 'Adjustable', 'S/M', 'L/XL'],
    'bags': ['Small', 'Medium', 'Large', 'Custom']
  };

  printingMethods = [
    { value: 'screen-printing', label: 'Screen Printing' },
    { value: 'embroidery', label: 'Embroidery' },
    { value: 'heat-transfer', label: 'Heat Transfer' },
    { value: 'vinyl', label: 'Vinyl Printing' },
    { value: 'digital-print', label: 'Digital Print' },
    { value: 'sublimation', label: 'Sublimation' },
    { value: 'debossed', label: 'Debossed' },
    { value: 'laser-engraving', label: 'Laser Engraving' }
  ];

  constructor(
    private fb: FormBuilder,
    private productDetailsService: ProductDetailsService,
    private router: Router
  ) {
    this.productForm = this.createForm();
    this.setupFormWatchers();
  }

  createForm(): FormGroup {
    return this.fb.group({
      // Basic Information
      orderNumber: [''],
      clientName: ['', Validators.required],
      salesPerson: ['', Validators.required],
      deadline: ['', Validators.required],
      quantity: ['', [Validators.required, Validators.min(1)]],
      
      // Product Specifications
      clothType: ['', Validators.required],
      textileType: ['', Validators.required],
      fabricWeight: [''],
      colors: [[], Validators.required],
      customColorDetails: [''],
      sizeQuantities: [{}],
      
      // Design & Printing
      printingMethod: ['', Validators.required],
      logoPosition: [''],
      logoSize: [''],
      pantoneColors: [''],
      
      // T-Shirt Specific
      neckStyle: [''],
      sleeveType: [''],
      fit: [''],
      
      // Hoodie Specific
      hoodieStyle: [''],
      pocketType: [''],
      zipperType: [''],
      
      // Polo Specific
      collarStyle: [''],
      buttonCount: [''],
      placketStyle: [''],
      
      // Eco Bag Specific
      bagStyle: [''],
      handleType: [''],
      bagDimensions: [''],
      reinforcement: [''],
      
      // Cap Specific
      capStyle: [''],
      visorType: [''],
      closure: [''],
      
      // Apron Specific
      apronStyle: [''],
      neckStrap: [''],
      waistTie: [''],
      pocketDetails: [''],
      
      // Additional Details
      specialInstructions: [''],
      packagingRequirements: [''],
      shippingAddress: [''],
      priority: ['normal', Validators.required]
    });
  }

  setupFormWatchers(): void {
    this.productForm.get('clothType')?.valueChanges.subscribe(value => {
      this.selectedClothType = value;
      this.updateFormValidators();
    });

    this.productForm.get('colors')?.valueChanges.subscribe(colors => {
      const customColorControl = this.productForm.get('customColorDetails');
      if (colors.includes('custom')) {
        customColorControl?.setValidators([Validators.required]);
      } else {
        customColorControl?.clearValidators();
      }
      customColorControl?.updateValueAndValidity();
    });
  }

  updateFormValidators(): void {
    // Clear all specific validators first
    this.clearSpecificValidators();

    // Add validators based on cloth type
    switch (this.selectedClothType) {
      case 't-shirts':
        this.addTShirtValidators();
        break;
      case 'hoodies':
        this.addHoodieValidators();
        break;
      case 'polos':
        this.addPoloValidators();
        break;
      case 'ecobags':
        this.addEcoBagValidators();
        break;
      case 'caps':
        this.addCapValidators();
        break;
      case 'aprons':
        this.addApronValidators();
        break;
    }
  }

  clearSpecificValidators(): void {
    const specificFields = [
      'neckStyle', 'sleeveType', 'fit',
      'hoodieStyle', 'pocketType', 'zipperType',
      'collarStyle', 'buttonCount', 'placketStyle',
      'bagStyle', 'handleType', 'bagDimensions',
      'capStyle', 'visorType', 'closure',
      'apronStyle', 'neckStrap', 'waistTie'
    ];

    specificFields.forEach(field => {
      this.productForm.get(field)?.clearValidators();
      this.productForm.get(field)?.updateValueAndValidity();
    });
  }

  addTShirtValidators(): void {
    this.productForm.get('neckStyle')?.setValidators([Validators.required]);
    this.productForm.get('sleeveType')?.setValidators([Validators.required]);
    this.productForm.get('fit')?.setValidators([Validators.required]);
    this.updateValidators(['neckStyle', 'sleeveType', 'fit']);
  }

  addHoodieValidators(): void {
    this.productForm.get('hoodieStyle')?.setValidators([Validators.required]);
    this.productForm.get('pocketType')?.setValidators([Validators.required]);
    this.updateValidators(['hoodieStyle', 'pocketType']);
  }

  addPoloValidators(): void {
    this.productForm.get('collarStyle')?.setValidators([Validators.required]);
    this.productForm.get('buttonCount')?.setValidators([Validators.required]);
    this.updateValidators(['collarStyle', 'buttonCount']);
  }

  addEcoBagValidators(): void {
    this.productForm.get('bagStyle')?.setValidators([Validators.required]);
    this.productForm.get('handleType')?.setValidators([Validators.required]);
    this.productForm.get('bagDimensions')?.setValidators([Validators.required]);
    this.updateValidators(['bagStyle', 'handleType', 'bagDimensions']);
  }

  addCapValidators(): void {
    this.productForm.get('capStyle')?.setValidators([Validators.required]);
    this.productForm.get('visorType')?.setValidators([Validators.required]);
    this.updateValidators(['capStyle', 'visorType']);
  }

  addApronValidators(): void {
    this.productForm.get('apronStyle')?.setValidators([Validators.required]);
    this.updateValidators(['apronStyle']);
  }

  updateValidators(fields: string[]): void {
    fields.forEach(field => {
      this.productForm.get(field)?.updateValueAndValidity();
    });
  }

  onColorChange(colorValue: string, event: any): void {
    const colors = this.productForm.get('colors')?.value || [];
    if (event.target.checked) {
      colors.push(colorValue);
    } else {
      const index = colors.indexOf(colorValue);
      if (index > -1) {
        colors.splice(index, 1);
      }
    }
    this.productForm.get('colors')?.setValue(colors);
  }

  onSizeQuantityChange(size: string, e: any): void {
    const sizeQuantities = this.productForm.get('sizeQuantities')?.value || {};
    const quantity = e.target ? +(e.target as HTMLInputElement).value : 0

    if (quantity > 0) {
      sizeQuantities[size] = quantity;
    } else {
      delete sizeQuantities[size];
    }
    
    this.productForm.get('sizeQuantities')?.setValue(sizeQuantities);
    this.updateTotalQuantity();
  }

  getSizeQuantity(size: string): number {
    const sizeQuantities = this.productForm.get('sizeQuantities')?.value || {};
    return sizeQuantities[size] || 0;
  }

  updateTotalQuantity(): void {
    const sizeQuantities = this.productForm.get('sizeQuantities')?.value || {};
    const total = Object.values(sizeQuantities).reduce((sum: number, qty: any) => sum + (qty || 0), 0);
    this.productForm.get('quantity')?.setValue(total);
  }

  getTotalQuantity(): number {
    const sizeQuantities = this.productForm.get('sizeQuantities')?.value || {};
    return Object.values(sizeQuantities).reduce((sum: number, qty: any) => sum + (qty || 0), 0);
  }

  hasSizeQuantities(): boolean {
    const sizeQuantities = this.productForm.get('sizeQuantities')?.value || {};
    return Object.keys(sizeQuantities).length > 0 && Object.values(sizeQuantities).some(qty => (qty as number) > 0);
  }

  getSizesForClothType(): string[] {
    switch (this.selectedClothType) {
      case 'caps':
        return this.sizeOptions.caps;
      case 'ecobags':
        return this.sizeOptions.bags;
      default:
        return this.sizeOptions.apparel;
    }
  }

  isColorSelected(colorValue: string): boolean {
    const colors = this.productForm.get('colors')?.value || [];
    return colors.includes(colorValue);
  }

  isSizeSelected(size: string): boolean {
    const sizes = this.productForm.get('sizes')?.value || [];
    return sizes.includes(size);
  }

  // File upload methods
  onFileSelect(event: any, type: 'logo' | 'design' | 'reference'): void {
    const files = event.target.files;
    if (files && files.length > 0) {
      for (let file of files) {
        if (this.isValidFile(file)) {
          switch (type) {
            case 'logo':
              this.logoFiles.push(file);
              break;
            case 'design':
              this.designFiles.push(file);
              break;
            case 'reference':
              this.referenceImages.push(file);
              break;
          }
        }
      }
    }
  }

  isValidFile(file: File): boolean {
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'application/pdf', 'application/postscript', 'application/illustrator',
      'application/x-photoshop', 'image/vnd.adobe.photoshop'
    ];
    const maxSize = 50 * 1024 * 1024; // 50MB

    if (!allowedTypes.includes(file.type)) {
      alert(`File type ${file.type} not supported. Please upload images (.jpg, .png, .gif, .svg) or design files (.ai, .psd, .pdf)`);
      return false;
    }

    if (file.size > maxSize) {
      alert(`File ${file.name} is too large. Maximum size is 50MB.`);
      return false;
    }

    return true;
  }

  removeFile(index: number, type: 'logo' | 'design' | 'reference'): void {
    switch (type) {
      case 'logo':
        this.logoFiles.splice(index, 1);
        break;
      case 'design':
        this.designFiles.splice(index, 1);
        break;
      case 'reference':
        this.referenceImages.splice(index, 1);
        break;
    }
  }

  getFileSize(size: number): string {
    if (size < 1024) return size + ' B';
    if (size < 1024 * 1024) return Math.round(size / 1024) + ' KB';
    return Math.round(size / (1024 * 1024)) + ' MB';
  }

  async uploadAllFiles(): Promise<void> {
    const allFiles = [...this.logoFiles, ...this.designFiles, ...this.referenceImages];
    if (allFiles.length === 0) return;

    this.uploadingFiles = true;
    try {
      const response = await this.productDetailsService.uploadFiles(allFiles).toPromise();
      if (response?.success && response.data?.uploadedFiles) {
        // Categorize uploaded files based on original file arrays
        let logoIndex = 0;
        let designIndex = 0;
        let referenceIndex = 0;

        this.uploadedFilePaths = {
          logoFiles: [],
          designFiles: [],
          referenceImages: []
        };

        response.data.uploadedFiles.forEach((uploadedFile: any) => {
          if (logoIndex < this.logoFiles.length) {
            this.uploadedFilePaths.logoFiles!.push(uploadedFile.filename);
            logoIndex++;
          } else if (designIndex < this.designFiles.length) {
            this.uploadedFilePaths.designFiles!.push(uploadedFile.filename);
            designIndex++;
          } else if (referenceIndex < this.referenceImages.length) {
            this.uploadedFilePaths.referenceImages!.push(uploadedFile.filename);
            referenceIndex++;
          }
        });
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Error uploading files. Please try again.');
    } finally {
      this.uploadingFiles = false;
    }
  }

  async onSubmit(): Promise<void> {
    if (this.productForm.valid) {
      this.isSubmitting = true;
      this.submitError = false;

      // Upload files first if there are any
      if (this.logoFiles.length > 0 || this.designFiles.length > 0 || this.referenceImages.length > 0) {
        await this.uploadAllFiles();
      }

      const formValue = { ...this.productForm.value };
      
      // Remove orderNumber if it's empty (will be auto-generated)
      if (!formValue.orderNumber || formValue.orderNumber.trim() === '') {
        delete formValue.orderNumber;
      }

      const formData: ProductDetailsFormData = {
        ...formValue,
        logoFiles: this.uploadedFilePaths.logoFiles || [],
        designFiles: this.uploadedFilePaths.designFiles || [],
        referenceImages: this.uploadedFilePaths.referenceImages || []
      };

      console.log('Product Details Form Data:', formData);

      this.productDetailsService.submitProductDetails(formData).subscribe({
        next: (response) => {
          console.log('Product details submitted successfully:', response);
          this.isSubmitting = false;
          this.submitSuccess = true;

          // Store the order ID from response
          if (response?.data?._id) {
            this.submittedOrderId = response.data._id;
          }

          // Reset form after success (but keep submittedOrderId for the button)
          setTimeout(() => {
            this.submitSuccess = false;
            this.submittedOrderId = null;
            this.productForm.reset();
            this.selectedClothType = '';
            // Reset file uploads
            this.logoFiles = [];
            this.designFiles = [];
            this.referenceImages = [];
            this.uploadedFilePaths = {};
          }, 10000); // Extended to 10 seconds to give time to click the button
        },
        error: (error) => {
          console.error('Error submitting product details:', error);
          this.isSubmitting = false;
          this.submitError = true;

          // Clear error after a delay
          setTimeout(() => {
            this.submitError = false;
          }, 5000);
        }
      });
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.productForm.controls).forEach(key => {
        this.productForm.get(key)?.markAsTouched();
      });
    }
  }

  getFieldError(fieldName: string): string {
    const field = this.productForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['min']) return `Minimum value is ${field.errors['min'].min}`;
    }
    return '';
  }

  get f() { return this.productForm.controls; }

  selectPriority(priority: string): void {
    this.productForm.patchValue({ priority });
  }

  viewOrderBlank(): void {
    if (this.submittedOrderId) {
      this.router.navigate(['/order-blank', this.submittedOrderId]);
    }
  }

  getPriorityDisplayName = getPriorityDisplayName;
}
