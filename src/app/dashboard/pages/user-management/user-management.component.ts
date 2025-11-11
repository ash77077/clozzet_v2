import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UsersService, User, CreateUserDto, UpdateUserDto } from '../../../services/users.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.scss']
})
export class UserManagementComponent implements OnInit {
  users: User[] = [];
  filteredUsers: User[] = [];
  selectedUser: User | null = null;
  showModal: boolean = false;
  isEditing: boolean = false;
  userForm: FormGroup;
  private destroyRef = inject(DestroyRef);
  loading: boolean = false;
  error: string | null = null;
  searchTerm: string = '';
  roleFilter: string = 'all';

  roles = [
    { value: 'admin', label: 'Admin' },
    { value: 'manager', label: 'Manager' },
    { value: 'user', label: 'User' },
    { value: 'customer', label: 'Customer' },
    { value: 'business_user', label: 'Business User' }
  ];

  constructor(
    private usersService: UsersService,
    private fb: FormBuilder
  ) {
    this.userForm = this.createUserForm();
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  createUserForm(): FormGroup {
    return this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      phone: ['', Validators.required],
      jobTitle: [''],
      department: [''],
      employeeId: [''],
      role: ['business_user', Validators.required],
      isActive: [true]
    });
  }

  loadUsers(): void {
    this.loading = true;
    this.error = null;
    this.usersService.getAllUsers()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (users) => {
          this.users = users;
          this.filterUsers();
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Failed to load users';
          this.loading = false;
          console.error(err);
        }
      });
  }

  filterUsers(): void {
    this.filteredUsers = this.users.filter(user => {
      const matchesSearch = !this.searchTerm ||
        user.firstName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        user.lastName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesRole = this.roleFilter === 'all' || user.role === this.roleFilter;

      return matchesSearch && matchesRole;
    });
  }

  onSearchChange(): void {
    this.filterUsers();
  }

  onRoleFilterChange(): void {
    this.filterUsers();
  }

  openCreateModal(): void {
    this.isEditing = false;
    this.selectedUser = null;
    this.error = null;
    this.userForm = this.createUserForm();
    this.showModal = true;
  }

  openEditModal(user: User): void {
    this.isEditing = true;
    this.selectedUser = user;
    this.error = null;

    // Remove password validator for editing
    this.userForm = this.fb.group({
      email: [user.email, [Validators.required, Validators.email]],
      password: ['', [Validators.minLength(6)]], // Optional when editing
      firstName: [user.firstName, Validators.required],
      lastName: [user.lastName, Validators.required],
      phone: [user.phone, Validators.required],
      jobTitle: [user.jobTitle || ''],
      department: [user.department || ''],
      employeeId: [user.employeeId || ''],
      role: [user.role, Validators.required],
      isActive: [user.isActive]
    });

    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedUser = null;
    this.userForm.reset();
  }

  saveUser(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      this.error = 'Please fill in all required fields correctly.';
      return;
    }

    this.loading = true;
    this.error = null;
    const userData = this.userForm.value;

    // Remove empty password field when editing
    if (this.isEditing && !userData.password) {
      delete userData.password;
    }

    if (this.isEditing && this.selectedUser) {
      this.usersService.updateUser(this.selectedUser._id!, userData as UpdateUserDto)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.loading = false;
            this.closeModal();
            this.loadUsers();
          },
          error: (err) => {
            this.error = 'Failed to update user: ' + (err.error?.message || err.message);
            this.loading = false;
            console.error('Update error:', err);
          }
        });
    } else {
      this.usersService.createUser(userData as CreateUserDto)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.loading = false;
            this.closeModal();
            this.loadUsers();
          },
          error: (err) => {
            this.error = 'Failed to create user: ' + (err.error?.message || err.message);
            this.loading = false;
            console.error('Create error:', err);
          }
        });
    }
  }

  toggleUserActive(user: User): void {
    const action = user.isActive ? this.usersService.deactivateUser(user._id!) : this.usersService.activateUser(user._id!);

    action.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loadUsers();
        },
        error: (err) => {
          this.error = 'Failed to toggle user status';
          console.error(err);
        }
      });
  }

  deleteUser(user: User): void {
    if (!confirm(`Are you sure you want to delete ${user.firstName} ${user.lastName}?`)) {
      return;
    }

    this.usersService.deleteUser(user._id!)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loadUsers();
        },
        error: (err) => {
          this.error = 'Failed to delete user';
          console.error(err);
        }
      });
  }

  getRoleBadgeClass(role: string): string {
    const roleClasses: { [key: string]: string } = {
      'admin': 'badge-admin',
      'manager': 'badge-manager',
      'user': 'badge-user',
      'customer': 'badge-customer',
      'business_user': 'badge-business'
    };
    return roleClasses[role] || 'badge-default';
  }

  getRoleLabel(role: string): string {
    const roleLabels: { [key: string]: string } = {
      'admin': 'Admin',
      'manager': 'Manager',
      'user': 'User',
      'customer': 'Customer',
      'business_user': 'Business User'
    };
    return roleLabels[role] || role;
  }
}
