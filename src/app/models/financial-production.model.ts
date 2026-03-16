// Feature 1: Monthly Expense Report (Overhead)
export interface MonthlyExpenseReport {
  id?: string;
  month: number; // 1-12
  year: number;
  rent: number;
  utilities: number;
  fixedSalaries: number; // Total for employees on fixed contracts
  variableDailyLabor: number; // Total paid to daily-wage workers
  totalOverhead?: number; // Computed: rent + utilities + fixedSalaries + variableDailyLabor
  createdAt?: Date;
  updatedAt?: Date;
}

// Feature 2: Accessories & Details Registry
export interface AccessoryItem {
  id?: string;
  name: string; // e.g., "Gold Button", "Zipper"
  unit: string; // e.g., "m", "kg", "count", "pcs", "yard", "meter"
  quantity: number; // Stock quantity available
  costPerUnit: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// Feature 3: Product Recipe - Fabric Component
export interface FabricComponent {
  fabricId: string; // Reference to inventory fabric
  fabricName?: string; // For display
  pricePerKg: number; // From inventory
  gramsUsed: number; // Consumption in grams
  fabricCost?: number; // Computed: (pricePerKg / 1000) * gramsUsed
}

// Feature 3: Product Recipe - Accessory Component
export interface AccessoryComponent {
  accessoryId: string;
  accessoryName?: string; // For display
  costPerUnit: number; // From AccessoryItem
  quantity: number; // Quantity per product
  accessoryCost?: number; // Computed: costPerUnit * quantity
}

// Feature 3: Advanced Product Recipe/Definition
export interface ProductDefinition {
  id?: string;
  productName: string;
  productCode?: string;
  fabricComponent: FabricComponent;
  accessories: AccessoryComponent[]; // Dynamic list
  pieceworkLabor: number; // Specific price paid to seamstress for this model
  totalUnitCost?: number; // Computed: fabricCost + sum(accessoriesCost) + pieceworkLabor
  sellingPrice?: number; // Optional: for profit calculation
  createdAt?: Date;
  updatedAt?: Date;
}

// Production Run Status Types
export type ProductionStatus =
  | 'pending'
  | 'in_progress'
  | 'quality_check'
  | 'packaged'
  | 'ready_for_delivery'
  | 'delivered'
  | 'completed'
  | 'reproduction'
  | 'cancelled';

// Feature 4: Production Run
export interface ProductionRun {
  id?: string;
  productId: string;
  productName?: string; // For display
  productDefinition?: ProductDefinition; // Full recipe details
  quantity: number; // Number of items produced
  quantityFinished?: number; // Number of items finished
  sellingPricePerUnit: number;
  totalUnitCost?: number; // From ProductDefinition
  grossProfit?: number; // Computed: (sellingPricePerUnit - totalUnitCost) * quantity
  startDate: Date; // When production starts
  productionDate: Date; // Target completion date
  finishedDate?: Date; // When production is actually completed
  status?: ProductionStatus; // Production status
  statusNotes?: string; // Notes about status changes
  month?: number; // For grouping by month
  year?: number; // For grouping by year
  createdAt?: Date;
  updatedAt?: Date;
}

// Feature 4: Monthly Analytics Summary
export interface MonthlyAnalytics {
  month: number;
  year: number;
  totalGrossProfitFromSales: number; // Sum of all ProductionRun grossProfit
  totalMonthlyOverhead: number; // From MonthlyExpenseReport
  monthlyNetProfit: number; // Computed: totalGrossProfitFromSales - totalMonthlyOverhead
  numberOfProductions: number;
  totalItemsProduced: number;
}

// Dashboard Summary View
export interface DashboardSummary {
  currentMonth: number;
  currentYear: number;
  monthlyAnalytics: MonthlyAnalytics;
  recentProductions: ProductionRun[];
  topProducts: { productName: string; totalProduced: number; totalProfit: number }[];
}

// Inventory Item (Reference for fabric selection)
export interface InventoryFabric {
  id?: string;
  _id?: string;
  name: string; // e.g., "Premium Cotton", "Silk Blend"
  type: string; // e.g., "Cotton", "Polyester", "Wool", "Silk", "Blend"
  color: string; // e.g., "White", "Black", "Navy Blue"
  gsm: number; // Grams per square meter (fabric weight/thickness)
  pricePerKg: number; // Price per kilogram in AMD
  availableKg: number; // Current stock in kilograms
  minStockLevel?: number; // Minimum stock level for reorder alerts
  supplier?: string; // Supplier name
  notes?: string; // Additional notes
  createdAt?: Date;
  updatedAt?: Date;
}

// Fabric Inventory History (Track all changes to inventory)
export type InventoryChangeType = 'initial_stock' | 'restock' | 'waste' | 'waste_return' | 'production_use' | 'adjustment' | 'update' | 'delete';

export interface FabricInventoryHistory {
  id?: string;
  fabricId: string;
  fabricName?: string; // For display
  changeType: InventoryChangeType;
  quantityChange: number; // Positive for additions, negative for deductions
  quantityBefore: number; // Stock before change
  quantityAfter: number; // Stock after change
  reason?: string; // Additional notes/reason for change
  relatedEntryId?: string; // Link to original entry (e.g., waste return links to waste entry)
  createdAt?: Date;
  createdBy?: string; // User who made the change (for backend integration)
}
