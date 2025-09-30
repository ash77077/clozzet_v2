import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductDetailsFormComponent } from '../../components/product-details-form/product-details-form.component';

@Component({
  selector: 'app-product-order',
  standalone: true,
  imports: [CommonModule, ProductDetailsFormComponent],
  templateUrl: './product-order.component.html',
  styleUrls: ['./product-order.component.scss']
})
export class ProductOrderComponent {
  constructor() {}
}