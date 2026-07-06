import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Meeting, CreateMeetingDto } from '../models/meeting.model';

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class MeetingsService {
  private apiUrl = `${environment.apiUrl}/meetings`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Meeting[]> {
    return this.http.get<ApiResponse<Meeting[]>>(this.apiUrl).pipe(map(r => r.data));
  }

  create(dto: CreateMeetingDto): Observable<Meeting> {
    return this.http.post<ApiResponse<Meeting>>(this.apiUrl, dto).pipe(map(r => r.data));
  }

  update(id: string, dto: Partial<CreateMeetingDto>): Observable<Meeting> {
    return this.http.patch<ApiResponse<Meeting>>(`${this.apiUrl}/${id}`, dto).pipe(map(r => r.data));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
