import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface GlobalSettings {
  key: string;
  fabricWastePercent: number;
  turnoverTaxPercent: number;
  lowStockThreshold?: number;
  quoteDefaultPrepaymentPercent?: number;
  quoteDefaultValidityDays?: number;
  quoteDefaultLeadTimeDays?: number;
  quoteDefaultDeliveryTerms?: string;
  quoteDefaultTermsText?: string;
}

@Injectable({ providedIn: 'root' })
export class GlobalSettingsService {
  private base = `${environment.apiUrl}/global-settings`;

  constructor(private http: HttpClient) {}

  get(): Observable<GlobalSettings> {
    return this.http.get<GlobalSettings>(this.base);
  }

  update(dto: Partial<GlobalSettings>): Observable<GlobalSettings> {
    return this.http.patch<GlobalSettings>(this.base, dto);
  }
}
