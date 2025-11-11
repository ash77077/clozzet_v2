import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { QuoteService, QuoteRequest } from '../../services/quote.service';
import { ProductQuoteService } from '../../services/product-quote.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-quote-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './quote-form.component.html',
  styleUrls: ['./quote-form.component.scss']
})
export class QuoteFormComponent implements OnInit {
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

  budgetRanges = [
    { value: 'under-1000', translationKey: 'quoteForm.form.budgetRanges.under1000' },
    { value: '1000-5000', translationKey: 'quoteForm.form.budgetRanges.1000to5000' },
    { value: '5000-10000', translationKey: 'quoteForm.form.budgetRanges.5000to10000' },
    { value: '10000-25000', translationKey: 'quoteForm.form.budgetRanges.10000to25000' },
    { value: 'over-25000', translationKey: 'quoteForm.form.budgetRanges.over25000' }
  ];

  timelines = [
    { value: 'asap', translationKey: 'quoteForm.form.timelines.asap' },
    { value: '1-week', translationKey: 'quoteForm.form.timelines.1week' },
    { value: '2-weeks', translationKey: 'quoteForm.form.timelines.2weeks' },
    { value: '1-month', translationKey: 'quoteForm.form.timelines.1month' },
    { value: 'flexible', translationKey: 'quoteForm.form.timelines.flexible' }
  ];

  additionalServicesList = [
    { value: 'logo-design', translationKey: 'quoteForm.form.additionalServicesList.logoDesign' },
    { value: 'rush-delivery', translationKey: 'quoteForm.form.additionalServicesList.rushDelivery' },
    { value: 'sample-creation', translationKey: 'quoteForm.form.additionalServicesList.sampleCreation' },
    { value: 'packaging', translationKey: 'quoteForm.form.additionalServicesList.packaging' },
    { value: 'shipping', translationKey: 'quoteForm.form.additionalServicesList.shipping' }
  ];

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
      phone: ['', [Validators.required, Validators.pattern('^[+]?[0-9\\s\\-\\(\\)]{10,}$')]],
      productType: ['', Validators.required],
      quantity: ['', [Validators.required, Validators.min(1), Validators.max(10000)]],
      additionalServices: [[]],
      message: ['', [Validators.required, Validators.minLength(10)]],
      budget: ['', Validators.required],
      timeline: ['', Validators.required]
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

  onServiceChange(serviceValue: string, isChecked: any): void {
    const currentServices = this.f['additionalServices'].value as string[];
    if (isChecked.checked) {
      this.f['additionalServices'].setValue([...currentServices, serviceValue]);
    } else {
      this.f['additionalServices'].setValue(currentServices.filter(s => s !== serviceValue));
    }
  }

  isServiceSelected(serviceValue: string): boolean {
    const selectedServices = this.f['additionalServices'].value as string[];
    return selectedServices.includes(serviceValue);
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
      budget: 'quoteForm.form.budget',
      timeline: 'quoteForm.form.timeline'
    };
    return this.translate.instant(labelKeys[fieldName] || fieldName);
  }

  onSubmit(): void {
    if (this.quoteForm.valid) {
      this.isSubmitting = true;
      this.submitError = false;
      
      const quoteData: QuoteRequest = this.quoteForm.value

      this.quoteService.submitQuote(quoteData).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.submitSuccess = true;
          
          // Reset form after success
          setTimeout(() => {
            this.submitSuccess = false;
            // this.quoteForm.reset();
            this.f['additionalServices'].setValue([]);
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

  trackByValue(index: number, item: any): any {
    return item.value;
  }
}
