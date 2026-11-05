import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface FabricType {
  _id: string;
  nameArm: string;
  nameEng: string;
  unit: 'm' | 'kg';
  composition?: string;
  densityGsm?: number;
  widthCm?: number;
  pricePerUnitAmd?: number;
  notes?: string;
  isActive: boolean;
  createdAt?: string;
  // Virtual: colors loaded separately
  colors?: import('./fabric-colors.service').FabricColor[];
}

@Injectable({ providedIn: 'root' })
export class FabricTypesService {
  private base = `${environment.apiUrl}/fabric-types`;

  constructor(private http: HttpClient) {}

  getActive(): Observable<FabricType[]> {
    return this.http.get<FabricType[]>(this.base);
  }

  getAll(): Observable<FabricType[]> {
    return this.http.get<FabricType[]>(`${this.base}/all`);
  }

  create(dto: Partial<FabricType>): Observable<FabricType> {
    return this.http.post<FabricType>(this.base, dto);
  }

  update(id: string, dto: Partial<FabricType>): Observable<FabricType> {
    return this.http.patch<FabricType>(`${this.base}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
