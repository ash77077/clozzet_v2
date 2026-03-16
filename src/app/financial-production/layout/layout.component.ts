import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
})
export class LayoutComponent {
  navItems = [
    { label: 'Dashboard', route: '/financial-production/dashboard', icon: '📊' },
    { label: 'Monthly Expenses', route: '/financial-production/monthly-expense', icon: '💰' },
    { label: 'Fabric Inventory', route: '/financial-production/fabric-inventory', icon: '🧵' },
    { label: 'Accessories', route: '/financial-production/accessories', icon: '🔘' },
    { label: 'Product Recipe', route: '/financial-production/product-recipe', icon: '📝' },
    { label: 'Production Run', route: '/financial-production/production-run', icon: '🏭' }
  ];

  constructor(public router: Router) {}

  isActiveRoute(route: string): boolean {
    return this.router.url === route;
  }
}
