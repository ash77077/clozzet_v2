import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  currentStep = 1;
  totalSteps = 3;
  isLoading = false;
  showPassword = false;
  showConfirmPassword = false;
  errorMessage = '';

  personalForm!: FormGroup;
  positionForm!: FormGroup;
  companyForm!: FormGroup;

  industries = [
    'Retail', 'E-commerce', 'Manufacturing', 'Hospitality', 'Healthcare', 
    'Education', 'Non-profit', 'Government', 'Other'
  ];

  companySizes = [
    '1-10', '11-50', '51-200', 
    '201-500', '501-1000', '1000+'
  ];

  departments = [
    'Administration', 'Marketing', 'Sales', 'HR', 'IT', 'Finance',
    'Operations', 'Customer Service', 'Procurement', 'Management', 'Other'
  ];

  constructor(private fb: FormBuilder, private router: Router, private authService: AuthService) {
    this.initializeForms();
  }

  initializeForms() {
    // Personal Information Form
    this.personalForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
      phone: ['', [Validators.required, Validators.pattern(/^\+?[1-9]\d{1,14}$/)]],
    }, { validators: this.passwordMatchValidator });

    // Position Information Form
    this.positionForm = this.fb.group({
      jobTitle: ['', [Validators.required, Validators.minLength(2)]],
      department: ['', Validators.required],
      employeeId: [''],
    });

    // Company Information Form
    this.companyForm = this.fb.group({
      companyName: ['', [Validators.required, Validators.minLength(2)]],
      companyEmail: ['', [Validators.required, Validators.email]],
      companyPhone: ['', [Validators.required, Validators.pattern(/^\+?[1-9]\d{1,14}$/)]],
      companyAddress: ['', [Validators.required, Validators.minLength(5)]],
      industry: ['', Validators.required],
      companySize: ['', Validators.required],
      website: [''],
      agreeToTerms: [false, Validators.requiredTrue],
      marketingConsent: [false]
    });
  }

  passwordMatchValidator(group: FormGroup) {
    const password = group.get('password');
    const confirmPassword = group.get('confirmPassword');
    
    if (!password || !confirmPassword) {
      return null;
    }
    
    return password.value === confirmPassword.value ? null : { passwordMismatch: true };
  }

  getCurrentForm(): FormGroup {
    switch (this.currentStep) {
      case 1: return this.personalForm;
      case 2: return this.positionForm;
      case 3: return this.companyForm;
      default: return this.personalForm;
    }
  }

  nextStep() {
    const currentForm = this.getCurrentForm();
    
    if (currentForm.valid) {
      if (this.currentStep < this.totalSteps) {
        this.currentStep++;
      }
    } else {
      this.markFormGroupTouched(currentForm);
    }
  }

  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
      
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  getFieldError(formGroup: FormGroup, fieldName: string): string {
    const field = formGroup.get(fieldName);
    
    if (field?.errors && field.touched) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['email']) return 'Please enter a valid email address';
      if (field.errors['minlength']) return `${fieldName} must be at least ${field.errors['minlength'].requiredLength} characters`;
      if (field.errors['pattern']) {
        if (fieldName.includes('phone') || fieldName.includes('Phone')) return 'Please enter a valid phone number';
        if (fieldName === 'companyZip') return 'Please enter a valid ZIP code';
      }
    }
    
    if (formGroup.errors?.['passwordMismatch'] && fieldName === 'confirmPassword' && field?.touched) {
      return 'Passwords do not match';
    }
    
    return '';
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onSubmit() {
    // Validate all forms before submission
    const formsValid = this.personalForm.valid && this.positionForm.valid && this.companyForm.valid;
    
    if (!formsValid) {
      this.markFormGroupTouched(this.personalForm);
      this.markFormGroupTouched(this.positionForm);
      this.markFormGroupTouched(this.companyForm);
      this.errorMessage = 'Please fill all required fields correctly.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    
    const registrationData = {
      email: this.personalForm.value.email,
      password: this.personalForm.value.password,
      firstName: this.personalForm.value.firstName,
      lastName: this.personalForm.value.lastName,
      phone: this.personalForm.value.phone,
      jobTitle: this.positionForm.value.jobTitle,
      department: this.positionForm.value.department,
      employeeId: this.positionForm.value.employeeId,
      company: {
        name: this.companyForm.value.companyName,
        email: this.companyForm.value.companyEmail,
        phone: this.companyForm.value.companyPhone,
        address: this.companyForm.value.companyAddress,
        industry: this.companyForm.value.industry,
        size: this.companyForm.value.companySize,
        website: this.companyForm.value.website || ''
      }
    };
    
    
    this.authService.register(registrationData).subscribe({
      next: (response) => {
        this.isLoading = false;
        console.log('Registration successful:', response);
        alert('Registration successful! Welcome to CLOZZET.');
        this.router.navigate(['/']);
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Registration failed:', error);
        this.errorMessage = error.error?.message || 'Registration failed. Please try again.';
      }
    });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  openTerms() {
    // Placeholder for terms & conditions modal/page
    alert('Terms & Conditions would be displayed here');
  }

  openPrivacyPolicy() {
    // Placeholder for privacy policy modal/page
    alert('Privacy Policy would be displayed here');
  }
}
