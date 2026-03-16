# Financial & Production Management Module

## Overview
A comprehensive Angular module for managing textile production costs, profitability, and analytics for Clozzet.

## Features Implemented

### 1. Monthly Overhead Settings (Feature 1)
**Location:** `/financial-production/monthly-expense`

**Interface:** `MonthlyExpenseReport`

**Functionality:**
- User selects Month/Year
- Input fields for Fixed Costs:
  - Rent (AMD)
  - Utilities (AMD)
  - Fixed Salaries (total for employees on fixed contracts)
  - Variable/Daily Labor Total (paid to daily-wage workers for that month)
- Auto-calculates Total Overhead
- CRUD operations for monthly expense reports
- Data is used to calculate Net Profit at the end of the month

**Formula:** `Total Overhead = Rent + Utilities + Fixed Salaries + Variable Daily Labor`

---

### 2. Accessories & Details Registry (Feature 2)
**Location:** `/financial-production/accessories`

**Interface:** `AccessoryItem`

**Functionality:**
- CRUD operations for accessory items
- Properties: id, name (e.g., "Gold Button", "Zipper"), costPerUnit
- Search functionality
- Card-based UI with visual feedback
- Real-time cost tracking

---

### 3. Advanced Product Recipe (Feature 3)
**Location:** `/financial-production/product-recipe`

**Interface:** `ProductDefinition`

**Core Logic - The Heart of the System:**

#### Fabric Component:
- Select fabric from inventory
- Input consumption in grams
- **Calculation:** `Fabric Cost = (Fabric Price Per Kg / 1000) × Grams Used`

#### Accessories:
- Dynamic list using FormArray
- User adds existing accessories
- Input quantity per product
- **Calculation:** `Accessory Cost = Accessory Cost Per Unit × Quantity`

#### Piecework Labor:
- Input specific price paid to seamstress for sewing this model

#### Computed Field:
**`Total Unit Cost = Fabric Cost + Accessories Cost + Piecework Labor`**

**Additional Features:**
- Optional selling price for profit margin calculation
- Profit per unit calculation
- Profit margin percentage
- View detailed product breakdowns
- Edit and delete products

---

### 4. Production Run & Analytics (Feature 4)
**Location:** `/financial-production/production-run`

**Interface:** `ProductionRun`

**Functionality:**
When user logs a "Production Run":
1. **Deducts from Inventory:**
   - Fabric (in kg) based on grams used × quantity
   - Accessories (count) based on quantity per product × quantity

2. **Calculates Gross Profit:**
   - `Gross Profit = (Selling Price - Total Unit Cost) × Quantity`

3. **Tracks Production:**
   - All productions are stored with date
   - Grouped by month/year for analytics

**Production History:**
- Complete list of all production runs
- Shows quantity, costs, revenue, and profit
- Delete functionality

---

### 5. Analytics Dashboard
**Location:** `/financial-production/dashboard`

**Interface:** `MonthlyAnalytics`, `DashboardSummary`

**Dashboard Views:**

#### Current Month Overview:
- Net Profit (color-coded: green for positive, red for negative)
- Gross Profit from Sales
- Total Overhead
- Number of Productions and Items Produced

#### Custom Period Analytics:
- Select any Month/Year
- View same metrics for that period

#### Recent Productions:
- Last 10 production runs
- Quick view of product, quantity, and profit

#### Top Products by Profit:
- Top 5 products ranked by total profit
- Shows units produced and total profit

#### Net Profit Formula Visualization:
**`Monthly Net Profit = Total Gross Profit from Sales - Total Monthly Overhead`**

Where:
- **Gross Profit** = (Selling Price - Total Unit Cost) × Quantity
- **Total Unit Cost** = Fabric Cost + Accessories Cost + Piecework Labor
- **Monthly Overhead** = Rent + Utilities + Fixed Salaries + Variable Daily Labor

---

## Technical Implementation

### Architecture:
- **State Management:** Angular Signals (reactive state)
- **Forms:** Reactive Forms with FormArray for dynamic accessories
- **Routing:** Lazy-loaded standalone components
- **Styling:** Component-scoped SCSS with responsive design

### Key Files:
```
src/app/
├── models/
│   └── financial-production.model.ts          # All TypeScript interfaces
├── services/
│   └── financial-production.service.ts        # Service with Signals
├── constants/
│   └── financial-production.constants.ts      # Shared constants (MONTHS)
└── financial-production/
    ├── dashboard/                              # Analytics Dashboard
    ├── monthly-expense/                        # Feature 1
    ├── accessories-registry/                   # Feature 2
    ├── product-recipe/                         # Feature 3
    ├── production-run/                         # Feature 4
    └── financial-production-routing.module.ts  # Routes
```

### Routes:
```
/financial-production/dashboard          - Main dashboard (default)
/financial-production/monthly-expense    - Monthly overhead settings
/financial-production/accessories        - Accessories registry
/financial-production/product-recipe     - Product definitions
/financial-production/production-run     - Production logging
```

---

## How to Use

### 1. Initial Setup:
1. **Add accessories** (Feature 2)
2. **Set up monthly expenses** (Feature 1) for the current month
3. **Create product recipes** (Feature 3) with fabric and accessories

### 2. Daily Operations:
1. **Log production runs** (Feature 4)
2. System automatically:
   - Deducts inventory
   - Calculates costs and profits
   - Updates analytics

### 3. Analytics:
1. **View dashboard** for real-time insights
2. **Compare different months** using custom period selector
3. **Track top products** and recent activity

---

## Mock Data

The service includes mock data for testing:
- 3 Fabric types (Cotton, Polyester, Wool)
- 3 Accessories (Gold Button, Zipper, Label Tag)

---

## Next Steps to Integrate:

1. **Connect to Backend:**
   - Replace service methods with HTTP calls
   - Add proper API endpoints

2. **Integrate with Existing Inventory:**
   - Connect fabric selection to your inventory system
   - Track accessory inventory

3. **Add Authentication:**
   - Protect routes with guards
   - Add user permissions

4. **Add Navigation:**
   - Include links in your main navigation
   - Add to sidebar/menu

5. **Enhance Features:**
   - Export reports to PDF/Excel
   - Charts and graphs for visualizations
   - Historical comparisons
   - Forecasting

---

## Build Status
✅ Successfully built and compiled
✅ All components are standalone
✅ Lazy-loaded for optimal performance

**Build Output:** `dist/clozzet_v2`

---

## Notes

- All calculations are done automatically in the service
- Data is stored in memory (replace with backend integration)
- Currency is in AMD (Armenian Dram)
- Responsive design works on mobile and desktop
- All components use Angular Signals for reactive state management