import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';
import { AdminGuard } from '../guards/admin.guard';

const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    canActivate: [AdminGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'monthly-expense',
        loadComponent: () => import('./monthly-expense/monthly-expense.component').then(m => m.MonthlyExpenseComponent)
      },
      {
        path: 'fabric-inventory',
        loadComponent: () => import('./fabric-inventory/fabric-inventory.component').then(m => m.FabricInventoryComponent)
      },
      {
        path: 'accessories',
        loadComponent: () => import('./accessories-registry/accessories-registry.component').then(m => m.AccessoriesRegistryComponent)
      },
      {
        path: 'product-recipe',
        loadComponent: () => import('./product-recipe/product-recipe.component').then(m => m.ProductRecipeComponent)
      },
      {
        path: 'production-run',
        loadComponent: () => import('./production-run/production-run.component').then(m => m.ProductionRunComponent)
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FinancialProductionRoutingModule { }
