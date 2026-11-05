import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ClothType {
  _id: string;
  nameArm: string;
  nameEng: string;
  sortOrder: number;
  defaultWastePercent?: number;
  isActive: boolean;
  createdAt?: string;
}

@Injectable({ providedIn: 'root' })
export class ClothTypesService {
  private base = `${environment.apiUrl}/cloth-types`;

  constructor(private http: HttpClient) {}

  getActive(): Observable<ClothType[]> {
    return this.http.get<ClothType[]>(this.base);
  }

  getAll(): Observable<ClothType[]> {
    return this.http.get<ClothType[]>(`${this.base}/all`);
  }

  create(dto: Partial<ClothType>): Observable<ClothType> {
    return this.http.post<ClothType>(this.base, dto);
  }

  update(id: string, dto: Partial<ClothType>): Observable<ClothType> {
    return this.http.patch<ClothType>(`${this.base}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
