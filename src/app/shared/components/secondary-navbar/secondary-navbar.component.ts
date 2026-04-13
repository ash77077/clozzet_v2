import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService, User } from '../../../services/auth.service';
import { UserRole } from '../../../models/dashboard.models';

interface OrderStats {
  pending: number;
  inProgress: number;
  total: number;
}

interface UserOrderStats {
  total: number;
  pending: number;
}

@Component({
  selector: 'app-secondary-navbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ButtonModule,
    TooltipModule,
    TranslateModule
  ],
  templateUrl: './secondary-navbar.component.html',
  styleUrl: './secondary-navbar.component.scss'
})
export class SecondaryNavbarComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  currentUser: User | null = null;
  isAuthenticated = false;
  orderStats: OrderStats | null = null;
  userOrderStats: UserOrderStats | null = null;
  showUserMenu = false;

  UserRole = UserRole;

  // Section toggle (Sales vs Manufacturing)
  currentSection: 'sales' | 'manufacturing' = 'sales';

  // Language properties
  currentLanguage: string = 'en';
  languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'am', name: 'Հայերեն', flag: '🇦🇲' }
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
    private translate: TranslateService
  ) {
    // Initialize current language
    this.currentLanguage = this.translate.currentLang || 'en';

    // Initialize section from localStorage
    const savedSection = localStorage.getItem('selectedSection') as 'sales' | 'manufacturing';
    if (savedSection) {
      this.currentSection = savedSection;
    }
  }

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadOrderStats();
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
        this.isAuthenticated = !!user;
      });
  }

  private loadOrderStats(): void {
    // TODO: Implement order statistics loading
    // This would typically come from a service
    this.orderStats = {
      pending: 5,
      inProgress: 3,
      total: 15
    };

    this.userOrderStats = {
      total: 8,
      pending: 2
    };
  }

  isAdminOrManager(): boolean {
    return this.currentUser?.role === UserRole.ADMIN ||
           this.currentUser?.role === UserRole.MANAGER;
  }

  isAdmin(): boolean {
    return this.currentUser?.role === UserRole.ADMIN;
  }

  isManager(): boolean {
    return this.currentUser?.role === UserRole.MANAGER;
  }

  isCustomerOrUser(): boolean {
    return this.currentUser?.role === UserRole.CUSTOMER ||
           this.currentUser?.role === UserRole.USER ||
           this.currentUser?.role === UserRole.BUSINESS_USER;
  }

  isBusinessUser(): boolean {
    return this.currentUser?.role === UserRole.BUSINESS_USER;
  }

  exportData(): void {
    // TODO: Implement data export functionality
    console.log('Exporting data...');
  }

  refreshData(): void {
    // TODO: Implement data refresh functionality
    console.log('Refreshing data...');
    this.loadOrderStats();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-dropdown-container')) {
      this.showUserMenu = false;
    }
  }

  toggleUserMenu(event: Event): void {
    event.stopPropagation();
    this.showUserMenu = !this.showUserMenu;
  }

  logout(): void {
    this.authService.logout();
    this.showUserMenu = false;
    this.router.navigate(['/']);
  }

  switchLanguage(langCode: string): void {
    this.currentLanguage = langCode;
    this.translate.use(langCode);
    localStorage.setItem('selectedLanguage', langCode);
  }

  switchSection(section: 'sales' | 'manufacturing'): void {
    this.currentSection = section;
    localStorage.setItem('selectedSection', section);

    // Navigate to appropriate default page for the section
    if (section === 'sales') {
      this.router.navigate(['/dashboard']);
    } else if (section === 'manufacturing') {
      this.router.navigate(['/financial-production']);
    }
  }

  isSalesSection(): boolean {
    return this.currentSection === 'sales';
  }

  isManufacturingSection(): boolean {
    return this.currentSection === 'manufacturing';
  }
}
