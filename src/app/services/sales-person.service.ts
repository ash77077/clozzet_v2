import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { SalesPerson, CreateSalesPersonDto } from '../models/sales-person.model';

@Injectable({
  providedIn: 'root'
})
export class SalesPersonService {
  private API_URL = environment.apiUrl || 'http://localhost:3000';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  /**
   * Get all active sales persons
   */
  getAllSalesPersons(includeInactive: boolean = false): Observable<SalesPerson[]> {
    const url = includeInactive
      ? `${this.API_URL}/api/sales-persons?includeInactive=true`
      : `${this.API_URL}/api/sales-persons`;

    return this.http.get<SalesPerson[]>(url, { headers: this.getHeaders() });
  }

  /**
   * Search sales persons by name (for autocomplete)
   */
  searchSalesPersons(query: string): Observable<SalesPerson[]> {
    return this.http.get<SalesPerson[]>(
      `${this.API_URL}/api/sales-persons/search?q=${encodeURIComponent(query)}`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Get a specific sales person by ID
   */
  getSalesPersonById(id: string): Observable<SalesPerson> {
    return this.http.get<SalesPerson>(
      `${this.API_URL}/api/sales-persons/${id}`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Create a new sales person
   */
  createSalesPerson(data: CreateSalesPersonDto): Observable<SalesPerson> {
    return this.http.post<SalesPerson>(
      `${this.API_URL}/api/sales-persons`,
      data,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Update an existing sales person
   */
  updateSalesPerson(id: string, data: Partial<CreateSalesPersonDto>): Observable<SalesPerson> {
    return this.http.put<SalesPerson>(
      `${this.API_URL}/api/sales-persons/${id}`,
      data,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Delete a sales person
   */
  deleteSalesPerson(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.API_URL}/api/sales-persons/${id}`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Deactivate a sales person
   */
  deactivateSalesPerson(id: string): Observable<SalesPerson> {
    return this.http.put<SalesPerson>(
      `${this.API_URL}/api/sales-persons/${id}/deactivate`,
      {},
      { headers: this.getHeaders() }
    );
  }

  /**
   * Activate a sales person
   */
  activateSalesPerson(id: string): Observable<SalesPerson> {
    return this.http.put<SalesPerson>(
      `${this.API_URL}/api/sales-persons/${id}/activate`,
      {},
      { headers: this.getHeaders() }
    );
  }
}
