import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { QuoteService, QuoteRequest } from '../../services/quote.service';

@Component({
  selector: 'app-quote-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './quote-form.component.html',
  styleUrls: ['./quote-form.component.scss']
})
export class QuoteFormComponent {
  quoteForm: FormGroup;
  isSubmitting = false;
  submitSuccess = false;
  submitError = false;

  productTypes = [
    { value: 't-shirts', label: 'Custom T-Shirts' },
    { value: 'polo-shirts', label: 'Polo Shirts' },
    { value: 'hoodies', label: 'Hoodies & Sweatshirts' },
    { value: 'caps', label: 'Custom Caps' },
    { value: 'jackets', label: 'Jackets & Outerwear' },
    { value: 'promotional', label: 'Promotional Items' },
    { value: 'other', label: 'Other (specify in message)' }
  ];

  budgetRanges = [
    { value: 'under-1000', label: 'Under $1,000' },
    { value: '1000-5000', label: '$1,000 - $5,000' },
    { value: '5000-10000', label: '$5,000 - $10,000' },
    { value: '10000-25000', label: '$10,000 - $25,000' },
    { value: 'over-25000', label: 'Over $25,000' }
  ];

  timelines = [
    { value: 'asap', label: 'ASAP' },
    { value: '1-week', label: 'Within 1 week' },
    { value: '2-weeks', label: 'Within 2 weeks' },
    { value: '1-month', label: 'Within 1 month' },
    { value: 'flexible', label: 'Flexible timeline' }
  ];

  additionalServicesList = [
    { value: 'logo-design', label: 'Logo Design Assistance' },
    { value: 'rush-delivery', label: 'Rush Delivery' },
    { value: 'sample-creation', label: 'Sample Creation' },
    { value: 'packaging', label: 'Custom Packaging' },
    { value: 'shipping', label: 'Shipping Coordination' }
  ];

  constructor(
    private fb: FormBuilder,
    private quoteService: QuoteService
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
      if (field.errors['required']) {
        return `${this.getFieldLabel(fieldName)} is required`;
      }
      if (field.errors['email']) {
        return 'Please enter a valid email address';
      }
      if (field.errors['minlength']) {
        return `${this.getFieldLabel(fieldName)} must be at least ${field.errors['minlength'].requiredLength} characters`;
      }
      if (field.errors['pattern']) {
        return 'Please enter a valid phone number';
      }
      if (field.errors['min']) {
        return 'Quantity must be at least 1';
      }
      if (field.errors['max']) {
        return 'Please contact us directly for quantities over 10,000';
      }
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      companyName: 'Company name',
      contactName: 'Contact name',
      email: 'Email',
      phone: 'Phone',
      productType: 'Product type',
      quantity: 'Quantity',
      message: 'Message',
      budget: 'Budget',
      timeline: 'Timeline'
    };
    return labels[fieldName] || fieldName;
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
