import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductDetails } from '../../../models/dashboard.models';

const KNOWN_SIZE_KEYS = [
  'xs', 's', 'm', 'l', 'xl', 'xxl', 'xxxl', 'xxxxl',
  's1_2', 's3_4', 's5_6', 's7_8', 's9_10', 's11_12', 's13_14', 's15_16',
];

const SIZE_LABELS: Record<string, string> = {
  xs: 'XS', s: 'S', m: 'M', l: 'L', xl: 'XL', xxl: 'XXL', xxxl: 'XXXL', xxxxl: 'XXXXL',
  s1_2: '1-2', s3_4: '3-4', s5_6: '5-6', s7_8: '7-8',
  s9_10: '9-10', s11_12: '11-12', s13_14: '13-14', s15_16: '15-16',
};

@Component({
  selector: 'app-order-print-template',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './order-print-template.component.html',
  styleUrl: './order-print-template.component.scss',
})
export class OrderPrintTemplateComponent {
  @Input() order!: ProductDetails;
  currentDate = new Date();

  formatDate(date: any): string {
    if (!date) return '—';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('hy-AM', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  getPriorityLabel(priority: string): string {
    const map: Record<string, string> = {
      low: 'Ցածր', normal: 'Նորմալ', high: 'Բարձր', urgent: 'ՇՏԱՊ',
    };
    return map[priority] || priority;
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      pending: 'Սպասման մեջ',
      confirmed: 'Հաստատված',
      in_progress: 'Ընթացքի մեջ',
      ready_for_delivery: 'Պատրաստ',
      delivered: 'Առաքված',
      cancelled: 'Չեղարկված',
      returned: 'Վերադարձված',
    };
    return map[status] || status;
  }

  /** Returns all size keys that have at least one non-zero value, in standard order + custom at end */
  getActiveSizeRows(sizes: any): { key: string; label: string }[] {
    if (!sizes) return [];
    const knownSet = new Set(KNOWN_SIZE_KEYS);
    const rows: { key: string; label: string }[] = [];

    KNOWN_SIZE_KEYS.forEach(key => {
      const obj = sizes[key];
      if (obj && ((obj.men || 0) + (obj.women || 0) + (obj.uni || 0)) > 0) {
        rows.push({ key, label: SIZE_LABELS[key] });
      }
    });

    Object.keys(sizes).forEach(key => {
      if (!knownSet.has(key)) {
        const obj = sizes[key];
        if (obj && ((obj.men || 0) + (obj.women || 0) + (obj.uni || 0)) > 0) {
          const label = key.startsWith('custom_')
            ? key.replace('custom_', '').replace(/_/g, ' ').toUpperCase()
            : key.toUpperCase();
          rows.push({ key, label });
        }
      }
    });

    return rows;
  }

  /** True if any size row has men or women values (split mode) */
  hasSplitSizes(sizes: any): boolean {
    if (!sizes) return false;
    return Object.values(sizes).some((v: any) => (v?.men || 0) > 0 || (v?.women || 0) > 0);
  }

  getSizeVal(sizes: any, key: string, gender: 'men' | 'women' | 'uni'): number {
    return sizes?.[key]?.[gender] || 0;
  }

  getSizeRowTotal(sizes: any, key: string): number {
    return (sizes?.[key]?.men || 0) + (sizes?.[key]?.women || 0) + (sizes?.[key]?.uni || 0);
  }

  getGenderTotal(sizes: any, gender: 'men' | 'women' | 'uni'): number {
    if (!sizes) return 0;
    return Object.values(sizes).reduce((sum: number, v: any) => sum + (v?.[gender] || 0), 0);
  }

  getProductTotal(product: any): number {
    if (!product?.sizes) return 0;
    return Object.values(product.sizes).reduce(
      (sum: number, v: any) => sum + (v?.men || 0) + (v?.women || 0) + (v?.uni || 0), 0
    );
  }

  getGrandTotal(): number {
    if (!this.order?.products?.length) return this.order?.quantity || 0;
    return this.order.products.reduce((sum, p) => sum + this.getProductTotal(p), 0);
  }

  getProductRevenue(product: any): number | null {
    const price = product?.sellingPricePerUnit;
    if (!price) return null;
    return price * this.getProductTotal(product);
  }

  getTotalRevenue(): number | null {
    if (!this.order?.products?.length) return null;
    let total = 0;
    let hasAny = false;
    for (const p of this.order.products) {
      const rev = this.getProductRevenue(p);
      if (rev !== null) { total += rev; hasAny = true; }
    }
    return hasAny ? total : null;
  }
}
