import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { Tooltip } from 'primeng/tooltip';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { ProductDetailsService } from '../../services/product-details.service';
import { FinancialProductionService } from '../../services/financial-production.service';
import { ProductDetails } from '../../models/dashboard.models';
import { CostScenario } from '../../models/financial-production.model';

interface ProductFinancial {
  clothType: string;
  textileType?: string;
  designMethod?: string;
  colors?: string;
  quantity: number;
  costPricePerUnit?: number;
  sellingPricePerUnit?: number;
  totalCost: number;
  totalRevenue: number;
  profit: number;
  profitMargin: number;
}

interface OrderFinancial extends ProductDetails {
  totalCost: number;
  totalRevenue: number;
  totalProfit: number;
  averageMargin: number;
  productsFinancial: ProductFinancial[];
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  not_paid: 'Not Paid',
  deposit: 'Deposit',
  partial: 'Partial',
  paid: 'Paid',
};

@Component({
  selector: 'app-revenue',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    TagModule,
    ToastModule,
    Tooltip,
    SelectModule,
    InputNumberModule,
  ],
  providers: [MessageService],
  templateUrl: './revenue.component.html',
  styleUrl: './revenue.component.scss',
})
export class RevenueComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Data
  allOrders: ProductDetails[] = [];
  allFinancialOrders: OrderFinancial[] = [];  // all orders with pricing, regardless of status
  filteredOrders: OrderFinancial[] = [];

  // UI State
  isLoading = false;
  error: string | null = null;
  showOrderDetails = false;
  selectedOrder: OrderFinancial | null = null;
  editingProductIndex: number | null = null;
  editingCostPrice: number | null = null;
  selectedScenario: CostScenario | null = null;
  isSaving = false;
  isSavingPayment = false;

  // Payment editing
  editingPaymentOrderId: string | null = null;
  editingPaymentStatus: string = 'not_paid';
  editingPaidAmount: number | null = null;
  editingExpectedRevenue: number | null = null;

  get costScenarios() { return this.financialService.costScenarios$(); }
  get scenarioOptions() {
    return [
      { label: '— Enter manually —', value: null },
      ...this.costScenarios.map(s => ({
        label: `${s.name} (${s.productType}) — ${Math.round(this.financialService.calculateCost(s).totalUnitCost)} ֏`,
        value: s,
      })),
    ];
  }

  paymentStatusOptions = [
    { label: 'Not Paid', value: 'not_paid' },
    { label: 'Deposit',  value: 'deposit' },
    { label: 'Partial',  value: 'partial' },
    { label: 'Paid',     value: 'paid' },
  ];

  // Month filter — default to current month
  selectedMonth: Date = new Date();

  // Search
  searchTerm = '';

  // Summary cards
  cardExpected = 0;   // expected revenue (from expectedRevenue field)
  cardTotal = 0;      // total revenue of filtered orders (calculated from products)
  cardPaid = 0;       // sum of paidAmount
  cardUnpaid = 0;     // expected - paid

  constructor(
    private productDetailsService: ProductDetailsService,
    private financialService: FinancialProductionService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadOrders();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadOrders(): void {
    this.isLoading = true;
    this.error = null;

    this.productDetailsService.getAllProductDetails()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.allOrders = response.data || [];
          // Include all orders that have any financial data (expected revenue or product prices)
          this.allFinancialOrders = this.allOrders
            .filter(o => o.expectedRevenue || this.hasAnyProductPricing(o))
            .map(o => this.calculateOrderFinancials(o));
          this.applyFilters();
          this.isLoading = false;
        },
        error: () => {
          this.error = 'Failed to load revenue data';
          this.isLoading = false;
        },
      });
  }

  hasAnyProductPricing(order: ProductDetails): boolean {
    return !!order.products?.some(p => p.sellingPricePerUnit && p.sellingPricePerUnit > 0);
  }

  calculateOrderFinancials(order: ProductDetails): OrderFinancial {
    const productsFinancial: ProductFinancial[] = [];
    let totalCost = 0;
    let totalRevenue = 0;

    if (order.products && order.products.length > 0) {
      order.products.forEach(product => {
        const quantity = this.calculateProductQuantity(product.sizes || {});
        const costPerUnit = product.costPricePerUnit || 0;
        const sellingPerUnit = product.sellingPricePerUnit || 0;
        const productCost = quantity * costPerUnit;
        const productRevenue = quantity * sellingPerUnit;
        const productProfit = productRevenue - productCost;
        const productMargin = productRevenue > 0 ? (productProfit / productRevenue) * 100 : 0;

        productsFinancial.push({
          clothType: product.clothType,
          textileType: product.textileType,
          designMethod: product.designMethod,
          colors: product.colors,
          quantity,
          costPricePerUnit: costPerUnit,
          sellingPricePerUnit: sellingPerUnit,
          totalCost: productCost,
          totalRevenue: productRevenue,
          profit: productProfit,
          profitMargin: productMargin,
        });

        totalCost += productCost;
        totalRevenue += productRevenue;
      });
    }

    const totalProfit = totalRevenue - totalCost;
    const averageMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return { ...order, totalCost, totalRevenue, totalProfit, averageMargin, productsFinancial };
  }

  calculateProductQuantity(sizes: any): number {
    if (!sizes) return 0;
    let total = 0;
    Object.values(sizes).forEach((v: any) => {
      if (v && typeof v === 'object') {
        total += (v.men || 0) + (v.women || 0) + (v.uni || 0);
      }
    });
    return total;
  }

  applyFilters(): void {
    const month = this.selectedMonth.getMonth();
    const year = this.selectedMonth.getFullYear();

    this.filteredOrders = this.allFinancialOrders.filter(order => {
      // Match by the order's deadline month (or createdAt as fallback)
      const date = new Date((order.deadline || order.createdAt) as string);
      const monthMatch = date.getMonth() === month && date.getFullYear() === year;

      const searchMatch = !this.searchTerm ||
        order.orderNumber?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        order.clientName?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        order.companyName?.toLowerCase().includes(this.searchTerm.toLowerCase());

      return monthMatch && searchMatch;
    });

    this.calculateCards();
  }

  onMonthChange(): void { this.applyFilters(); }
  onSearchChange(): void { this.applyFilters(); }

  prevMonth(): void {
    const d = new Date(this.selectedMonth);
    d.setMonth(d.getMonth() - 1);
    this.selectedMonth = d;
    this.applyFilters();
  }

  nextMonth(): void {
    const d = new Date(this.selectedMonth);
    d.setMonth(d.getMonth() + 1);
    this.selectedMonth = d;
    this.applyFilters();
  }

  get selectedMonthLabel(): string {
    return this.selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  calculateCards(): void {
    this.cardExpected = this.filteredOrders.reduce((sum, o) => sum + (o.expectedRevenue || o.totalRevenue || 0), 0);
    this.cardTotal    = this.filteredOrders.reduce((sum, o) => sum + (o.totalRevenue || 0), 0);
    this.cardPaid     = this.filteredOrders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
    this.cardUnpaid   = this.cardExpected - this.cardPaid;
  }

  // ─── Payment status ────────────────────────────────────────────────────────

  getPaymentStatusLabel(status: string | undefined): string {
    return PAYMENT_STATUS_LABELS[status || 'not_paid'] || 'Not Paid';
  }

  getPaymentStatusSeverity(status: string | undefined): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
    switch (status) {
      case 'paid':    return 'success';
      case 'partial': return 'warn';
      case 'deposit': return 'info';
      default:        return 'danger';
    }
  }

  startEditingPayment(order: OrderFinancial): void {
    this.editingPaymentOrderId = (order._id || order.id) as string;
    this.editingPaymentStatus  = order.paymentStatus || 'not_paid';
    this.editingPaidAmount     = order.paidAmount || null;
    this.editingExpectedRevenue = order.expectedRevenue || order.totalRevenue || null;
  }

  cancelEditingPayment(): void {
    this.editingPaymentOrderId = null;
  }

  savePayment(order: OrderFinancial): void {
    const id = (order._id || order.id) as string;
    if (!id) return;

    this.isSavingPayment = true;

    this.productDetailsService.updateProductDetails(id, {
      paymentStatus:   this.editingPaymentStatus as any,
      paidAmount:      this.editingPaidAmount ?? 0,
      expectedRevenue: this.editingExpectedRevenue ?? undefined,
    } as any).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        // Update local
        order.paymentStatus   = this.editingPaymentStatus as any;
        order.paidAmount      = this.editingPaidAmount ?? 0;
        order.expectedRevenue = this.editingExpectedRevenue ?? undefined;
        this.calculateCards();
        this.cancelEditingPayment();
        this.isSavingPayment = false;
        // Refresh selectedOrder if open
        if (this.selectedOrder && (this.selectedOrder._id || this.selectedOrder.id) === id) {
          this.selectedOrder = { ...this.selectedOrder, ...order };
        }
        this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'Payment updated.' });
      },
      error: () => {
        this.isSavingPayment = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save payment.' });
      },
    });
  }

  // ─── Order details modal ───────────────────────────────────────────────────

  viewOrderDetails(order: OrderFinancial): void {
    this.selectedOrder = order;
    this.showOrderDetails = true;
  }

  closeOrderDetails(): void {
    this.showOrderDetails = false;
    this.selectedOrder = null;
    this.cancelEditingCostPrice();
  }

  // ─── Cost price editing ────────────────────────────────────────────────────

  startEditingCostPrice(productIndex: number, currentCostPrice: number | undefined): void {
    this.editingProductIndex = productIndex;
    this.editingCostPrice = currentCostPrice || null;
    this.selectedScenario = null;
  }

  cancelEditingCostPrice(): void {
    this.editingProductIndex = null;
    this.editingCostPrice = null;
    this.selectedScenario = null;
  }

  onScenarioSelect(scenario: CostScenario | null): void {
    this.selectedScenario = scenario;
    if (scenario) {
      this.editingCostPrice = Math.round(this.financialService.calculateCost(scenario).totalUnitCost);
    }
  }

  saveCostPrice(productIndex: number): void {
    if (!this.selectedOrder || this.editingCostPrice === null) return;
    const orderId = this.selectedOrder._id || this.selectedOrder.id;
    if (!orderId) return;
    this.isSaving = true;

    const updateData: any = {
      products: this.selectedOrder.products?.map((product, idx) => ({
        ...product,
        costPricePerUnit: idx === productIndex ? this.editingCostPrice : product.costPricePerUnit,
      })),
    };

    this.productDetailsService.updateProductDetails(orderId, updateData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          if (this.selectedOrder?.products?.[productIndex]) {
            this.selectedOrder.products[productIndex].costPricePerUnit = this.editingCostPrice ?? undefined;
          }
          const updatedOrder = this.calculateOrderFinancials(this.selectedOrder!);
          this.selectedOrder = updatedOrder;

          const update = (arr: OrderFinancial[]) => {
            const idx = arr.findIndex(o => (o._id || o.id) === (this.selectedOrder!._id || this.selectedOrder!.id));
            if (idx !== -1) arr[idx] = updatedOrder;
          };
          update(this.allFinancialOrders);
          update(this.filteredOrders);
          this.calculateCards();
          this.cancelEditingCostPrice();
          this.isSaving = false;
          this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'Cost price updated.' });
        },
        error: () => {
          this.isSaving = false;
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update cost price.' });
        },
      });
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  formatDate(date: string | Date | undefined): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount) + ' ֏';
  }

  getProductSummary(order: OrderFinancial): string {
    const types = order.productsFinancial?.map(p => p.clothType).filter(Boolean) || [];
    if (!types.length) return order.clothType || '—';
    if (types.length === 1) return types[0];
    if (types.length === 2) return `${types[0]}, ${types[1]}`;
    return `${types[0]} +${types.length - 1} more`;
  }

  hasFinancialData(order: OrderFinancial): boolean {
    return order.totalRevenue > 0 || !!order.expectedRevenue;
  }

  getStatusLabel(status: string | undefined): string {
    const map: Record<string, string> = {
      pending: 'To-Do', confirmed: 'Confirmed', in_progress: 'In Progress',
      ready_for_delivery: 'Ready', delivered: 'Delivered',
      cancelled: 'Cancelled', returned: 'Returned',
    };
    return map[status || ''] || status || '—';
  }

  paidPercent(order: OrderFinancial): number {
    const expected = order.expectedRevenue || order.totalRevenue || 0;
    if (!expected) return 0;
    return Math.min(100, Math.round(((order.paidAmount || 0) / expected) * 100));
  }
}
