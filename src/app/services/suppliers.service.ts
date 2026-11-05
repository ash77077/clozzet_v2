import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Supplier {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  isActive: boolean;
  createdAt?: string;
}

@Injectable({ providedIn: 'root' })
export class SuppliersService {
  private base = `${environment.apiUrl}/suppliers`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Supplier[]> {
    return this.http.get<Supplier[]>(this.base);
  }

  create(dto: Partial<Supplier>): Observable<Supplier> {
    return this.http.post<Supplier>(this.base, dto);
  }

  update(id: string, dto: Partial<Supplier>): Observable<Supplier> {
    return this.http.patch<Supplier>(`${this.base}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
