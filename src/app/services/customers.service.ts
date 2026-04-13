import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Customer, CreateCustomerDto, UpdateCustomerDto, CustomerStatus } from '../models/customer.model';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class CustomersService {
  private apiUrl = `${environment.apiUrl}/customers`;

  constructor(private http: HttpClient) {}

  create(dto: CreateCustomerDto): Observable<Customer> {
    return this.http.post<ApiResponse<Customer>>(this.apiUrl, dto).pipe(
      map(response => response.data)
    );
  }

  getAll(): Observable<Customer[]> {
    return this.http.get<ApiResponse<Customer[]>>(this.apiUrl).pipe(
      map(response => response.data)
    );
  }

  getById(id: string): Observable<Customer> {
    return this.http.get<ApiResponse<Customer>>(`${this.apiUrl}/${id}`).pipe(
      map(response => response.data)
    );
  }

  getByStatus(status: CustomerStatus): Observable<Customer[]> {
    return this.http.get<ApiResponse<Customer[]>>(`${this.apiUrl}/status/${status}`).pipe(
      map(response => response.data)
    );
  }

  getNeedingFollowUp(): Observable<Customer[]> {
    return this.http.get<ApiResponse<Customer[]>>(`${this.apiUrl}/follow-ups/pending`).pipe(
      map(response => response.data)
    );
  }

  update(id: string, dto: UpdateCustomerDto): Observable<Customer> {
    return this.http.put<ApiResponse<Customer>>(`${this.apiUrl}/${id}`, dto).pipe(
      map(response => response.data)
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<ApiResponse<null>>(`${this.apiUrl}/${id}`).pipe(
      map(() => undefined)
    );
  }

  validateExcelImport(formData: FormData): Observable<any> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/import/excel/validate`, formData);
  }

  importFromExcel(formData: FormData): Observable<any> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/import/excel`, formData);
  }
}
