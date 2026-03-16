import { Component, OnInit, OnDestroy, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { QuoteService } from '../../services/quote.service';
import { ProductQuoteService } from '../../services/product-quote.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

interface UploadedFileWithPreview {
  file: File;
  preview: string;
}

@Component({
  selector: 'app-quote-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './quote-form.component.html',
  styleUrls: ['./quote-form.component.scss']
})
export class QuoteFormComponent implements OnInit, OnDestroy {
  quoteForm: FormGroup;
  isSubmitting = false;
  submitSuccess = false;
  submitError = false;
  private destroyRef = inject(DestroyRef);

  productTypes = [
    { value: 't-shirts', translationKey: 'quoteForm.form.productTypes.tshirts' },
    { value: 'polo-shirts', translationKey: 'quoteForm.form.productTypes.polo' },
    { value: 'hoodies', translationKey: 'quoteForm.form.productTypes.hoodies' },
    { value: 'caps', translationKey: 'quoteForm.form.productTypes.caps' },
    { value: 'jackets', translationKey: 'quoteForm.form.productTypes.jackets' },
    { value: 'promotional', translationKey: 'quoteForm.form.productTypes.promotional' },
    { value: 'other', translationKey: 'quoteForm.form.productTypes.other' }
  ];

  uploadedFiles: UploadedFileWithPreview[] = [];
  maxFiles = 5;
  maxFileSize = 5 * 1024 * 1024; // 5MB
  isDragging = false;

  constructor(
    private fb: FormBuilder,
    private quoteService: QuoteService,
    private productQuoteService: ProductQuoteService,
    private translate: TranslateService
  ) {
    this.quoteForm = this.fb.group({
      companyName: ['', [Validators.required, Validators.minLength(2)]],
      contactName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern('^[+]?[0-9\\s\\-\\(\\)]{9,}$')]],
      productType: ['', Validators.required],
      quantity: ['', [Validators.required, Validators.min(1), Validators.max(10000)]],
      message: [''], // Made optional
    });
  }

  ngOnInit(): void {
    // Subscribe to product selection using takeUntilDestroyed
    this.productQuoteService.selectedProduct$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(productInfo => {
        if (productInfo) {
          this.prefillProductInfo(productInfo);
          // Clear the product info after using it
          this.productQuoteService.clearSelectedProduct();
        }
      });
  }

  private prefillProductInfo(productDetail: { productName: string; category: string }): void {
    // Map category to productType value
    const productTypeMap: { [key: string]: string } = {
      'T-Shirt': 't-shirts',
      'Polo': 'polo-shirts',
      'Hoodie': 'hoodies',
      'Cap': 'caps',
      'Tote Bag': 'promotional',
      'Apron': 'promotional'
    };

    const productTypeValue = productTypeMap[productDetail.category] || '';

    // Prefill the form
    this.quoteForm.patchValue({
      productType: productTypeValue,
      message: `I'm interested in getting a quote for ${productDetail.productName}. `
    });
  }

  get f() {
    return this.quoteForm.controls;
  }

  getFieldError(fieldName: string): string {
    const field = this.f[fieldName];
    if (field.errors && field.touched) {
      const fieldLabel = this.getFieldLabel(fieldName);

      if (field.errors['required']) {
        return `${fieldLabel} ${this.translate.instant('quoteForm.form.errors.required')}`;
      }
      if (field.errors['email']) {
        return this.translate.instant('quoteForm.form.errors.email');
      }
      if (field.errors['minlength']) {
        const minLength = field.errors['minlength'].requiredLength;
        return `${fieldLabel} ${this.translate.instant('quoteForm.form.errors.minLength')} ${minLength} ${this.translate.instant('quoteForm.form.errors.characters')}`;
      }
      if (field.errors['pattern']) {
        return this.translate.instant('quoteForm.form.errors.pattern');
      }
      if (field.errors['min']) {
        return this.translate.instant('quoteForm.form.errors.minQuantity');
      }
      if (field.errors['max']) {
        return this.translate.instant('quoteForm.form.errors.maxQuantity');
      }
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labelKeys: { [key: string]: string } = {
      companyName: 'quoteForm.form.companyName',
      contactName: 'quoteForm.form.contactName',
      email: 'quoteForm.form.email',
      phone: 'quoteForm.form.phone',
      productType: 'quoteForm.form.productType',
      quantity: 'quoteForm.form.quantity',
      message: 'quoteForm.form.message',
    };
    return this.translate.instant(labelKeys[fieldName] || fieldName);
  }

  onSubmit(): void {
    if (this.quoteForm.valid) {
      this.isSubmitting = true;
      this.submitError = false;

      const formData = new FormData();

      // Add form fields
      Object.keys(this.quoteForm.value).forEach(key => {
        const value = this.quoteForm.value[key];
        if (value !== null && value !== undefined && value !== '') {
          formData.append(key, value);
        }
      });

      // Add files
      this.uploadedFiles.forEach((fileWithPreview) => {
        formData.append('mockups', fileWithPreview.file, fileWithPreview.file.name);
      });

      this.quoteService.submitQuoteWithFiles(formData).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.submitSuccess = true;

          // Reset form after success
          setTimeout(() => {
            this.submitSuccess = false;
            this.quoteForm.reset();
            // Clean up preview URLs before clearing
            this.uploadedFiles.forEach(fileWithPreview => {
              if (fileWithPreview.preview) {
                URL.revokeObjectURL(fileWithPreview.preview);
              }
            });
            this.uploadedFiles = [];
          }, 3000);
        },
        error: (error) => {
          console.error('Error submitting quote:', error);
          this.isSubmitting = false;
          this.submitError = true;

          // Hide error message after 5 seconds
          setTimeout(() => {
            this.submitError = false;
          }, 5000);
        }
      });
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.quoteForm.controls).forEach(key => {
        this.f[key].markAsTouched();
      });
    }
  }

  trackByValue(item: any): any {
    return item.value;
  }

  onFileSelect(event: any): void {
    const files = event.target.files;

    if (files && files.length > 0) {
      this.processFiles(files);
    }

    // Reset input
    event.target.value = '';
  }

  removeFile(index: number): void {
    // Clean up the preview URL to avoid memory leaks
    const fileWithPreview = this.uploadedFiles[index];
    if (fileWithPreview && fileWithPreview.preview) {
      URL.revokeObjectURL(fileWithPreview.preview);
    }
    this.uploadedFiles.splice(index, 1);
  }

  getFileSizeString(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.processFiles(files);
    }
  }

  private processFiles(files: FileList): void {
    // Check total number of files
    if (this.uploadedFiles.length + files.length > this.maxFiles) {
      alert(this.translate.instant('quoteForm.form.fileUpload.maxFilesError', { max: this.maxFiles }));
      return;
    }

    // Validate and add files
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Check file size
      if (file.size > this.maxFileSize) {
        alert(this.translate.instant('quoteForm.form.fileUpload.fileSizeError', {
          fileName: file.name,
          maxSize: '5MB'
        }));
        continue;
      }

      // Check file type (images only)
      if (!file.type.startsWith('image/')) {
        alert(this.translate.instant('quoteForm.form.fileUpload.fileTypeError', { fileName: file.name }));
        continue;
      }

      // Generate preview URL for the image
      const preview = URL.createObjectURL(file);
      this.uploadedFiles.push({ file, preview });
    }
  }

  ngOnDestroy(): void {
    // Clean up all preview URLs when component is destroyed
    this.uploadedFiles.forEach(fileWithPreview => {
      if (fileWithPreview.preview) {
        URL.revokeObjectURL(fileWithPreview.preview);
      }
    });
  }
}
