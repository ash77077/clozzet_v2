import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { B2BOrdersService } from '../../services/b2b-orders.service';
import { B2BOrder, B2BOrderStatus } from '../../models/b2b-order.model';

interface StatusStep {
  status: B2BOrderStatus;
  label: string;
  icon: string;
  color: string;
}

const ORDER_STEPS: StatusStep[] = [
  { status: B2BOrderStatus.PENDING,       label: 'Pending',        icon: 'pi pi-clock',         color: '#f59e0b' },
  { status: B2BOrderStatus.IN_PRODUCTION, label: 'In Production',  icon: 'pi pi-cog',            color: '#3b82f6' },
  { status: B2BOrderStatus.QUALITY_CHECK, label: 'Quality Check',  icon: 'pi pi-verified',       color: '#8b5cf6' },
  { status: B2BOrderStatus.SHIPPED,       label: 'Shipped',        icon: 'pi pi-send',           color: '#06b6d4' },
  { status: B2BOrderStatus.DELIVERED,     label: 'Delivered',      icon: 'pi pi-check-circle',   color: '#10b981' },
];

@Component({
  selector: 'app-my-orders',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe],
  templateUrl: './my-orders.component.html',
  styleUrls: ['./my-orders.component.scss'],
})
export class MyOrdersComponent implements OnInit {
  orders = signal<B2BOrder[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  expandedOrderId = signal<string | null>(null);

  readonly steps = ORDER_STEPS;

  totalOrders = computed(() => this.orders().length);
  pendingOrders = computed(() =>
    this.orders().filter(o => o.status === B2BOrderStatus.PENDING).length,
  );
  activeOrders = computed(() =>
    this.orders().filter(
      o => o.status === B2BOrderStatus.IN_PRODUCTION || o.status === B2BOrderStatus.QUALITY_CHECK || o.status === B2BOrderStatus.SHIPPED,
    ).length,
  );
  deliveredOrders = computed(() =>
    this.orders().filter(o => o.status === B2BOrderStatus.DELIVERED).length,
  );

  constructor(private b2bOrdersService: B2BOrdersService) {}

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.loading.set(true);
    this.error.set(null);
    this.b2bOrdersService.getMyOrders().subscribe({
      next: orders => {
        this.orders.set(orders ?? []);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(err?.error?.message ?? 'Failed to load orders. Please try again.');
        this.loading.set(false);
      },
    });
  }

  toggleExpand(orderId: string | undefined): void {
    if (!orderId) return;
    this.expandedOrderId.set(this.expandedOrderId() === orderId ? null : orderId);
  }

  isExpanded(orderId: string | undefined): boolean {
    return !!orderId && this.expandedOrderId() === orderId;
  }

  getStepIndex(status: B2BOrderStatus): number {
    return ORDER_STEPS.findIndex(s => s.status === status);
  }

  isStepCompleted(orderStatus: B2BOrderStatus, step: StatusStep): boolean {
    return this.getStepIndex(orderStatus) > ORDER_STEPS.indexOf(step);
  }

  isStepActive(orderStatus: B2BOrderStatus, step: StatusStep): boolean {
    return orderStatus === step.status;
  }

  getStatusColor(status: B2BOrderStatus): string {
    const step = ORDER_STEPS.find(s => s.status === status);
    return step?.color ?? '#6b7280';
  }

  getTotalItems(order: B2BOrder): number {
    return order.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  getOrderId(order: B2BOrder): string {
    return order.id ?? (order as any)._id ?? '';
  }
}
