import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ExpoStockItem {
  type: string;
  color: string;
  size: string;
  quantity: number;
  soldQuantity: number;
  costPrice: number;
  sellPrice: number;
}

export interface ExpoSaleRecord {
  _id?: string;
  type: string;
  color: string;
  size: string;
  quantity: number;
  soldPrice: number;
  soldAt: Date;
  isReturn: boolean;
}

export interface ExpoStock {
  id?: string;
  _id?: string;
  name: string;
  description: string;
  status: 'active' | 'closed';
  items: ExpoStockItem[];
  sales: ExpoSaleRecord[];
  closedAt?: Date | null;
  createdAt?: Date;
}

export interface ExpoSummary {
  totalStock: number;
  totalSold: number;
  totalRemaining: number;
  revenue: number;
  profit: number;
}

export interface CartLine {
  type: string;
  color: string;
  size: string;
  quantity: number;
  soldPrice: number;
}

@Injectable({ providedIn: 'root' })
export class ExpoSalesService {
  private base = `${environment.apiUrl}/expo-sales`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ExpoStock[]> {
    return this.http.get<ExpoStock[]>(this.base);
  }

  getOne(id: string): Observable<ExpoStock> {
    return this.http.get<ExpoStock>(`${this.base}/${id}`);
  }

  getSummary(id: string): Observable<ExpoSummary> {
    return this.http.get<ExpoSummary>(`${this.base}/${id}/summary`);
  }

  create(data: { name: string; description?: string }): Observable<ExpoStock> {
    return this.http.post<ExpoStock>(this.base, data);
  }

  addItems(id: string, items: Partial<ExpoStockItem>[]): Observable<ExpoStock> {
    return this.http.post<ExpoStock>(`${this.base}/${id}/items`, { items });
  }

  updateItem(id: string, index: number, patch: Partial<ExpoStockItem>): Observable<ExpoStock> {
    return this.http.patch<ExpoStock>(`${this.base}/${id}/items/${index}`, patch);
  }

  removeItem(id: string, index: number): Observable<ExpoStock> {
    return this.http.delete<ExpoStock>(`${this.base}/${id}/items/${index}`);
  }

  sellCart(id: string, items: CartLine[]): Observable<ExpoStock> {
    return this.http.post<ExpoStock>(`${this.base}/${id}/sell`, { items });
  }

  returnSale(expoId: string, saleId: string, quantity?: number): Observable<ExpoStock> {
    return this.http.post<ExpoStock>(`${this.base}/${expoId}/return-sale/${saleId}`, quantity ? { quantity } : {});
  }

  importFromExpo(id: string, sourceExpoId: string): Observable<ExpoStock> {
    return this.http.post<ExpoStock>(`${this.base}/${id}/import`, { sourceExpoId });
  }

  closeExpo(id: string, returnUnsold: boolean): Observable<ExpoStock> {
    return this.http.post<ExpoStock>(`${this.base}/${id}/close`, { returnUnsold });
  }

  reopen(id: string): Observable<ExpoStock> {
    return this.http.post<ExpoStock>(`${this.base}/${id}/reopen`, {});
  }

  deleteExpo(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
