import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';

export interface OrderPrintData {
  orderNumber: string;
  clientName: string;
  salesPerson?: string;
  deadline?: Date;
  priority?: string;
  quantity?: number;
  clothType?: string;
  textileType?: string;
  fabricWeight?: string;
  colors?: string;
  customColorDetails?: string;
  logoPosition?: string;
  logoSize?: string;
  specialInstructions?: string;
  packagingRequirements?: string;
  shippingAddress?: string;
  sizes?: {
    xs?: { men?: number; women?: number; uni?: number };
    s?: { men?: number; women?: number; uni?: number };
    m?: { men?: number; women?: number; uni?: number };
    l?: { men?: number; women?: number; uni?: number };
    xl?: { men?: number; women?: number; uni?: number };
    xxl?: { men?: number; women?: number; uni?: number };
    xxxl?: { men?: number; women?: number; uni?: number };
    xxxxl?: { men?: number; women?: number; uni?: number };
  };
  grandTotal?: number;
  createdAt?: Date;
}

interface SizeRow {
  size: string;
  men: number;
  women: number;
  uni: number;
  total: number;
}

interface GenderColumn {
  key: 'men' | 'women' | 'uni';
  label: string;
}

@Component({
  selector: 'app-order-print-preview',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule, DatePipe],
  templateUrl: './order-print-preview.component.html',
  styleUrls: ['./order-print-preview.component.scss']
})
export class OrderPrintPreviewComponent {
  @Input() visible = false;
  @Input() orderData: OrderPrintData | null = null;
  @Output() visibleChange = new EventEmitter<boolean>();

  get filteredSizeRows(): SizeRow[] {
    if (!this.orderData?.sizes) return [];

    const sizeOrder = ['xs', 's', 'm', 'l', 'xl', 'xxl', 'xxxl', 'xxxxl'];
    const rows: SizeRow[] = [];

    for (const sizeKey of sizeOrder) {
      const sizeData = this.orderData.sizes[sizeKey as keyof typeof this.orderData.sizes];
      if (!sizeData) continue;

      const men = sizeData.men || 0;
      const women = sizeData.women || 0;
      const uni = sizeData.uni || 0;
      const total = men + women + uni;

      // Only include rows with at least one non-zero quantity
      if (total > 0) {
        rows.push({
          size: sizeKey.toUpperCase(),
          men,
          women,
          uni,
          total
        });
      }
    }

    return rows;
  }

  get activeGenderColumns(): GenderColumn[] {
    const rows = this.filteredSizeRows;
    const columns: GenderColumn[] = [];

    // Sum up each gender column across all sizes
    const menTotal = rows.reduce((sum, row) => sum + row.men, 0);
    const womenTotal = rows.reduce((sum, row) => sum + row.women, 0);
    const uniTotal = rows.reduce((sum, row) => sum + row.uni, 0);

    // Only include columns that have at least one non-zero value
    if (menTotal > 0) columns.push({ key: 'men', label: 'Men' });
    if (womenTotal > 0) columns.push({ key: 'women', label: 'Women' });
    if (uniTotal > 0) columns.push({ key: 'uni', label: 'Unisex' });

    return columns;
  }

  get totalQuantity(): number {
    return this.filteredSizeRows.reduce((sum, row) => sum + row.total, 0);
  }

  onHide(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  print(): void {
    window.print();
  }

  hasValue(value: any): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    return !(typeof value === 'number' && value === 0);

  }

  getColumnTotal(column: 'men' | 'women' | 'uni'): number {
    return this.filteredSizeRows.reduce((total, row) => total + row[column], 0);
  }
}
