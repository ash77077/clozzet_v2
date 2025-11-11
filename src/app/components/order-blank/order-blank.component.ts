import {Component, DestroyRef, inject, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ActivatedRoute, Router} from '@angular/router';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {HttpClient} from '@angular/common/http';
import {ProductDetailsService} from '../../services/product-details.service';
import {SalesPersonService} from '../../services/sales-person.service';
import {TranslateModule} from '@ngx-translate/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {environment} from '../../../environments/environment';
import {AutoCompleteModule} from 'primeng/autocomplete';
import {SalesPerson} from '../../models/sales-person.model';

@Component({
  selector: 'app-order-blank',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, AutoCompleteModule],
  templateUrl: './order-blank.component.html',
  styleUrls: ['./order-blank.component.scss']
})
export class OrderBlankComponent implements OnInit {
  private destroyRef = inject(DestroyRef);

  orderForm: FormGroup;
  loading: boolean = true;
  error: string | null = null;
  orderId: string | null = null;
  sending: boolean = false;
  successMessage: string | null = null;
  isViewMode: boolean = false;
  currentUser: any = null;

  // Sales person autocomplete properties
  salesPersons: SalesPerson[] = [];
  filteredSalesPersons: string[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productDetailsService: ProductDetailsService,
    private salesPersonService: SalesPersonService,
    private fb: FormBuilder,
    private http: HttpClient
  ) {
    this.orderForm = this.createForm();
    this.loadCurrentUser();
    this.loadSalesPersons();
  }

  createForm(): FormGroup {
    return this.fb.group({
      orderNumber: ['', [Validators.required, Validators.minLength(2)]],
      clientName: ['', [Validators.required, Validators.minLength(2)]],
      salesPerson: ['', [Validators.required]],
      deadline: ['', [Validators.required]],
      quantity: [''],
      priority: ['normal'],
      clothType: ['', [Validators.required]],
      textileType: [''],
      colors: [''],
      customColorDetails: [''],
      logoPosition: [''],
      logoSize: [''],
      specialInstructions: [''],
      packagingRequirements: [''],
      shippingAddress: [''],
      // Size breakdown
      sizes: this.fb.group({
        xs: this.fb.group({ men: [''], women: [''], uni: [''] }),
        s: this.fb.group({ men: [''], women: [''], uni: [''] }),
        m: this.fb.group({ men: [''], women: [''], uni: [''] }),
        l: this.fb.group({ men: [''], women: [''], uni: [''] }),
        xl: this.fb.group({ men: [''], women: [''], uni: [''] }),
        xxl: this.fb.group({ men: [''], women: [''], uni: [''] }),
        xxxl: this.fb.group({ men: [''], women: [''], uni: [''] }),
        xxxxl: this.fb.group({ men: [''], women: [''], uni: [''] })
      })
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.orderId = params['id'];
      this.isViewMode = !!this.orderId;

      if (this.orderId) {
        this.loadOrderData();
      } else {
        // No order ID - show blank form
        this.loading = false;
      }
    });
  }

