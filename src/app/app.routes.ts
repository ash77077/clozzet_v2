import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [() => import('./guards/auth.guard').then(g => g.AuthGuard)]
  },
  {
    path: 'about',
    loadComponent: () => import('./pages/about/about.component').then(m => m.AboutComponent)
  },
  {
    path: 'products',
    loadComponent: () => import('./pages/products/products.component').then(m => m.ProductsPageComponent)
  },
  {
    path: 'services',
    loadComponent: () => import('./pages/services/services.component').then(m => m.ServicesPageComponent)
  },
  {
    path: 'portfolio',
    loadComponent: () => import('./pages/portfolio/portfolio.component').then(m => m.PortfolioComponent)
  },
  {
    path: 'contact',
    loadComponent: () => import('./pages/contact/contact.component').then(m => m.ContactComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'users',
    loadComponent: () => import('./pages/users-management/users-management.component').then(m => m.UsersManagementComponent),
    canActivate: [() => import('./guards/auth.guard').then(g => g.AuthGuard)]
  },
  {
    path: 'orders',
    loadComponent: () => import('./pages/orders-management/orders-management.component').then(m => m.OrdersManagementComponent),
    canActivate: [() => import('./guards/auth.guard').then(g => g.AuthGuard)]
  },
  {
    path: 'companies',
    loadComponent: () => import('./pages/companies-management/companies-management.component').then(m => m.CompaniesManagementComponent),
    canActivate: [() => import('./guards/auth.guard').then(g => g.AuthGuard)]
  },
  {
    path: 'product-order',
    loadComponent: () => import('./pages/product-order/product-order.component').then(m => m.ProductOrderComponent),
    canActivate: [() => import('./guards/auth.guard').then(g => g.AuthGuard)]
  },
  {
    path: 'manufacturing',
    loadComponent: () => import('./pages/manufacturing/manufacturing.component').then(m => m.ManufacturingComponent),
    canActivate: [() => import('./guards/auth.guard').then(g => g.AuthGuard)]
  },
  // Product sub-routes
  {
    path: 'products/tshirts',
    loadComponent: () => import('./pages/products/products.component').then(m => m.ProductsPageComponent)
  },
  {
    path: 'products/polos',
    loadComponent: () => import('./pages/products/products.component').then(m => m.ProductsPageComponent)
  },
  {
    path: 'products/hoodies',
    loadComponent: () => import('./pages/products/products.component').then(m => m.ProductsPageComponent)
  },
  {
    path: 'products/caps',
    loadComponent: () => import('./pages/products/products.component').then(m => m.ProductsPageComponent)
  },
  {
    path: 'products/jackets',
    loadComponent: () => import('./pages/products/products.component').then(m => m.ProductsPageComponent)
  },
  {
    path: 'products/promotional',
    loadComponent: () => import('./pages/products/products.component').then(m => m.ProductsPageComponent)
  },
  // Service sub-routes
  {
    path: 'services/bulk-orders',
    loadComponent: () => import('./pages/services/services.component').then(m => m.ServicesPageComponent)
  },
  {
    path: 'services/design',
    loadComponent: () => import('./pages/services/services.component').then(m => m.ServicesPageComponent)
  },
  {
    path: 'services/embroidery',
    loadComponent: () => import('./pages/services/services.component').then(m => m.ServicesPageComponent)
  },
  {
    path: 'services/printing',
    loadComponent: () => import('./pages/services/services.component').then(m => m.ServicesPageComponent)
  },
  // Wildcard route - must be last
  {
    path: '**',
    redirectTo: ''
  }
];
