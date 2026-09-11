import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { ManagerGuard } from './guards/manager.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent),
    data: {
      seo: {
        title: 'Corporate Clothing & Branded Workwear in Yerevan | Clozzet',
        description: 'Custom branded apparel for teams and businesses in Armenia. Design, private label and white label manufacturing, from 7-day production. Free quote in 24 hours.',
        path: '/'
      }
    }
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [ManagerGuard],
    data: { seo: { noIndex: true } }
  },
  {
    path: 'about',
    loadComponent: () => import('./pages/about/about.component').then(m => m.AboutComponent),
    data: {
      seo: {
        title: 'About Clozzet | Corporate Apparel Manufacturer in Yerevan',
        description: 'Learn how Clozzet crafts premium branded workwear for Armenian and international businesses — design, manufacturing and fulfilment under one roof.',
        path: '/about'
      }
    }
  },
  {
    path: 'products',
    loadComponent: () => import('./pages/products/products.component').then(m => m.ProductsPageComponent),
    data: {
      seo: {
        title: 'Custom Branded Apparel Products | Clozzet',
        description: 'Browse our range of custom T-shirts, polos, hoodies, caps, jackets and promotional items. All products available for private label and white label manufacturing.',
        path: '/products'
      }
    }
  },
  {
    path: 'services',
    loadComponent: () => import('./pages/services/services.component').then(m => m.ServicesPageComponent),
    data: {
      seo: {
        title: 'Custom Apparel Services — Bulk Orders & Design | Clozzet',
        description: 'End-to-end branded apparel services: bulk order fulfilment, logo embroidery, screen printing, custom design and private label manufacturing in Armenia.',
        path: '/services'
      }
    }
  },
  {
    path: 'portfolio',
    loadComponent: () => import('./pages/portfolio/portfolio.component').then(m => m.PortfolioComponent),
    data: {
      seo: {
        title: 'Portfolio | Clozzet',
        description: 'See examples of branded workwear, custom apparel and promotional products produced by Clozzet for businesses across Armenia and beyond.',
        path: '/portfolio'
      }
    }
  },
  {
    path: 'contact',
    loadComponent: () => import('./pages/contact/contact.component').then(m => m.ContactComponent),
    data: {
      seo: {
        title: 'Contact Clozzet | Get a Free Quote on Branded Workwear',
        description: 'Get in touch with the Clozzet team. Request a free custom apparel quote, ask about bulk orders, or visit us in Yerevan. Response within 24 hours.',
        path: '/contact'
      }
    }
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent),
    data: { seo: { noIndex: true } }
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent),
    data: { seo: { noIndex: true } }
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
  // Legal pages
  {
    path: 'privacy',
    loadComponent: () => import('./pages/legal/legal.component').then(m => m.LegalComponent),
    data: {
      doc: 'privacy',
      seo: { title: 'Privacy Policy | Clozzet', description: 'How Clozzet collects, uses and protects your personal data.', path: '/privacy' }
    }
  },
  {
    path: 'terms',
    loadComponent: () => import('./pages/legal/legal.component').then(m => m.LegalComponent),
    data: {
      doc: 'terms',
      seo: { title: 'Terms of Service | Clozzet', description: 'The terms that govern your use of the Clozzet website and any order placed with Clozzet.', path: '/terms' }
    }
  },
  {
    path: 'cookies',
    loadComponent: () => import('./pages/legal/legal.component').then(m => m.LegalComponent),
    data: {
      doc: 'cookies',
      seo: { title: 'Cookie Policy | Clozzet', description: 'How Clozzet uses cookies and similar technologies on this website.', path: '/cookies' }
    }
  },
  // 404 — must be last
  {
    path: '**',
    loadComponent: () => import('./pages/not-found/not-found.component').then(m => m.NotFoundComponent),
    data: { seo: { title: 'Page Not Found | Clozzet', description: 'The page you requested could not be found.', noIndex: true } }
  }
];
