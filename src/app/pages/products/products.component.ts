import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductsComponent as ProductsShowcaseComponent } from '../../components/products/products.component';

@Component({
  selector: 'app-products-page',
  standalone: true,
  imports: [CommonModule, ProductsShowcaseComponent],
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss']
})
export class ProductsPageComponent {
}