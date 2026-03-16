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
    loadComponent: () => import('./dashboard/pages/user-management/user-management.component').then(m => m.UserManagementComponent),
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
  {
    path: 'product-management',
    loadComponent: () => import('./dashboard/pages/product-management/product-management.component').then(m => m.ProductManagementComponent),
    canActivate: [() => import('./guards/auth.guard').then(g => g.AuthGuard)]
  },
  {
    path: 'user-management',
    loadComponent: () => import('./dashboard/pages/user-management/user-management.component').then(m => m.UserManagementComponent),
    canActivate: [() => import('./guards/auth.guard').then(g => g.AuthGuard)]
  },
  {
    path: 'retail-sales',
    loadComponent: () => import('./dashboard/pages/retail-sales/retail-sales.component').then(m => m.RetailSalesComponent),
    canActivate: [() => import('./guards/auth.guard').then(g => g.AuthGuard)]
  },
  {
    path: 'sales-history',
    loadComponent: () => import('./dashboard/pages/sales-history/sales-history.component').then(m => m.SalesHistoryComponent),
    canActivate: [() => import('./guards/auth.guard').then(g => g.AuthGuard)]
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
  // My Orders — client dashboard
  {
    path: 'my-orders',
    loadComponent: () => import('./pages/my-orders/my-orders.component').then(m => m.MyOrdersComponent),
    canActivate: [() => import('./guards/auth.guard').then(g => g.AuthGuard)]
  },
  // B2B Order create
  {
    path: 'order-create',
    loadComponent: () => import('./pages/order-create/order-create.component').then(m => m.OrderCreateComponent),
    canActivate: [() => import('./guards/auth.guard').then(g => g.AuthGuard)]
  },
  // Special Collection public routes
  {
    path: 'special-collection',
    loadComponent: () => import('./pages/special-collection/special-collection.component').then(m => m.SpecialCollectionComponent)
  },
  {
    path: 'special-collection/:category',
    loadComponent: () => import('./pages/special-collection/special-collection.component').then(m => m.SpecialCollectionComponent)
  },
  // Special Collection admin route
  {
    path: 'special-collection-admin',
    loadComponent: () => import('./dashboard/pages/special-collection-admin/special-collection-admin.component').then(m => m.SpecialCollectionAdminComponent),
    canActivate: [() => import('./guards/auth.guard').then(g => g.AuthGuard)]
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
  // Wildcard route - must be last
  {
    path: '**',
    redirectTo: ''
  }
];
