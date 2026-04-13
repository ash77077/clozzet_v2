export enum OrderRequestStatus {
  PENDING_ADMIN = 'Pending Admin',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
}

export interface OrderRequest {
  _id?: string;
  modelName: string;
  description: string;
  quantity: number;
  unitSellingPrice: number;
  totalAmount: number;
  internalCost?: number;
  profitMargin?: number;
  adminNotes?: string;
  status: OrderRequestStatus;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: Date;
  rejectedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateOrderRequestDto {
  modelName: string;
  description: string;
  quantity: number;
  unitSellingPrice: number;
  totalAmount: number;
}

export interface AdminReviewOrderRequestDto {
  internalCost: number;
  adminNotes?: string;
  status: OrderRequestStatus.APPROVED | OrderRequestStatus.REJECTED;
}
