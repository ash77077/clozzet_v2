export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phone?: string;
  jobTitle?: string;
  department?: string;
  employeeId?: string;
  company?: Company;
  createdAt: Date;
  lastLogin?: Date;
  isActive: boolean;
}

export interface Company {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  industry: string;
  size: CompanySize;
  website?: string;
  createdAt: Date;
  isActive: boolean;
  totalEmployees: number;
  totalOrders: number;
  totalOrderValue: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  companyId: string;
  status: OrderStatus;
  items: OrderItem[];
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
  deliveryDate?: Date;
  notes?: string;
  user?: User;
  company?: Company;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productType: ProductType;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  customization?: {
    design?: string;
    embroidery?: boolean;
    printing?: boolean;
    colors: string[];
    sizes: ProductSize[];
  };
}

export interface DashboardStats {
  totalUsers: number;
  totalCompanies: number;
  totalOrders: number;
  totalRevenue: number;
  activeUsers: number;
  recentRegistrations: number;
  completedOrders: number;
  monthlyGrowth: number;
}

export interface UserDashboardData {
  user: User;
  recentOrders: Order[];
  totalOrders: number;
  totalSpent: number;
  pendingOrders: number;
  stats: {
    thisMonth: {
      orders: number;
      spent: number;
    };
    lastMonth: {
      orders: number;
      spent: number;
    };
  };
}

export interface AdminDashboardData {
  stats: DashboardStats;
  recentUsers: User[];
  recentCompanies: Company[];
  recentOrders: Order[];
  topCompanies: Company[];
  userActivity: { date: string; registrations: number }[];
  monthlyOrderData: { month: string; orders: number; revenue: number }[];
}

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  USER = 'user',
  CUSTOMER = 'customer',
  BUSINESS_USER = 'business_user'
}

export enum CompanySize {
  ONE_TO_TEN = '1-10',
  ELEVEN_TO_FIFTY = '11-50',
  FIFTY_ONE_TO_TWO_HUNDRED = '51-200',
  TWO_HUNDRED_ONE_TO_FIVE_HUNDRED = '201-500',
  FIVE_HUNDRED_ONE_TO_THOUSAND = '501-1000',
  THOUSAND_PLUS = '1000+'
}

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  READY_FOR_DELIVERY = 'ready_for_delivery',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  RETURNED = 'returned'
}

export enum ProductType {
  TSHIRT = 'tshirt',
  POLO = 'polo',
  HOODIE = 'hoodie',
  CAP = 'cap',
  JACKET = 'jacket',
  PROMOTIONAL = 'promotional'
}

export enum ProductSize {
  XS = 'xs',
  S = 's',
  M = 'm',
  L = 'l',
  XL = 'xl',
  "2XL" = '2xl',
  "3XL" = '3xl',
  "4XL" = '4xl'
}

export interface ProductDetails {
  _id?: string;
  id?: string;
  orderNumber: string;
  clientName: string;
  salesPerson: string;
  deadline: string;
  quantity: number;
  priority: string;
  clothType: string;
  textileType: string;
  fabricWeight?: number;
  colors?: string[];
  customColorDetails?: string;
  sizeQuantities?: { [size: string]: number };
  printingMethod: string;
  logoPosition?: string;
  logoSize?: string;
  logoFiles?: string[];
  designFiles?: string[];
  referenceImages?: string[];
  pantoneColors?: string;
  neckStyle?: string;
  sleeveType?: string;
  fit?: string;
  hoodieStyle?: string;
  pocketType?: string;
  zipperType?: string;
  collarStyle?: string;
  buttonCount?: string;
  placketStyle?: string;
  bagStyle?: string;
  handleType?: string;
  bagDimensions?: string;
  reinforcement?: string;
  capStyle?: string;
  visorType?: string;
  closure?: string;
  apronStyle?: string;
  neckStrap?: string;
  waistTie?: string;
  pocketDetails?: string;
  specialInstructions?: string;
  packagingRequirements?: string;
  shippingAddress?: string;
  manufacturingStatus?: string;
  manufacturingNotes?: ManufacturingNote[];
  
  // Legacy compatibility properties
  status?: OrderStatus;
  totalAmount?: number;
  user?: User;
  company?: Company;
  
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface ManufacturingNote {
  date: string | Date;
  author: string;
  content: string;
}

export enum ManufacturingStatus {
  PENDING = 'pending',
  WAITING_FOR_INFO = 'waiting_for_info',
  IN_PROGRESS = 'in_progress',
  PRINTING = 'printing',
  QUALITY_CHECK = 'quality_check',
  PACKAGING = 'packaging',
  DONE = 'done',
  ON_HOLD = 'on_hold'
}
