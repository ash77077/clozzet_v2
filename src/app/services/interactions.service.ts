import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Interaction, CreateInteractionDto } from '../models/interaction.model';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class InteractionsService {
  private apiUrl = `${environment.apiUrl}/interactions`;

  constructor(private http: HttpClient) {}

  create(dto: CreateInteractionDto): Observable<Interaction> {
    return this.http.post<ApiResponse<Interaction>>(this.apiUrl, dto).pipe(
      map(response => response.data)
    );
  }

  getAll(): Observable<Interaction[]> {
    return this.http.get<ApiResponse<Interaction[]>>(this.apiUrl).pipe(
      map(response => response.data)
    );
  }

  getByCustomer(customerId: string): Observable<Interaction[]> {
    return this.http.get<ApiResponse<Interaction[]>>(`${this.apiUrl}/customer/${customerId}`).pipe(
      map(response => response.data)
    );
  }

  getPendingFollowUps(): Observable<Interaction[]> {
    return this.http.get<ApiResponse<Interaction[]>>(`${this.apiUrl}/follow-ups/pending`).pipe(
      map(response => response.data)
    );
  }

  getById(id: string): Observable<Interaction> {
    return this.http.get<ApiResponse<Interaction>>(`${this.apiUrl}/${id}`).pipe(
      map(response => response.data)
    );
  }

  update(id: string, updateData: any): Observable<Interaction> {
    return this.http.patch<ApiResponse<Interaction>>(`${this.apiUrl}/${id}`, updateData).pipe(
      map(response => response.data)
    );
  }

  markFollowUpCompleted(id: string): Observable<Interaction> {
    return this.http.patch<ApiResponse<Interaction>>(`${this.apiUrl}/${id}/complete`, {}).pipe(
      map(response => response.data)
    );
  }
}