  loadOrderData(): void {
    if (!this.orderId) return;

    this.loading = true;
    this.error = null;

    const apiUrl = environment.apiUrl || 'http://localhost:3000';

    this.http.get(`${apiUrl}/api/orders/${this.orderId}`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: any) => {
          const data = response.data;
          this.orderForm.patchValue({
            orderNumber: data.orderNumber || '',
            clientName: data.clientName || '',
            salesPerson: data.salesPerson || '',
            deadline: data.deadline ? new Date(data.deadline).toISOString().split('T')[0] : '',
            quantity: data.quantity || '',
            priority: data.priority || 'normal',
            clothType: data.clothType || '',
            textileType: data.textileType || '',
            colors: data.colors || '',
            customColorDetails: data.customColorDetails || '',
            logoPosition: data.logoPosition || '',
            logoSize: data.logoSize || '',
            specialInstructions: data.specialInstructions || '',
            packagingRequirements: data.packagingRequirements || '',
            shippingAddress: data.shippingAddress || '',
            sizes: data.sizes || {}
          });
          this.loading = false;
        },
        error: (err: any) => {
          this.error = 'Failed to load order details';
          this.loading = false;
          console.error('Error loading order:', err);
        }
      });
  }

  print(): void {
    window.print();
  }

  getCurrentDate(): string {
    return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  getPriorityLabel(priority: string): string {
    // Return translation key for priority
    return `orderBlank.priority.${priority}`;
  }

  // Calculate total for a specific gender across all sizes
  calculateTotal(gender: 'men' | 'women' | 'uni'): number {
    const sizes = this.orderForm.get('sizes') as FormGroup;
    if (!sizes) return 0;

    const sizeKeys = ['xs', 's', 'm', 'l', 'xl', 'xxl', 'xxxl', 'xxxxl'];
    let total = 0;

    sizeKeys.forEach(sizeKey => {
      const sizeGroup = sizes.get(sizeKey) as FormGroup;
      if (sizeGroup) {
        const value = sizeGroup.get(gender)?.value || 0;
        total += Number(value);
      }
    });

    return total;
  }

  // Calculate grand total across all sizes and genders
  calculateGrandTotal(): number {
    return this.calculateTotal('men') + this.calculateTotal('women') + this.calculateTotal('uni');
  }

  // Load current user from localStorage
  loadCurrentUser(): void {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      try {
        this.currentUser = JSON.parse(userStr);
      } catch (error) {
        console.error('Failed to parse user data:', error);
        this.currentUser = null;
      }
    }
  }

  // Check if user can set orders (manager, admin, or super-admin)
  canSetOrder(): boolean {
    if (!this.currentUser || !this.currentUser.role) {
      return false;
    }
    const allowedRoles = ['manager', 'admin', 'super-admin'];
    return allowedRoles.includes(this.currentUser.role.toLowerCase());
  }

  // Navigate to new blank order form
  newOrder(): void {
    this.router.navigate(['/order-blank']);
  }

  // Helper to check if a form control has value
  hasValue(controlName: string): boolean {
    const value = this.orderForm.get(controlName)?.value;
    return value !== null && value !== undefined && value !== '';
  }

  // Helper to check if a size row has any values
  hasSizeValues(sizeKey: string): boolean {
    const sizeGroup = this.orderForm.get(`sizes.${sizeKey}`) as FormGroup;
    if (!sizeGroup) return false;

    const men = sizeGroup.get('men')?.value;
    const women = sizeGroup.get('women')?.value;
    const uni = sizeGroup.get('uni')?.value;

    return (men && Number(men) > 0) || (women && Number(women) > 0) || (uni && Number(uni) > 0);
  }

  // Load all sales persons from backend
  loadSalesPersons(): void {
    this.salesPersonService.getAllSalesPersons()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (salesPersons: SalesPerson[]) => {
          this.salesPersons = salesPersons;
        },
        error: (err: any) => {
          console.error('Error loading sales persons:', err);
        }
      });
  }

  // Filter sales persons based on user input (for autocomplete)
  filterSalesPersons(event: any): void {
    const query = event.query?.toLowerCase() || '';

    if (!query) {
      // Show all sales persons if query is empty
      this.filteredSalesPersons = this.salesPersons.map(sp => sp.name);
    } else {
      // Filter sales persons by name
      this.filteredSalesPersons = this.salesPersons
        .filter(sp => sp.name.toLowerCase().includes(query))
        .map(sp => sp.name);

      // If the typed value doesn't match any existing sales person, add it as an option
      const exactMatch = this.filteredSalesPersons.some(
        name => name.toLowerCase() === query
      );

      if (!exactMatch && query.length > 0) {
        // Add the typed value as a new option at the beginning
        this.filteredSalesPersons.unshift(query);
      }
    }
  }

  // Check if a field is invalid and has been touched
  isFieldInvalid(fieldName: string): boolean {
    const field = this.orderForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  // Get error message for a field
  getFieldError(fieldName: string): string | null {
    const field = this.orderForm.get(fieldName);
    if (!field || !field.errors) return null;

    if (field.errors['required']) {
      return 'orderBlank.validation.required';
    }
    if (field.errors['minlength']) {
      return 'orderBlank.validation.minLength';
    }
    return null;
  }

  // Mark all fields as touched to show validation errors
  markAllFieldsAsTouched(): void {
    Object.keys(this.orderForm.controls).forEach(key => {
      const control = this.orderForm.get(key);
      control?.markAsTouched();

      // If it's a form group (like sizes), mark its nested controls as well
      if (control instanceof FormGroup) {
        Object.keys(control.controls).forEach(nestedKey => {
          const nestedControl = control.get(nestedKey);
          nestedControl?.markAsTouched();

          // Handle deeper nesting (like sizes.xs.men)
          if (nestedControl instanceof FormGroup) {
            Object.keys(nestedControl.controls).forEach(deepKey => {
              nestedControl.get(deepKey)?.markAsTouched();
            });
          }
        });
      }
    });
  }

  // Send order to Telegram bot
  sendOrder(): void {
    // Check if user has permission
    if (!this.canSetOrder()) {
      this.error = 'orderBlank.permissionDenied';
      return;
    }

    // Mark all fields as touched to show validation errors
    this.markAllFieldsAsTouched();

    if (this.orderForm.invalid) {
      // Don't set error - let the field validation messages show instead
      return;
    }

    this.sending = true;
    this.error = null;
    this.successMessage = null;

    const orderData = {
      ...this.orderForm.value,
      grandTotal: this.calculateGrandTotal()
    };

    const apiUrl = environment.apiUrl || 'http://localhost:3000';

    this.http.post(`${apiUrl}/api/orders/send-telegram`, orderData)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: any) => {
          this.sending = false;
          this.successMessage = 'Order sent to Telegram successfully!';
          console.log('Order sent successfully:', response);

          // Clear success message after 5 seconds
          setTimeout(() => {
            this.successMessage = null;
          }, 5000);
        },
        error: (err: any) => {
          this.sending = false;
          this.error = 'Failed to send order to Telegram. Please try again.';
          console.error('Error sending order:', err);
        }
      });
  }
}
