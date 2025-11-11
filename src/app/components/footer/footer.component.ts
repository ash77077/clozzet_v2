import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent {
  currentYear = new Date().getFullYear();
  shouldHideFooter = false;

  constructor(private router: Router, private authService: AuthService) {
    // Hide footer when user is logged in
    this.authService.currentUser$.subscribe(user => {
      this.shouldHideFooter = !!user; // Hide footer if user is logged in
    });
  }

  companyInfo = {
    name: 'CLOZZET',
    tagline: 'Premium Branded Textiles',
    description: 'footer.description',
    email: 'clozzet.corp@gmail.com',
    phone: '+374 (44) 01 07 44',
    address: 'Sevan Street 86/3, Yerevan'
  };

  quickLinks = [
    { translationKey: 'footer.quickLinks.aboutUs', href: '#about' },
    { translationKey: 'footer.quickLinks.products', href: '#products' },
    { translationKey: 'footer.quickLinks.services', href: '#services' },
    { translationKey: 'footer.quickLinks.getQuote', href: '#quote' },
    { translationKey: 'footer.quickLinks.contact', href: '#contact' }
  ];

  productCategories = [
    { translationKey: 'footer.products.tshirts', href: '#tshirts' },
    { translationKey: 'footer.products.polos', href: '#polos' },
    { translationKey: 'footer.products.hoodies', href: '#hoodies' },
    { translationKey: 'footer.products.caps', href: '#caps' },
    { translationKey: 'footer.products.jackets', href: '#jackets' },
    { translationKey: 'footer.products.promotional', href: '#promotional' }
  ];

  socialLinks = [
    { name: 'LinkedIn', href: '#', icon: 'linkedin' },
    { name: 'Facebook', href: '#', icon: 'facebook' },
    { name: 'Twitter', href: '#', icon: 'twitter' },
    { name: 'Instagram', href: '#', icon: 'instagram' }
  ];

  getSocialIcon(iconName: string): string {
    const icons = {
      linkedin: 'M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z',
      facebook: 'M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z',
      twitter: 'M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z',
      instagram: 'M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37zm1.5-4.87h.01M6.5 6.5h11v11h-11z'
    };
    return icons[iconName as keyof typeof icons] || icons.linkedin;
  }
}
