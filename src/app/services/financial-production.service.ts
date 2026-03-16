import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  MonthlyExpenseReport,
  AccessoryItem,
  ProductDefinition,
  ProductionRun,
  MonthlyAnalytics,
  DashboardSummary,
  InventoryFabric,
  FabricInventoryHistory,
  ProductionStatus
} from '../models/financial-production.model';

@Injectable({
  providedIn: 'root'
})
export class FinancialProductionService {
  private apiUrl = `${environment.apiUrl}/api/financial-production`;

  // State Signals
  private monthlyExpenseReports = signal<MonthlyExpenseReport[]>([]);
  private accessoryItems = signal<AccessoryItem[]>([]);
  private productDefinitions = signal<ProductDefinition[]>([]);
  private productionRuns = signal<ProductionRun[]>([]);
  private inventoryFabrics = signal<InventoryFabric[]>([]);
  private fabricInventoryHistory = signal<FabricInventoryHistory[]>([]);

  // Computed Signals
  readonly monthlyExpenseReports$ = this.monthlyExpenseReports.asReadonly();
  readonly accessoryItems$ = this.accessoryItems.asReadonly();
  readonly productDefinitions$ = this.productDefinitions.asReadonly();
  readonly productionRuns$ = this.productionRuns.asReadonly();
  readonly inventoryFabrics$ = this.inventoryFabrics.asReadonly();
  readonly fabricInventoryHistory$ = this.fabricInventoryHistory.asReadonly();

