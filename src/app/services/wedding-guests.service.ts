import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface WeddingGuest {
  id: string;
  name: string;
  attending: string;
  drinks: string;
  music: string;
  submittedAt: string;
  createdAt: string;
}

export interface WeddingGuestStats {
  total: number;
  attending: number;
  notAttending: number;
  pending: number;
}

@Injectable({ providedIn: 'root' })
export class WeddingGuestsService {
  private url = `${environment.apiUrl}/wedding-guests`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<WeddingGuest[]> {
    return this.http.get<WeddingGuest[]>(this.url);
  }

  getStats(): Observable<WeddingGuestStats> {
    return this.http.get<WeddingGuestStats>(`${this.url}/stats`);
  }
}
