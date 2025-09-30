import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface QuoteRequest {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  productType: string;
  quantity: number;
  additionalServices: string[];
  message: string;
  budget: string;
  timeline: string;
}

export interface QuoteResponse {
  success: boolean;
  message: string;
  quoteId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class QuoteService {
  private readonly API_URL = environment.apiUrl || 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  submitQuote(quoteData: QuoteRequest): Observable<QuoteResponse> {
    return this.http.post<QuoteResponse>(`${this.API_URL}/quotes`, quoteData);
  }
}