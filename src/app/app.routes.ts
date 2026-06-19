import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { ManagerGuard } from './guards/manager.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [ManagerGuard]
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
    path: 'reset-password',
    loadComponent: () => import('./pages/reset-password/reset-password.component').then(m => m.ResetPasswordComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'users',
    loadComponent: () => import('./dashboard/pages/user-management/user-management.component').then(m => m.UserManagementComponent),
    canActivate: [AdminGuard]
  },
  {
    path: 'orders',
    loadComponent: () => import('./pages/orders-management/orders-management.component').then(m => m.OrdersManagementComponent),
    canActivate: [ManagerGuard]
  },
  {
    path: 'revenue',
    loadComponent: () => import('./pages/revenue/revenue.component').then(m => m.RevenueComponent),
    canActivate: [AdminGuard]
  },
  {
    path: 'companies',
    loadComponent: () => import('./pages/companies-management/companies-management.component').then(m => m.CompaniesManagementComponent),
    canActivate: [AdminGuard]
  },
  {
    path: 'product-order',
    loadComponent: () => import('./pages/product-order/product-order.component').then(m => m.ProductOrderComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'manufacturing',
    loadComponent: () => import('./pages/manufacturing/manufacturing.component').then(m => m.ManufacturingComponent),
    canActivate: [AdminGuard]
  },
  {
    path: 'product-management',
    loadComponent: () => import('./dashboard/pages/product-management/product-management.component').then(m => m.ProductManagementComponent),
    canActivate: [AdminGuard]
  },
  {
    path: 'user-management',
    loadComponent: () => import('./dashboard/pages/user-management/user-management.component').then(m => m.UserManagementComponent),
    canActivate: [AdminGuard]
  },
  {
    path: 'retail-sales',
    loadComponent: () => import('./dashboard/pages/retail-sales/retail-sales.component').then(m => m.RetailSalesComponent),
    canActivate: [AdminGuard]
  },
  {
    path: 'sales-history',
    loadComponent: () => import('./dashboard/pages/sales-history/sales-history.component').then(m => m.SalesHistoryComponent),
    canActivate: [AdminGuard]
  },
  // CRM routes
  {
    path: 'crm-dashboard',
    loadComponent: () => import('./pages/crm-dashboard/crm-dashboard.component').then(m => m.CrmDashboardComponent),
    canActivate: [ManagerGuard]
  },
  {
    path: 'customer-profile/:id',
    loadComponent: () => import('./pages/customer-profile/customer-profile.component').then(m => m.CustomerProfileComponent),
    canActivate: [ManagerGuard]
  },
  // Order Blank routes
  {
    path: 'order-blank',
    loadComponent: () => import('./components/order-blank/order-blank.component').then(m => m.OrderBlankComponent)
  },
  {
    path: 'order-blank/:id',
    loadComponent: () => import('./components/order-blank/order-blank.component').then(m => m.OrderBlankComponent)
  },
  // Dynamic product route - handles any product ID
  {
    path: 'products/:id',
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
  {
    path: 'financial-production',
    loadChildren: () => import('./financial-production/financial-production-routing.module').then(m => m.FinancialProductionRoutingModule)
  },
  {
    path: 'cost-configurator',
    loadComponent: () => import('./pages/cost-configurator/cost-configurator.component').then(m => m.CostConfiguratorComponent),
    canActivate: [AdminGuard]
  },
  {
    path: 'expo-sales',
    loadComponent: () => import('./pages/expo-sales/expo-sales.component').then(m => m.ExpoSalesComponent),
    canActivate: [AdminGuard]
  },
  // My Orders — client dashboard
  {
    path: 'my-orders',
    loadComponent: () => import('./pages/my-orders/my-orders.component').then(m => m.MyOrdersComponent),
    canActivate: [AuthGuard]
  },
  // 3D Preview - Clothing Model Viewer (Testing Route)
  {
    path: '3d-preview',
    loadComponent: () => import('./components/clothing-viewer/clothing-viewer.component').then(m => m.ClothingViewerComponent)
  },
  // 3D Configurator - Advanced Three.js Configurator (Phase 1)
  {
    path: 'configurator',
    loadComponent: () => import('./components/configurator/configurator.component').then(m => m.ConfiguratorComponent)
  },
  // Wedding invitation - no chrome
  {
    path: 'invitation',
    loadComponent: () => import('./components/wedding/wedding.component').then(m => m.WeddingComponent)
  },
  // Wedding guests admin panel
  {
    path: 'wedding-guests',
    loadComponent: () => import('./pages/wedding-guests/wedding-guests.component').then(m => m.WeddingGuestsComponent),
    canActivate: [AdminGuard]
  },
  // Wildcard route - must be last
  {
    path: '**',
    redirectTo: ''
  }
];
