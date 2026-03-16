// ─── B2B Order Status ──────────────────────────────────────────────────────
export enum B2BOrderStatus {
  PENDING        = 'Pending',
  IN_PRODUCTION  = 'In Production',
  QUALITY_CHECK  = 'Quality Check',
  SHIPPED        = 'Shipped',
  DELIVERED      = 'Delivered',
}

// ─── Order Item ────────────────────────────────────────────────────────────
export interface B2BOrderItem {
  type: string;      // e.g. T-shirt, Hoodie, Cap
  quantity: number;
  size: string;      // e.g. S, M, L, XL, XXL
}

// ─── Timeline Entry ────────────────────────────────────────────────────────
export interface OrderTimelineEntry {
  status: B2BOrderStatus;
  changedAt: Date;
  changedBy: string; // user ID who triggered the change
  note?: string;
}

// ─── Main B2B Order ────────────────────────────────────────────────────────
export interface B2BOrder {
  id?: string;
  companyName: string;
  companyId?: string;
  orderedBy: string;            // User ID of the client or manager who placed it
  items: B2BOrderItem[];
  status: B2BOrderStatus;
  timeline: OrderTimelineEntry[];
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// ─── Create DTO ────────────────────────────────────────────────────────────
export interface CreateB2BOrderDto {
  companyName: string;
  companyId?: string;
  items: B2BOrderItem[];
  notes?: string;
}

// ─── Update Status DTO ─────────────────────────────────────────────────────
export interface UpdateB2BOrderStatusDto {
  status: B2BOrderStatus;
  note?: string;
}

// ─── Notification ──────────────────────────────────────────────────────────
export interface OrderStatusNotification {
  id?: string;
  orderId: string;
  userId: string;       // recipient (the client who placed the order)
  companyName: string;
  message: string;
  newStatus: B2BOrderStatus;
  isRead: boolean;
  createdAt?: Date;
}

// ─── Helpers ───────────────────────────────────────────────────────────────
export const B2B_STATUS_LABELS: Record<B2BOrderStatus, string> = {
  [B2BOrderStatus.PENDING]:       'Pending',
  [B2BOrderStatus.IN_PRODUCTION]: 'In Production',
  [B2BOrderStatus.QUALITY_CHECK]: 'Quality Check',
  [B2BOrderStatus.SHIPPED]:       'Shipped',
  [B2BOrderStatus.DELIVERED]:     'Delivered',
};

export const B2B_STATUSES = Object.values(B2BOrderStatus);

export const PRODUCT_TYPES = [
  'T-shirt', 'Polo', 'Hoodie', 'Sweatshirt', 'Cap',
  'Jacket', 'Tote Bag', 'Promotional Item',
];

export const PRODUCT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
