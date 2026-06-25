import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface WeddingGuest {
  _id: string;
  name: string;
  attending: 'yes' | 'no' | 'maybe';
  guestCount: number;
  message?: string;
  createdAt: string;
}

export interface WeddingGuestStats {
  totalResponses: number;
  attending: number;
  notAttending: number;
  maybe: number;
  totalGuests: number;
}

@Injectable({ providedIn: 'root' })
export class WeddingGuestsService {
  private base = `${environment.apiUrl}/wedding-guests`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<WeddingGuest[]> {
    return this.http.get<WeddingGuest[]>(this.base);
  }

  getStats(): Observable<WeddingGuestStats> {
    return this.http.get<WeddingGuestStats>(`${this.base}/stats`);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
