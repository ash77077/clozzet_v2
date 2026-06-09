import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { CustomerAiPayload, CustomerAiResult, ChatMessage } from '../models/ai.models';

@Injectable({ providedIn: 'root' })
export class AiService {
  private readonly STORAGE_KEY = 'crm_ai_enabled';
  private readonly cache = new Map<string, CustomerAiResult>();
  private readonly apiBase = environment.aiApiBase;

  aiEnabled$ = new BehaviorSubject<boolean>(
    localStorage.getItem(this.STORAGE_KEY) === 'true'
  );
  isAnalyzing$ = new BehaviorSubject<boolean>(false);

  constructor(private http: HttpClient) {}

  toggleAI(enabled: boolean): void {
    this.aiEnabled$.next(enabled);
    localStorage.setItem(this.STORAGE_KEY, String(enabled));
  }

  analyzeCustomer(customer: CustomerAiPayload): Observable<CustomerAiResult> {
    return this.http.post<CustomerAiResult>(`${this.apiBase}/analyze-customer`, {
      customer,
      reply_language: customer.reply_language,
    });
  }

  sendChatMessage(messages: ChatMessage[], customerContext?: any): Observable<string> {
    return this.http
      .post<{ reply: string }>(`${this.apiBase}/chat`, {
        messages,
        customer_context: customerContext ?? null,
      })
      .pipe(map(r => r.reply));
  }

  getCachedAnalysis(customerId: string): CustomerAiResult | null {
    return this.cache.get(customerId) ?? null;
  }

  setCachedAnalysis(customerId: string, result: CustomerAiResult): void {
    this.cache.set(customerId, result);
  }

  clearCache(): void {
    this.cache.clear();
  }
}
