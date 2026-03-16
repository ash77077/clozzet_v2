# Order Print Preview Component

A print-optimized modal component that generates factory-ready job tickets from order data.

## Features

✅ **Conditional Rendering** - Automatically hides empty/null/zero fields using `*ngIf`
✅ **Dynamic Size Matrix** - Filters out empty size rows and gender columns
✅ **Print Optimization** - Uses Tailwind print: modifiers and @media print styles
✅ **High Contrast** - Black and white print-ready output
✅ **QA Checklist** - Built-in footer with Cut/Sewn/QC checkboxes

## Usage

### 1. Import the component

```typescript
import { OrderPrintPreviewComponent, OrderPrintData } from './shared/components/order-print-preview/order-print-preview.component';

@Component({
  standalone: true,
  imports: [OrderPrintPreviewComponent],
})
export class YourComponent {}
```

### 2. Add to your template

```html
<button pButton label="Print Job Ticket" (click)="showPrintPreview = true"></button>

<app-order-print-preview
  [(visible)]="showPrintPreview"
  [orderData]="selectedOrder">
</app-order-print-preview>
```

### 3. Prepare your order data

```typescript
showPrintPreview = false;
selectedOrder: OrderPrintData = {
  orderNumber: 'ORD-12345',
  clientName: 'Acme Corp',
  deadline: new Date('2024-03-15'),
  priority: 'urgent',
  quantity: 150,
  clothType: 'T-Shirt',
  textileType: '100% Cotton',
  colors: 'Navy Blue',
  sizes: {
    s: { men: 20, women: 15, uni: 0 },
    m: { men: 30, women: 25, uni: 0 },
    l: { men: 25, women: 20, uni: 0 },
    xl: { men: 10, women: 5, uni: 0 }
  },
  logoPosition: 'Center Chest',
  logoSize: '4" x 4"',
  specialInstructions: 'Use double stitching on all seams'
};
```

## How It Works

### Empty Field Filtering
- Fields with `null`, `undefined`, `''`, or `0` are hidden automatically
- Entire sections disappear if all their fields are empty

### Size Matrix Logic
- **Row Filtering**: Only shows sizes where total quantity > 0
- **Column Filtering**: Only shows gender columns (Men/Women/Unisex) with non-zero totals
- Example: If all "Unisex" values are 0, the entire column is hidden

### Print Behavior
- Clicking "Print" triggers `window.print()`
- Modal backdrop, header, footer, and buttons are hidden via `print:hidden`
- Content is optimized for A4/Letter paper
- High-contrast black text on white background
- Borders remain visible for table structure

## Interface

```typescript
export interface OrderPrintData {
  // Required
  orderNumber: string;
  clientName: string;

  // Optional
  salesPerson?: string;
  deadline?: Date;
  priority?: string;  // 'normal' | 'urgent'
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
    // ... (all sizes)
  };
  grandTotal?: number;
  createdAt?: Date;
}
```

## Customization

### Print Styles
Edit `order-print-preview.component.scss` to adjust:
- Page margins
- Font sizes
- Border styles
- Section spacing

### QA Checklist
Modify the QA footer in the HTML template to add/remove checklist items.

### Size Order
Change the `sizeOrder` array in the component to reorder size display.
