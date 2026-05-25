import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductDetails } from '../../../models/dashboard.models';

@Component({
  selector: 'app-order-print-template',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './order-print-template.component.html',
  styleUrl: './order-print-template.component.scss'
})
export class OrderPrintTemplateComponent {
  @Input() order!: ProductDetails;
  currentDate = new Date();

  /**
   * Format date for display
   */
  formatDate(date: any): string {
    if (!date) return '—';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('hy-AM', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }

  /**
   * Get total quantity for a product
   */
  getProductTotalQuantity(product: any): number {
    if (!product || !product.sizes) return 0;

    let total = 0;
    const sizes = ['xs', 's', 'm', 'l', 'xl', 'xxl', 'xxxl', 'xxxxl'];

    sizes.forEach(size => {
      if (product.sizes[size]) {
        total += (product.sizes[size].men || 0) +
                 (product.sizes[size].women || 0) +
                 (product.sizes[size].uni || 0);
      }
    });

    return total;
  }

  /**
   * Get total for a specific size across all genders
   */
  getSizeTotal(sizeObj: any): number {
    if (!sizeObj) return 0;
    return (sizeObj.men || 0) + (sizeObj.women || 0) + (sizeObj.uni || 0);
  }

  /**
   * Get grand total quantity across all products
   */
  getGrandTotalQuantity(): number {
    if (!this.order.products || this.order.products.length === 0) {
      return this.order.quantity || 0;
    }

    let total = 0;
    this.order.products.forEach(product => {
      total += this.getProductTotalQuantity(product);
    });
    return total;
  }

  /**
   * Get priority in Armenian
   */
  getPriorityArmenian(priority: string): string {
    const map: any = {
      'low': 'Ցածր',
      'normal': 'Նորմալ',
      'high': 'Բարձր',
      'urgent': 'Շտապ'
    };
    return map[priority] || priority;
  }

  /**
   * Get status in Armenian
   */
  getStatusArmenian(status: string): string {
    const map: any = {
      'pending': 'Սպասման մեջ',
      'confirmed': 'Հաստատված',
      'in_progress': 'Ընթացքի մեջ',
      'ready_for_delivery': 'Պատրաստ է առաքման',
      'delivered': 'Առաքված',
      'cancelled': 'Չեղարկված',
      'returned': 'Վերադարձված'
    };
    return map[status] || status;
  }
}
