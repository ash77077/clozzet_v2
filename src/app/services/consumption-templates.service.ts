import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ConsumptionPerSize {
  XS?: number; S?: number; M?: number; L?: number;
  XL?: number; XXL?: number; XXXL?: number; XXXXL?: number;
  s1_2?: number; s3_4?: number; s5_6?: number; s7_8?: number;
  s9_10?: number; s11_12?: number; s13_14?: number; s15_16?: number;
}

export interface ConsumptionTemplate {
  _id: string;
  clothTypeId: string;
  fabricTypeId: string;
  fabricTypeName: string;
  fabricTypeUnit: string;
  adultNorm?: number;
  childNorm?: number;
  isDefault: boolean;
  consumptionPerSize: ConsumptionPerSize;
  isActive: boolean;
  createdAt?: string;
}

@Injectable({ providedIn: 'root' })
export class ConsumptionTemplatesService {
  private base = `${environment.apiUrl}/consumption-templates`;

  constructor(private http: HttpClient) {}

  getByClothType(clothTypeId: string): Observable<ConsumptionTemplate[]> {
    const params = new HttpParams().set('clothTypeId', clothTypeId);
    return this.http.get<ConsumptionTemplate[]>(this.base, { params });
  }

  getAll(): Observable<ConsumptionTemplate[]> {
    return this.http.get<ConsumptionTemplate[]>(`${this.base}/all`);
  }

  create(dto: Partial<ConsumptionTemplate>): Observable<ConsumptionTemplate> {
    return this.http.post<ConsumptionTemplate>(this.base, dto);
  }

  update(id: string, dto: Partial<ConsumptionTemplate>): Observable<ConsumptionTemplate> {
    return this.http.patch<ConsumptionTemplate>(`${this.base}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
