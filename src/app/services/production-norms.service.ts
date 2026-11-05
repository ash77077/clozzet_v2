import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ProductionNorm {
  _id: string;
  clothTypeId: string;
  name: string;
  quantity: number;
  unit: string;
  unitCostAmd: number;
  notes?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
}

export const PRODUCTION_NORM_UNITS = [
  { label: 'հտ (հատ)', value: 'հտ' },
  { label: 'մ (մետր)', value: 'մ' },
  { label: 'սմ (սանտիմետր)', value: 'սմ' },
  { label: 'կգ (կիլոգրամ)', value: 'կգ' },
  { label: 'գ (գրամ)', value: 'գ' },
  { label: 'հ/ք (հոլ/կտոր)', value: 'հ/ք' },
  { label: 'կոմ (կոմպլեկտ)', value: 'կոմ' },
];

@Injectable({ providedIn: 'root' })
export class ProductionNormsService {
  private base = `${environment.apiUrl}/production-norms`;

  constructor(private http: HttpClient) {}

  getByClothTypeAdmin(clothTypeId: string): Observable<ProductionNorm[]> {
    const params = new HttpParams().set('clothTypeId', clothTypeId);
    return this.http.get<ProductionNorm[]>(`${this.base}/admin`, { params });
  }

  create(dto: Partial<ProductionNorm>): Observable<ProductionNorm> {
    return this.http.post<ProductionNorm>(this.base, dto);
  }

  update(id: string, dto: Partial<ProductionNorm>): Observable<ProductionNorm> {
    return this.http.patch<ProductionNorm>(`${this.base}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
