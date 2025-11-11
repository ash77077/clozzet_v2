import { Component, HostListener, OnInit, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { ProductsService, Product } from '../../services/products.service';
import { TranslationService } from '../../services/translation.service';
import { TranslateModule } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

interface NavItem {
  label: string;
  route: string;
  icon?: string;
  children?: NavItem[];
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
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

  navItems: NavItem[] = [
    { label: 'Home', route: '/' },
    { label: 'About', route: '/about' },
    {
      label: 'Products',
      route: '/products',
      children: [] // Will be populated dynamically from the database
    },
    {
      label: 'Services',
      route: '/services',
      children: [
        { label: 'Bulk Orders', route: '/services/bulk-orders' },
        { label: 'Custom Design', route: '/services/design' },
        { label: 'Embroidery', route: '/services/embroidery' },
        { label: 'Screen Printing', route: '/services/printing' }
      ]
    },
    { label: 'Portfolio', route: '/portfolio' },
    { label: 'Contact', route: '/contact' }
  ];

  ngOnInit(): void {
    this.loadProductsForNavbar();
  }

  loadProductsForNavbar(): void {
    this.productsService.getAllProducts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (products: Product[]) => {
          // Filter only active products and map them to nav items
          const activeProducts = products.filter(p => p.isActive);
          const productNavItems: NavItem[] = activeProducts.map(product => ({
            label: product.name,
            route: `/products/${product.id}`
          }));

          // Update the Products dropdown with dynamic items
          const productsNav = this.navItems.find(item => item.label === 'Products');
          if (productsNav) {
            productsNav.children = productNavItems;
          }
        },
        error: (err) => {
          console.error('Failed to load products for navbar:', err);
          // Keep the dropdown empty if loading fails
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
    if (!target.closest('.nav-dropdown')) {
      this.activeDropdown = null;
    }
    if (!target.closest('.user-dropdown-container')) {
      this.showUserMenu = false;
    }
    if (!target.closest('.language-dropdown-container')) {
      this.showLanguageMenu = false;
    }
  }

  toggleUserMenu(event: Event) {
    event.stopPropagation();
    this.showUserMenu = !this.showUserMenu;
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

  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  toggleLanguageMenu(event: Event) {
    event.stopPropagation();
    this.showLanguageMenu = !this.showLanguageMenu;
  }

  switchLanguage(languageCode: string) {
    this.translationService.switchLanguage(languageCode);
    this.currentLanguage = languageCode;
    this.showLanguageMenu = false;
    this.closeMobileMenu();
  }

  getCurrentLanguageData() {
    return this.languages.find(lang => lang.code === this.currentLanguage) || this.languages[0];
  }
}
