import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface QuoteItem {
  itemId: string;
  garmentTypeId?: string;
  garmentTypeName?: string;
  fabricId?: string;
  fabricName?: string;
  colorId?: string;
  colorName?: string;
  description: string;
  decorationMethod?: string;
  logoPosition?: string;
  logoSize?: string;
  quantity: number;
  sizeBreakdown?: Record<string, any>;
  unitPrice: number;
  lineDiscountPercent?: number;
  lineTotal: number;
  imageUrl?: string;
  sortOrder: number;
  estimatedUnitCost?: number;
}

export interface Quote {
  _id: string;
  number: string;
  version: number;
  dealId: string;
  customerId: string;
  customerName?: string;
  contactPersonId?: string;
  contactName?: string;
  ownerId: string;
  ownerName: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'superseded';
  issueDate?: string;
  validUntil?: string;
  language: 'hy' | 'en';
  paymentType: 'cash' | 'invoice';
  prepaymentPercent: number;
  productionLeadTimeDays?: number;
  deliveryTerms?: string;
  notes?: string;
  termsText?: string;
  discountType: 'percent' | 'amount';
  discountValue: number;
  subtotal: number;
  discountTotal: number;
  total: number;
  items: QuoteItem[];
  estimatedCost?: number;
  estimatedMargin?: number;
  estimatedMarginPercent?: number;
  sentAt?: string;
  acceptedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  convertedOrderId?: string;
  pdfFileId?: string;
  createdBy: string;
  previousVersionId?: string;
  latestVersionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQuoteItemDto {
  itemId?: string;
  garmentTypeId?: string;
  garmentTypeName?: string;
  fabricId?: string;
  fabricName?: string;
  colorId?: string;
  colorName?: string;
  description: string;
  decorationMethod?: string;
  logoPosition?: string;
  logoSize?: string;
  quantity: number;
  sizeBreakdown?: Record<string, any>;
  unitPrice: number;
  lineDiscountPercent?: number;
  imageUrl?: string;
  sortOrder?: number;
  estimatedUnitCost?: number;
}

export interface CreateQuoteDto {
  dealId: string;
  customerId: string;
  contactPersonId?: string;
  language?: 'hy' | 'en';
  paymentType?: 'cash' | 'invoice';
  prepaymentPercent?: number;
  validityDays?: number;
  issueDate?: string;
  validUntil?: string;
  productionLeadTimeDays?: number;
  deliveryTerms?: string;
  notes?: string;
  termsText?: string;
  discountType?: 'percent' | 'amount';
  discountValue?: number;
  items?: CreateQuoteItemDto[];
}

export type UpdateQuoteDto = Partial<CreateQuoteDto>;

export interface QuoteFilters {
  dealId?: string;
  customerId?: string;
  status?: string;
  ownerId?: string;
}

@Injectable({ providedIn: 'root' })
export class QuoteService {
  private readonly base = `${environment.apiUrl}/quotes`;

  constructor(private http: HttpClient) {}

  findAll(filters: QuoteFilters = {}): Observable<Quote[]> {
    let params = new HttpParams();
    if (filters.dealId)     params = params.set('dealId',     filters.dealId);
    if (filters.customerId) params = params.set('customerId', filters.customerId);
    if (filters.status)     params = params.set('status',     filters.status);
    if (filters.ownerId)    params = params.set('ownerId',    filters.ownerId);
    return this.http.get<Quote[]>(this.base, { params });
  }

  findOne(id: string): Observable<Quote> {
    return this.http.get<Quote>(`${this.base}/${id}`);
  }

  create(dto: CreateQuoteDto): Observable<Quote> {
    return this.http.post<Quote>(this.base, dto);
  }

  update(id: string, dto: UpdateQuoteDto): Observable<Quote> {
    return this.http.patch<Quote>(`${this.base}/${id}`, dto);
  }

  send(id: string): Observable<Quote> {
    return this.http.post<Quote>(`${this.base}/${id}/send`, {});
  }

  createNewVersion(id: string): Observable<Quote> {
    return this.http.post<Quote>(`${this.base}/${id}/new-version`, {});
  }

  markAccepted(id: string): Observable<Quote> {
    return this.http.post<Quote>(`${this.base}/${id}/accept`, {});
  }

  markRejected(id: string, reason?: string): Observable<Quote> {
    return this.http.post<Quote>(`${this.base}/${id}/reject`, { reason });
  }

  convertToOrder(id: string): Observable<{ order: any; quote: Quote; deal: any }> {
    return this.http.post<{ order: any; quote: Quote; deal: any }>(`${this.base}/${id}/convert-to-order`, {});
  }

  downloadPdf(id: string, lang: 'hy' | 'en' = 'hy'): Observable<Blob> {
    return this.http.get(`${this.base}/${id}/pdf?lang=${lang}`, { responseType: 'blob' });
  }

  // Legacy compat — used by public quote-form component
  submitQuoteWithFiles(formData: FormData): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.base}/contact`, formData);
  }
}
