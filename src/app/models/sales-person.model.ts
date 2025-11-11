export interface SalesPerson {
  _id?: string;
  name: string;
  email?: string;
  phone?: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateSalesPersonDto {
  name: string;
  email?: string;
  phone?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}