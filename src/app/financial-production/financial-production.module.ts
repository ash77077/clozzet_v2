import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FinancialProductionRoutingModule } from './financial-production-routing.module';
import { LayoutComponent } from './layout/layout.component';


@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    FinancialProductionRoutingModule,
    LayoutComponent
  ]
})
export class FinancialProductionModule { }