  // Computed: Current Month Analytics
  readonly currentMonthAnalytics = computed(() => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    return this.calculateMonthlyAnalytics(currentMonth, currentYear);
  });

  constructor(private http: HttpClient) {
    this.loadAllData();
  }

  private async loadAllData(): Promise<void> {
    try {
      await Promise.all([
        this.loadMonthlyExpenses(),
        this.loadAccessories(),
        this.loadProductDefinitions(),
        this.loadProductionRuns(),
        this.loadFabrics(),
        this.loadFabricHistory(),
      ]);
    } catch (error) {
      console.error('Error loading financial production data:', error);
    }
  }

  // ==================== MONTHLY EXPENSE REPORTS ====================

  private async loadMonthlyExpenses(): Promise<void> {
    try {
      const response: any = await firstValueFrom(
        this.http.get(`${this.apiUrl}/monthly-expenses`)
      );
      if (response.success) {
        this.monthlyExpenseReports.set(response.data);
      }
    } catch (error) {
      console.error('Error loading monthly expenses:', error);
    }
  }

  async addMonthlyExpenseReport(report: MonthlyExpenseReport): Promise<void> {
    try {
      const response: any = await firstValueFrom(
        this.http.post(`${this.apiUrl}/monthly-expenses`, report)
      );
      if (response.success) {
        await this.loadMonthlyExpenses();
      }
    } catch (error) {
      console.error('Error adding monthly expense:', error);
      throw error;
    }
  }

  async updateMonthlyExpenseReport(id: string, report: Partial<MonthlyExpenseReport>): Promise<void> {
    try {
      const response: any = await firstValueFrom(
        this.http.put(`${this.apiUrl}/monthly-expenses/${id}`, report)
      );
      if (response.success) {
        await this.loadMonthlyExpenses();
      }
    } catch (error) {
      console.error('Error updating monthly expense:', error);
      throw error;
    }
  }

  async deleteMonthlyExpenseReport(id: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.delete(`${this.apiUrl}/monthly-expenses/${id}`)
      );
      await this.loadMonthlyExpenses();
    } catch (error) {
      console.error('Error deleting monthly expense:', error);
      throw error;
    }
  }

  // ==================== ACCESSORY ITEMS ====================

  private async loadAccessories(): Promise<void> {
    try {
      const response: any = await firstValueFrom(
        this.http.get(`${this.apiUrl}/accessories`)
      );
      if (response.success) {
        this.accessoryItems.set(response.data);
      }
    } catch (error) {
      console.error('Error loading accessories:', error);
    }
  }

  async addAccessoryItem(item: AccessoryItem): Promise<void> {
    try {
      const response: any = await firstValueFrom(
        this.http.post(`${this.apiUrl}/accessories`, item)
      );
      if (response.success) {
        await this.loadAccessories();
      }
    } catch (error) {
      console.error('Error adding accessory:', error);
      throw error;
    }
  }

  async updateAccessoryItem(id: string, item: Partial<AccessoryItem>): Promise<void> {
    try {
      const response: any = await firstValueFrom(
        this.http.put(`${this.apiUrl}/accessories/${id}`, item)
      );
      if (response.success) {
        await this.loadAccessories();
      }
    } catch (error) {
      console.error('Error updating accessory:', error);
      throw error;
    }
  }

  async deleteAccessoryItem(id: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.delete(`${this.apiUrl}/accessories/${id}`)
      );
      await this.loadAccessories();
    } catch (error) {
      console.error('Error deleting accessory:', error);
      throw error;
    }
  }

  getAccessoryItem(id: string): AccessoryItem | undefined {
    return this.accessoryItems().find(item => item.id === id);
  }

  // ==================== PRODUCT DEFINITIONS ====================

  private async loadProductDefinitions(): Promise<void> {
    try {
      const response: any = await firstValueFrom(
        this.http.get(`${this.apiUrl}/product-definitions`)
      );
      if (response.success) {
        this.productDefinitions.set(response.data);
      }
    } catch (error) {
      console.error('Error loading product definitions:', error);
    }
  }

  async addProductDefinition(product: ProductDefinition): Promise<void> {
    try {
      const response: any = await firstValueFrom(
        this.http.post(`${this.apiUrl}/product-definitions`, product)
      );
      if (response.success) {
        await this.loadProductDefinitions();
      }
    } catch (error) {
      console.error('Error adding product definition:', error);
      throw error;
    }
  }

  async updateProductDefinition(id: string, product: Partial<ProductDefinition>): Promise<void> {
    try {
      const response: any = await firstValueFrom(
        this.http.put(`${this.apiUrl}/product-definitions/${id}`, product)
      );
      if (response.success) {
        await this.loadProductDefinitions();
      }
    } catch (error) {
      console.error('Error updating product definition:', error);
      throw error;
    }
  }

  async deleteProductDefinition(id: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.delete(`${this.apiUrl}/product-definitions/${id}`)
      );
      await this.loadProductDefinitions();
    } catch (error) {
      console.error('Error deleting product definition:', error);
      throw error;
    }
  }

  getProductDefinition(id: string): ProductDefinition | undefined {
    return this.productDefinitions().find(p => p.id === id);
  }

  // ==================== PRODUCTION RUNS ====================

  private async loadProductionRuns(): Promise<void> {
    try {
      const response: any = await firstValueFrom(
        this.http.get(`${this.apiUrl}/production-runs`)
      );
      if (response.success) {
        this.productionRuns.set(response.data);
      }
    } catch (error) {
      console.error('Error loading production runs:', error);
    }
  }

  async addProductionRun(production: ProductionRun): Promise<void> {
    try {
      const response: any = await firstValueFrom(
        this.http.post(`${this.apiUrl}/production-runs`, production)
      );
      if (response.success) {
        await this.loadProductionRuns();
        await this.loadFabrics();
        await this.loadAccessories();
        await this.loadFabricHistory();
      }
    } catch (error) {
      console.error('Error adding production run:', error);
      throw error;
    }
  }

  async updateProductionStatus(
    id: string,
    status: ProductionStatus,
    quantityFinished: number,
    statusNotes?: string,
    finishedDate?: Date
  ): Promise<void> {
    try {
      const response: any = await firstValueFrom(
        this.http.put(`${this.apiUrl}/production-runs/${id}/status`, {
          status,
          quantityFinished,
          statusNotes,
        })
      );
      if (response.success) {
        await this.loadProductionRuns();
      }
    } catch (error) {
      console.error('Error updating production status:', error);
      throw error;
    }
  }

  async deleteProductionRun(id: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.delete(`${this.apiUrl}/production-runs/${id}`)
      );
      await this.loadProductionRuns();
    } catch (error) {
      console.error('Error deleting production run:', error);
      throw error;
    }
  }

  getProductionRun(id: string): ProductionRun | undefined {
    return this.productionRuns().find(r => r.id === id);
  }

  // ==================== INVENTORY FABRICS ====================

  private async loadFabrics(): Promise<void> {
    try {
      const response: any = await firstValueFrom(
        this.http.get(`${this.apiUrl}/fabrics`)
      );
      if (response.success) {
        this.inventoryFabrics.set(response.data);
      }
    } catch (error) {
      console.error('Error loading fabrics:', error);
    }
  }

  async addInventoryFabric(fabric: InventoryFabric): Promise<void> {
    try {
      const response: any = await firstValueFrom(
        this.http.post(`${this.apiUrl}/fabrics`, fabric)
      );
      if (response.success) {
        await this.loadFabrics();
        await this.loadFabricHistory();
      }
    } catch (error) {
      console.error('Error adding fabric:', error);
      throw error;
    }
  }

  async updateInventoryFabric(id: string, fabric: Partial<InventoryFabric>): Promise<void> {
    try {
      const response: any = await firstValueFrom(
        this.http.put(`${this.apiUrl}/fabrics/${id}`, fabric)
      );
      if (response.success) {
        await this.loadFabrics();
      }
    } catch (error) {
      console.error('Error updating fabric:', error);
      throw error;
    }
  }

  async deleteInventoryFabric(id: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.delete(`${this.apiUrl}/fabrics/${id}`)
      );
      await this.loadFabrics();
    } catch (error) {
      console.error('Error deleting fabric:', error);
      throw error;
    }
  }

  getInventoryFabric(id: string): InventoryFabric | undefined {
    return this.inventoryFabrics().find(f => f.id === id);
  }

  getLowStockFabrics(): InventoryFabric[] {
    return this.inventoryFabrics().filter(
      f => f.minStockLevel && f.availableKg < f.minStockLevel
    );
  }

  getTotalInventoryValue(): number {
    return this.inventoryFabrics().reduce(
      (total, fabric) => total + (fabric.availableKg * fabric.pricePerKg),
      0
    );
  }

  // ==================== FABRIC HISTORY ====================

  private async loadFabricHistory(): Promise<void> {
    try {
      const response: any = await firstValueFrom(
        this.http.get(`${this.apiUrl}/fabrics-history`)
      );
      if (response.success) {
        this.fabricInventoryHistory.set(response.data);
      }
    } catch (error) {
      console.error('Error loading fabric history:', error);
    }
  }

  async recordWaste(fabricId: string, wasteKg: number, reason?: string): Promise<void> {
    try {
      const response: any = await firstValueFrom(
        this.http.post(`${this.apiUrl}/fabrics/${fabricId}/waste`, {
          wasteKg,
          reason,
        })
      );
      if (response.success) {
        await this.loadFabrics();
        await this.loadFabricHistory();
      }
    } catch (error) {
      console.error('Error recording waste:', error);
      throw error;
    }
  }

  async returnWaste(entryId: string, reason?: string): Promise<void> {
    try {
      const response: any = await firstValueFrom(
        this.http.post(`${this.apiUrl}/fabrics/waste/${entryId}/return`, {
          reason,
        })
      );
      if (response.success) {
        await this.loadFabrics();
        await this.loadFabricHistory();
      }
    } catch (error) {
      console.error('Error returning waste:', error);
      throw error;
    }
  }

  async restockFabric(fabricId: string, restockKg: number, reason?: string): Promise<void> {
    try {
      const response: any = await firstValueFrom(
        this.http.post(`${this.apiUrl}/fabrics/${fabricId}/restock`, {
          restockKg,
          reason,
        })
      );
      if (response.success) {
        await this.loadFabrics();
        await this.loadFabricHistory();
      }
    } catch (error) {
      console.error('Error restocking fabric:', error);
      throw error;
    }
  }

  isWasteReturned(entryId: string): boolean {
    return this.fabricInventoryHistory().some(
      entry => entry.relatedEntryId === entryId && entry.changeType === 'waste_return'
    );
  }

  getTotalWaste(fabricId: string): number {
    return this.fabricInventoryHistory()
      .filter(entry => entry.fabricId === fabricId && entry.changeType === 'waste')
      .reduce((total, entry) => total + Math.abs(entry.quantityChange), 0);
  }

  getTotalWasteAllFabrics(): number {
    return this.fabricInventoryHistory()
      .filter(entry => entry.changeType === 'waste')
      .reduce((total, entry) => total + Math.abs(entry.quantityChange), 0);
  }

  // ==================== ANALYTICS ====================

  calculateMonthlyAnalytics(month: number, year: number): MonthlyAnalytics {
    const runs = this.productionRuns().filter(
      r => r.month === month && r.year === year
    );

    const totalGrossProfitFromSales = runs.reduce(
      (sum, r) => sum + (r.grossProfit || 0),
      0
    );

    const expenseReport = this.monthlyExpenseReports().find(
      e => e.month === month && e.year === year
    );

    const totalMonthlyOverhead = expenseReport?.totalOverhead || 0;

    return {
      month,
      year,
      totalGrossProfitFromSales,
      totalMonthlyOverhead,
      monthlyNetProfit: totalGrossProfitFromSales - totalMonthlyOverhead,
      numberOfProductions: runs.length,
      totalItemsProduced: runs.reduce((sum, r) => sum + r.quantity, 0),
    };
  }

  getDashboardSummary(): DashboardSummary {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const monthlyAnalytics = this.calculateMonthlyAnalytics(currentMonth, currentYear);

    const recentProductions = [...this.productionRuns()]
      .sort((a, b) => new Date(b.productionDate).getTime() - new Date(a.productionDate).getTime())
      .slice(0, 5);

    const productStats = new Map<string, { totalProduced: number; totalProfit: number }>();

    this.productionRuns().forEach(run => {
      const key = run.productName || 'Unknown';
      const existing = productStats.get(key) || { totalProduced: 0, totalProfit: 0 };
      productStats.set(key, {
        totalProduced: existing.totalProduced + run.quantity,
        totalProfit: existing.totalProfit + (run.grossProfit || 0),
      });
    });

    const topProducts = Array.from(productStats.entries())
      .map(([productName, stats]) => ({ productName, ...stats }))
      .sort((a, b) => b.totalProfit - a.totalProfit)
      .slice(0, 5);

    return {
      currentMonth,
      currentYear,
      monthlyAnalytics,
      recentProductions,
      topProducts,
    };
  }

  getMonthlyExpenseReport(month: number, year: number): MonthlyExpenseReport | undefined {
    return this.monthlyExpenseReports().find(
      e => e.month === month && e.year === year
    );
  }
}
