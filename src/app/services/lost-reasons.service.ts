import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LostReason {
  _id: string;
  key: string;
  nameHy: string;
  nameEn: string;
  requiresComment: boolean;
  isActive: boolean;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateLostReasonPayload {
  key: string;
  nameHy: string;
  nameEn: string;
  requiresComment?: boolean;
  isActive?: boolean;
  order?: number;
}

export interface UpdateLostReasonPayload {
  nameHy?: string;
  nameEn?: string;
  requiresComment?: boolean;
  isActive?: boolean;
  order?: number;
}

@Injectable({ providedIn: 'root' })
export class LostReasonsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/lost-reasons`;

  getAll(): Observable<LostReason[]> {
    return this.http.get<LostReason[]>(this.base);
  }

  create(dto: CreateLostReasonPayload): Observable<LostReason> {
    return this.http.post<LostReason>(this.base, dto);
  }

  update(id: string, dto: UpdateLostReasonPayload): Observable<LostReason> {
    return this.http.patch<LostReason>(`${this.base}/${id}`, dto);
  }
}
