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
import { AuthService, User } from '../../services/auth.service';
import { DashboardService } from '../../services/dashboard.service';
import { UserRole } from '../../models/dashboard.models';
import {Tooltip} from "primeng/tooltip";

@Component({
  selector: 'app-users-management',
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
  providers: [],
  templateUrl: './users-management.component.html',
  styleUrls: ['./users-management.component.scss']
})
export class UsersManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Data properties
  allUsers: User[] = [];
  filteredUsers: User[] = [];
  currentUser: User | null = null;
  selectedUser: User | null = null;

  // UI state
  isLoading = true;
  error = '';
  showUserDetails = false;

  // Search and filter properties
  searchTerm = '';
  selectedRole = '';
  selectedStatus = '';
  sortBy = 'name';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;

  // Constants
  UserRole = UserRole;
  availableRoles = [
    { value: '', label: 'All Roles' },
    { value: UserRole.ADMIN, label: 'Admin' },
    { value: UserRole.MANAGER, label: 'Manager' },
    { value: UserRole.USER, label: 'User' },
    { value: UserRole.CUSTOMER, label: 'Customer' }
  ];

  constructor(
    private authService: AuthService,
    private dashboardService: DashboardService,
  ) {}

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadUsers();
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

  protected loadUsers(): void {
    this.isLoading = true;
    this.dashboardService.getAllUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (users) => {
          this.allUsers = users;
          this.applyFilters();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading users:', error);
          this.error = 'Failed to load users';
          this.isLoading = false;
        }
      });
  }

  // Search and filter methods
  onSearchChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  onRoleChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  onStatusChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  applyFilters(): void {
    let filtered = [...this.allUsers];

    // Apply search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(user => 
        user.firstName.toLowerCase().includes(term) ||
        user.lastName.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        (user.company?.name || '').toLowerCase().includes(term)
      );
    }

    // Apply role filter
    if (this.selectedRole) {
      filtered = filtered.filter(user => user.role === this.selectedRole);
    }

    // Apply status filter
    if (this.selectedStatus) {
      const isActive = this.selectedStatus === 'active';
      filtered = filtered.filter(user => user.isActive === isActive);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison ;
      
      switch (this.sortBy) {
        case 'name':
          comparison = `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
          break;
        case 'email':
          comparison = a.email.localeCompare(b.email);
          break;
        case 'role':
          comparison = a.role.localeCompare(b.role);
          break;
        case 'company':
          const aCompany = a.company?.name || '';
          const bCompany = b.company?.name || '';
          comparison = aCompany.localeCompare(bCompany);
          break;
        case 'lastLogin':
          const aDate = a.lastLogin ? new Date(a.lastLogin).getTime() : 0;
          const bDate = b.lastLogin ? new Date(b.lastLogin).getTime() : 0;
          comparison = aDate - bDate;
          break;
        default:
          comparison = 0;
      }

      return this.sortDirection === 'asc' ? comparison : -comparison;
    });

    this.filteredUsers = filtered;
    this.calculatePagination();
  }

  // Sorting methods
  sort(column: string): void {
    if (this.sortBy === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = column;
      this.sortDirection = 'asc';
    }
    this.applyFilters();
  }

  getSortIcon(column: string): string {
    if (this.sortBy !== column) return '↕️';
    return this.sortDirection === 'asc' ? '↑' : '↓';
  }

  // Pagination methods
  calculatePagination(): void {
    this.totalPages = Math.ceil(this.filteredUsers.length / this.itemsPerPage);
  }

  getPaginatedUsers(): User[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredUsers.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    const halfVisible = Math.floor(maxVisiblePages / 2);

    let startPage = Math.max(1, this.currentPage - halfVisible);
    let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }

  // User action methods
  viewUserDetails(user: User): void {
    this.selectedUser = user;
    this.showUserDetails = true;
  }

  closeUserDetails(): void {
    this.showUserDetails = false;
    this.selectedUser = null;
  }

  editUser(user: User): void {
    // TODO: Implement edit user functionality
    console.log('Edit user:', user);
  }

  toggleUserStatus(user: User): void {
    // TODO: Implement toggle user status functionality
    console.log('Toggle status for user:', user);
  }

  deleteUser(user: User): void {
    // TODO: Implement delete user functionality
    console.log('Delete user:', user);
  }

  // Utility methods
  formatDate(date: Date | string): string {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getRoleDisplayName(role: string): string {
    const roleMap: { [key: string]: string } = {
      [UserRole.ADMIN]: 'Admin',
      [UserRole.MANAGER]: 'Manager',
      [UserRole.USER]: 'User',
      [UserRole.CUSTOMER]: 'Customer'
    };
    return roleMap[role] || role;
  }

  isAdminOrManager(): boolean {
    return this.currentUser?.role === UserRole.ADMIN || this.currentUser?.role === UserRole.MANAGER;
  }

  getRoleSeverity(role: string): "success" | "info" | "warning" | "danger" | "secondary" | "contrast" | null | undefined {
    switch (role) {
      case UserRole.ADMIN:
        return 'danger';
      case UserRole.MANAGER:
        return 'warning';
      case UserRole.USER:
        return 'info';
      case UserRole.CUSTOMER:
        return 'success';
      default:
        return 'secondary';
    }
  }
}
