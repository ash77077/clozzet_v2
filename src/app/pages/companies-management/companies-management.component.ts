import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AuthService, User } from '../../services/auth.service';
import { DashboardService } from '../../services/dashboard.service';
import { Company, UserRole } from '../../models/dashboard.models';
import {Tooltip} from "primeng/tooltip";

@Component({
  selector: 'app-companies-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    TagModule,
    DialogModule,
    ConfirmDialogModule,
    ToastModule,
    Tooltip
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './companies-management.component.html',
  styleUrl: './companies-management.component.scss'
})
export class CompaniesManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Data properties
  allCompanies: Company[] = [];
  filteredCompanies: Company[] = [];
  currentUser: User | null = null;
  selectedCompany: Company | null = null;

  // UI state
  isLoading = true;
  error = '';
  showCompanyDetails = false;

  // Search and filter properties
  searchTerm = '';
  selectedIndustry = '';
  selectedSize = '';
  sortBy = 'name';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;

  // Constants
  UserRole = UserRole;
  availableIndustries = [
    { value: '', label: 'All Industries' },
    { value: 'Technology', label: 'Technology' },
    { value: 'Healthcare', label: 'Healthcare' },
    { value: 'Finance', label: 'Finance' },
    { value: 'Manufacturing', label: 'Manufacturing' },
    { value: 'Retail', label: 'Retail' },
    { value: 'Education', label: 'Education' },
    { value: 'Other', label: 'Other' }
  ];

  availableSizes = [
    { value: '', label: 'All Sizes' },
    { value: 'Small', label: 'Small (1-50)' },
    { value: 'Medium', label: 'Medium (51-250)' },
    { value: 'Large', label: 'Large (251-1000)' },
    { value: 'Enterprise', label: 'Enterprise (1000+)' }
  ];

  constructor(
    private authService: AuthService,
    private dashboardService: DashboardService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadCompanies();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCurrentUser(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
      });
  }

  protected loadCompanies(): void {
    this.isLoading = true;
    this.dashboardService.getAllCompanies()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (companies) => {
          this.allCompanies = companies;
          this.applyFilters();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading companies:', error);
          this.error = 'Failed to load companies';
          this.isLoading = false;
        }
      });
  }

  // Search and filter methods
  onSearchChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  onIndustryChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  onSizeChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  applyFilters(): void {
    let filtered = [...this.allCompanies];

    // Apply search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(company => 
        company.name.toLowerCase().includes(term) ||
        company.email.toLowerCase().includes(term) ||
        company.industry.toLowerCase().includes(term)
      );
    }

    // Apply industry filter
    if (this.selectedIndustry) {
      filtered = filtered.filter(company => company.industry === this.selectedIndustry);
    }

    // Apply size filter
    if (this.selectedSize) {
      filtered = filtered.filter(company => company.size === this.selectedSize);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison;
      
      switch (this.sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'industry':
          comparison = a.industry.localeCompare(b.industry);
          break;
        case 'size':
          comparison = a.size.localeCompare(b.size);
          break;
        case 'employees':
          comparison = a.totalEmployees - b.totalEmployees;
          break;
        case 'orders':
          comparison = a.totalOrders - b.totalOrders;
          break;
        default:
          comparison = 0;
      }

      return this.sortDirection === 'asc' ? comparison : -comparison;
    });

    this.filteredCompanies = filtered;
    this.calculatePagination();
  }

  // Pagination methods
  calculatePagination(): void {
    this.totalPages = Math.ceil(this.filteredCompanies.length / this.itemsPerPage);
  }

  getPaginatedCompanies(): Company[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredCompanies.slice(startIndex, endIndex);
  }

  // Company action methods
  viewCompanyDetails(company: Company): void {
    this.selectedCompany = company;
    this.showCompanyDetails = true;
  }

  closeCompanyDetails(): void {
    this.showCompanyDetails = false;
    this.selectedCompany = null;
  }

  editCompany(company: Company): void {
    // TODO: Implement edit company functionality
    console.log('Edit company:', company);
    this.messageService.add({severity:'info', summary:'Edit Company', detail:`Edit functionality for ${company.name} will be implemented`});
  }

  toggleCompanyStatus(company: Company): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to ${company.isActive ? 'deactivate' : 'activate'} ${company.name}?`,
      header: 'Confirm Status Change',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        // TODO: Implement toggle company status functionality
        console.log('Toggle company status:', company);
        this.messageService.add({severity:'success', summary:'Status Updated', detail:`${company.name} has been ${company.isActive ? 'deactivated' : 'activated'}`});
      }
    });
  }

  // Utility methods
  formatDate(date: Date | string): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  getSizeSeverity(size: string): "success" | "info" | "warning" | "danger" | "secondary" | "contrast" | null | undefined {
    switch (size) {
      case 'Small':
        return 'info';
      case 'Medium':
        return 'success';
      case 'Large':
        return 'warning';
      case 'Enterprise':
        return 'danger';
      default:
        return 'secondary';
    }
  }

  isAdminOrManager(): boolean {
    return this.currentUser?.role === UserRole.ADMIN || this.currentUser?.role === UserRole.MANAGER;
  }
}
