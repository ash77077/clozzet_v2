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
import { DatePicker } from 'primeng/datepicker';
import { MessageService } from 'primeng/api';
import { Tooltip } from 'primeng/tooltip';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { ProductDetailsService } from '../../services/product-details.service';
import { FinancialProductionService } from '../../services/financial-production.service';
import { OrderStatus, ProductDetails } from '../../models/dashboard.models';
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
    DatePicker,
    Tooltip,
    SelectModule,
    InputNumberModule,
  ],
  providers: [MessageService],
  templateUrl: './revenue.component.html',
  styleUrl: './revenue.component.scss'
})
export class RevenueComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Data
  allOrders: ProductDetails[] = [];
  deliveredOrders: OrderFinancial[] = [];
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

  get costScenarios() { return this.financialService.costScenarios$(); }
  get scenarioOptions() {
    return [
      { label: '— Enter manually —', value: null },
      ...this.costScenarios.map(s => ({
        label: `${s.name} (${s.productType}) — ${Math.round(this.financialService.calculateCost(s).totalUnitCost)} ֏`,
        value: s
      }))
    ];
  }

  // Filters
  searchTerm = '';
  dateFilterStart: Date | null = null;
  dateFilterEnd: Date | null = null;

  // Statistics
  totalRevenue = 0;
  totalProfit = 0;
  totalCost = 0;
  averageMargin = 0;
  totalOrders = 0;

  constructor(
    private productDetailsService: ProductDetailsService,
    private financialService: FinancialProductionService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadDeliveredOrders();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDeliveredOrders(): void {
    this.isLoading = true;
    this.error = null;

    this.productDetailsService.getAllProductDetails()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.allOrders = response.data || [];

          // Filter only delivered orders
          const delivered = this.allOrders.filter(order =>
            order.status === OrderStatus.DELIVERED
          );

          // Calculate financials for each order
          this.deliveredOrders = delivered.map(order => this.calculateOrderFinancials(order));
          this.filteredOrders = [...this.deliveredOrders];

          this.calculateStatistics();
          this.isLoading = false;
        },
        error: (err) => {
          this.error = 'Failed to load revenue data';
          this.isLoading = false;
          console.error('Error loading orders:', err);
        }
      });
  }

  calculateOrderFinancials(order: ProductDetails): OrderFinancial {
    const productsFinancial: ProductFinancial[] = [];
    let totalCost = 0;
    let totalRevenue = 0;

    if (order.products && order.products.length > 0) {
      // Process each product
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
          profitMargin: productMargin
        });

        totalCost += productCost;
        totalRevenue += productRevenue;
      });
    }

    const totalProfit = totalRevenue - totalCost;
    const averageMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return {
      ...order,
      totalCost,
      totalRevenue,
      totalProfit,
      averageMargin,
      productsFinancial
    };
  }

  calculateProductQuantity(sizes: any): number {
    if (!sizes) return 0;

    let total = 0;
    const sizeKeys = ['xs', 's', 'm', 'l', 'xl', 'xxl', 'xxxl', 'xxxxl'];

    sizeKeys.forEach(size => {
      if (sizes[size]) {
        total += (sizes[size].men || 0) + (sizes[size].women || 0) + (sizes[size].uni || 0);
      }
    });

    return total;
  }

  calculateStatistics(): void {
    this.totalRevenue = this.filteredOrders.reduce((sum, order) => sum + order.totalRevenue, 0);
    this.totalProfit = this.filteredOrders.reduce((sum, order) => sum + order.totalProfit, 0);
    this.totalCost = this.filteredOrders.reduce((sum, order) => sum + order.totalCost, 0);
    this.totalOrders = this.filteredOrders.length;
    this.averageMargin = this.totalRevenue > 0 ? (this.totalProfit / this.totalRevenue) * 100 : 0;
  }

  applyFilters(): void {
    this.filteredOrders = this.deliveredOrders.filter(order => {
      // Search filter
      const searchMatch = !this.searchTerm ||
        order.orderNumber?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        order.clientName?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        order.companyName?.toLowerCase().includes(this.searchTerm.toLowerCase());

      // Date filter
      let dateMatch = true;
      if (this.dateFilterStart || this.dateFilterEnd) {
        const orderDate = new Date(order.deadline);
        if (this.dateFilterStart) {
          const startDate = new Date(this.dateFilterStart);
          dateMatch = dateMatch && orderDate >= startDate;
        }
        if (this.dateFilterEnd) {
          const endDate = new Date(this.dateFilterEnd);
          dateMatch = dateMatch && orderDate <= endDate;
        }
      }

      return searchMatch && dateMatch;
    });

    this.calculateStatistics();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.dateFilterStart = null;
    this.dateFilterEnd = null;
    this.applyFilters();
  }

  viewOrderDetails(order: OrderFinancial): void {
    this.selectedOrder = order;
    this.showOrderDetails = true;
  }

  closeOrderDetails(): void {
    this.showOrderDetails = false;
    this.selectedOrder = null;
  }

  formatDate(date: string | Date | undefined): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  exportToExcel(): void {
    // TODO: Implement Excel export
    this.messageService.add({
      severity: 'info',
      summary: 'Export',
      detail: 'Excel export feature coming soon!'
    });
  }

  getProductSummary(order: OrderFinancial): string {
    if (!order.productsFinancial || order.productsFinancial.length === 0) {
      return order.clothType || '—';
    }

    const types = order.productsFinancial.map(p => p.clothType).filter(Boolean);
    if (types.length === 1) return types[0];
    if (types.length === 2) return `${types[0]}, ${types[1]}`;
    return `${types[0]} +${types.length - 1} more`;
  }

  hasFinancialData(order: OrderFinancial): boolean {
    return order.totalRevenue > 0 || order.totalCost > 0;
  }

  // ─── Cost Price Editing ────────────────────────────────────────────────────

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

    this.isSaving = true;

    // Find the original order
    const orderId = this.selectedOrder._id || this.selectedOrder.id;
    if (!orderId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Order ID not found'
      });
      this.isSaving = false;
      return;
    }

    // Update the product's costPricePerUnit
    const updateData: any = {
      products: this.selectedOrder.products?.map((product, idx) => ({
        ...product,
        costPricePerUnit: idx === productIndex ? this.editingCostPrice : product.costPricePerUnit
      }))
    };

    this.productDetailsService.updateProductDetails(orderId, updateData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Cost price updated successfully'
          });

          // Update the local selectedOrder products array with new cost price
          if (this.selectedOrder && this.selectedOrder.products && this.selectedOrder.products[productIndex]) {
            this.selectedOrder.products[productIndex].costPricePerUnit = this.editingCostPrice ?? undefined;
          }

          // Recalculate the order financials with the new cost price
          const updatedOrder = this.calculateOrderFinancials(this.selectedOrder!);
          this.selectedOrder = updatedOrder;

          // Update the order in the deliveredOrders and filteredOrders arrays
          const orderIndex = this.deliveredOrders.findIndex(o =>
            (o._id || o.id) === (this.selectedOrder!._id || this.selectedOrder!.id)
          );
          if (orderIndex !== -1) {
            this.deliveredOrders[orderIndex] = updatedOrder;
          }

          const filteredIndex = this.filteredOrders.findIndex(o =>
            (o._id || o.id) === (this.selectedOrder!._id || this.selectedOrder!.id)
          );
          if (filteredIndex !== -1) {
            this.filteredOrders[filteredIndex] = updatedOrder;
          }

          // Recalculate statistics
          this.calculateStatistics();

          // Cancel editing mode
          this.cancelEditingCostPrice();
          this.isSaving = false;
        },
        error: (err) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to update cost price'
          });
          console.error('Error updating cost price:', err);
          this.isSaving = false;
        }
      });
  }
}
