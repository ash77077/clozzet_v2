import { Component, HostListener, OnInit, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { ProductsService, Product } from '../../services/products.service';
import { TranslationService, LOCALE_PREFIX, SupportedLang } from '../../services/translation.service';
import { TranslateModule } from '@ngx-translate/core';
import { LocaleRoutePipe } from '../../shared/pipes/locale-route.pipe';
import { Observable } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {NgxGoogleAnalyticsModule} from "ngx-google-analytics";

interface NavItem {
  labelKey: string;
  route: string;
  icon?: string;
  children?: NavItem[];
  special?: boolean;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule, NgxGoogleAnalyticsModule, LocaleRoutePipe],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit {
  isScrolled = false;
  isMobileMenuOpen = false;
  activeDropdown: string | null = null;
  currentUser$: Observable<User | null>;
  showUserMenu = false;
  showLanguageMenu = false;
  currentLanguage: string = 'en';
  private destroyRef = inject(DestroyRef);

  languages = [
    { code: 'en', name: 'English', flag: 'EN' },
    { code: 'am', name: 'Հայերեն', flag: 'AM' }
  ];

  constructor(
    private router: Router,
    private authService: AuthService,
    private productsService: ProductsService,
    private translationService: TranslationService
  ) {
    this.currentUser$ = this.authService.currentUser$;
    this.currentLanguage = this.translationService.getCurrentLanguage();
  }

  productsLoading = false;

  navItems: NavItem[] = [
    { labelKey: 'navbar.home', route: '/' },
    { labelKey: 'navbar.about', route: '/about' },
    // {
    //   labelKey: 'navbar.products',
    //   route: '/products',
    //   children: []
    // },
    // { labelKey: 'navbar.portfolio', route: '/portfolio' },
    { labelKey: 'navbar.contact', route: '/contact' }
  ];

  ngOnInit(): void {
    this.loadProductsForNavbar();
    this.translationService.langChange$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(lang => { this.currentLanguage = lang; });
  }

  loadProductsForNavbar(): void {
    this.productsLoading = false;
    this.productsService.getAllProducts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (products: Product[]) => {
          this.productsLoading = false;
          const activeProducts = products.filter(p => p.isActive);
          const productNavItems: NavItem[] = activeProducts.map(product => ({
            labelKey: product.name,
            route: `/products/${product.id}`
          }));
          const productsNav = this.navItems.find(item => item.labelKey === 'navbar.products');
          if (productsNav) {
            productsNav.children = productNavItems.length ? productNavItems : undefined;
          }
        },
        error: () => {
          this.productsLoading = false;
          console.warn('[Navbar] Products API unavailable — showing static link.');
          const productsNav = this.navItems.find(item => item.labelKey === 'navbar.products');
          if (productsNav) productsNav.children = undefined;
        }
      });
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled = window.pageYOffset > 100;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;

    // Close nav dropdowns if clicking outside
    if (!target.closest('.nav-dropdown') && !target.closest('.dropdown-trigger')) {
      this.activeDropdown = null;
    }

    // Close user menu if clicking outside
    if (!target.closest('.user-dropdown-container') && !target.closest('.user-icon-btn')) {
      this.showUserMenu = false;
    }

    // Close language menu if clicking outside
    if (!target.closest('.language-dropdown-container') && !target.closest('.language-btn')) {
      this.showLanguageMenu = false;
    }
  }

  toggleUserMenu(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.showUserMenu = !this.showUserMenu;
    // Close language menu when opening user menu
    if (this.showUserMenu) {
      this.showLanguageMenu = false;
    }
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    if (this.isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      this.activeDropdown = null;
    }
  }

  toggleDropdown(itemLabel: string, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.activeDropdown = this.activeDropdown === itemLabel ? null : itemLabel;
  }

  closeMobileMenu() {
    this.isMobileMenuOpen = false;
    document.body.style.overflow = '';
    this.activeDropdown = null;
  }

  scrollToQuote() {
    const element = document.getElementById('quote-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    this.closeMobileMenu();
  }

  openLogin() {
    this.closeMobileMenu();
    this.router.navigate(['/login']);
  }

  openDashboard() {
    this.closeMobileMenu();
    this.showUserMenu = false;
    this.router.navigate(['/dashboard']);
  }

  openUserManagement() {
    this.closeMobileMenu();
    this.showUserMenu = false;
    this.router.navigate(['/user-management']);
  }

  logout() {
    this.authService.logout();
    this.closeMobileMenu();
    this.showUserMenu = false;
    this.router.navigate(['/']);
  }

  isAdminOrManager(): boolean {
    const user = this.authService.getCurrentUser();
    return user?.role === 'admin' || user?.role === 'manager';
  }

  isAdmin(): boolean {
    const role = this.authService.getCurrentUser()?.role;
    return role === 'admin' || role === 'manager';
  }

  openWeddingGuests() {
    this.closeMobileMenu();
    this.showUserMenu = false;
    this.router.navigate(['/wedding-guests']);
  }

  openEmployees() {
    this.closeMobileMenu();
    this.showUserMenu = false;
    this.router.navigate(['/employees']);
  }

  openMeetings() {
    this.closeMobileMenu();
    this.showUserMenu = false;
    this.router.navigate(['/meetings']);
  }

  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  toggleLanguageMenu(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.showLanguageMenu = !this.showLanguageMenu;
    // Close user menu when opening language menu
    if (this.showLanguageMenu) {
      this.showUserMenu = false;
    }
  }

  switchLanguage(languageCode: string) {
    this.translationService.switchLanguage(languageCode as SupportedLang);
    this.currentLanguage = languageCode;
    this.showLanguageMenu = false;
    this.closeMobileMenu();

    // Navigate to the locale-prefixed equivalent of the current page
    const currentUrl = this.router.url.split('?')[0];
    const isHy = currentUrl.startsWith('/hy');
    const pagePath = isHy ? (currentUrl.slice(3) || '/') : currentUrl;
    const prefix = LOCALE_PREFIX[languageCode as SupportedLang];
    const target = prefix ? `${prefix}${pagePath === '/' ? '' : pagePath}` || prefix : pagePath;
    this.router.navigateByUrl(target || '/');
  }

  getCurrentLanguageData() {
    return this.languages.find(lang => lang.code === this.currentLanguage) || this.languages[0];
  }
}
