import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService, User } from '../../../services/auth.service';
import { TranslationService, SupportedLang } from '../../../services/translation.service';
import { UserRole } from '../../../models/dashboard.models';
import { NotificationBellComponent } from '../notification-bell/notification-bell.component';
import { AiService } from '../../../services/ai.service';

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
    FormsModule,
    ButtonModule,
    TooltipModule,
    ToggleSwitchModule,
    TranslateModule,
    NotificationBellComponent
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
  showOtherSection = false;
  showDrawer = false;

  UserRole = UserRole;

  get aiEnabled$() { return this.aiService.aiEnabled$; }
  aiEnabledValue = false;

  // Language properties
  currentLanguage: string = 'en';
  languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'am', name: 'Հայերեն', flag: '🇦🇲' }
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
    private translate: TranslateService,
    private translationService: TranslationService,
    private aiService: AiService
  ) {
    this.currentLanguage = this.translationService.getCurrentLanguage();
  }

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadOrderStats();
    this.aiService.aiEnabled$.pipe(takeUntil(this.destroy$)).subscribe(v => {
      this.aiEnabledValue = v;
    });
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
  }

  refreshData(): void {
    // TODO: Implement data refresh functionality
    this.loadOrderStats();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-dropdown-container')) {
      this.showUserMenu = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeDrawer();
    this.showUserMenu = false;
  }

  toggleUserMenu(event: Event): void {
    event.stopPropagation();
    this.showUserMenu = !this.showUserMenu;
  }

  openDrawer(event: Event): void {
    event.stopPropagation();
    this.showDrawer = true;
    document.body.style.overflow = 'hidden';
  }

  closeDrawer(): void {
    this.showDrawer = false;
    document.body.style.overflow = '';
  }

  toggleOtherSection(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.showOtherSection = !this.showOtherSection;
  }

  logout(): void {
    this.authService.logout();
    this.showUserMenu = false;
    this.router.navigate(['/']);
  }

  switchLanguage(langCode: string): void {
    this.translationService.switchLanguage(langCode as SupportedLang);
    this.currentLanguage = langCode;
  }

  onAiToggle(enabled: boolean): void {
    this.aiService.toggleAI(enabled);
  }

}
