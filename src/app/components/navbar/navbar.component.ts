import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { Observable } from 'rxjs';

interface NavItem {
  label: string;
  route: string;
  icon?: string;
  children?: NavItem[];
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {
  isScrolled = false;
  isMobileMenuOpen = false;
  activeDropdown: string | null = null;
  currentUser$: Observable<User | null>;
  shouldHideNavbar = false;

  constructor(private router: Router, private authService: AuthService) {
    this.currentUser$ = this.authService.currentUser$;
    
    // Hide navbar when user is logged in
    this.authService.currentUser$.subscribe(user => {
      this.shouldHideNavbar = !!user; // Hide navbar if user is logged in
    });
  }

  navItems: NavItem[] = [
    { label: 'Home', route: '/' },
    { label: 'About', route: '/about' },
    { 
      label: 'Products', 
      route: '/products',
      children: [
        { label: 'Custom T-Shirts', route: '/products/tshirts' },
        { label: 'Polo Shirts', route: '/products/polos' },
        { label: 'Hoodies', route: '/products/hoodies' },
        { label: 'Custom Caps', route: '/products/caps' },
        { label: 'Jackets', route: '/products/jackets' },
        { label: 'Promotional Items', route: '/products/promotional' }
      ]
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
    this.router.navigate(['/dashboard']);
  }

  logout() {
    this.authService.logout();
    this.closeMobileMenu();
    this.router.navigate(['/']);
  }

  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }
}
