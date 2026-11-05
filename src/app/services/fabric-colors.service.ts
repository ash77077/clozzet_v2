import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface FabricColor {
  _id: string;
  fabricTypeId: string;
  nameArm: string;
  nameEng?: string;
  hex?: string;
  isActive: boolean;
  createdAt?: string;
}

@Injectable({ providedIn: 'root' })
export class FabricColorsService {
  private base = `${environment.apiUrl}/fabric-colors`;

  constructor(private http: HttpClient) {}

  getByFabric(fabricTypeId: string): Observable<FabricColor[]> {
    return this.http.get<FabricColor[]>(`${this.base}?fabricTypeId=${fabricTypeId}`);
  }

  getByFabricAdmin(fabricTypeId: string): Observable<FabricColor[]> {
    return this.http.get<FabricColor[]>(`${this.base}/admin?fabricTypeId=${fabricTypeId}`);
  }

  create(dto: Partial<FabricColor>): Observable<FabricColor> {
    return this.http.post<FabricColor>(this.base, dto);
  }

  update(id: string, dto: Partial<FabricColor>): Observable<FabricColor> {
    return this.http.patch<FabricColor>(`${this.base}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  seedDefaults(fabricTypeId: string): Observable<{ created: number; skipped: number }> {
    return this.http.post<{ created: number; skipped: number }>(`${this.base}/seed-defaults/${fabricTypeId}`, {});
  }
}
