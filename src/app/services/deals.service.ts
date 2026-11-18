import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PipelineStage } from './pipeline-stages.service';

export type DealSource =
  | 'inbound_call'
  | 'website'
  | 'instagram'
  | 'facebook'
  | 'linkedin'
  | 'referral'
  | 'cold_call'
  | 'expo'
  | 'existing_customer'
  | 'other';

export type DealNextStepType =
  | 'call'
  | 'email'
  | 'whatsapp'
  | 'meeting'
  | 'send_sample'
  | 'send_quote'
  | 'other';

export interface DealCustomerRef {
  _id: string;
  companyName: string;
  contactPerson?: string;
  status?: string;
  phone?: string;
  email?: string;
}

export interface DealOwnerRef {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
}

export interface Deal {
  _id: string;
  title: string;
  customerId: string | DealCustomerRef;
  contactPersonId?: string | null;
  ownerId: string | DealOwnerRef;
  stageId: string | PipelineStage;
  stageKey: string;
  stageEnteredAt: string;
  probability: number;
  estimatedValue?: number;
  estimatedQuantity?: number;
  garmentTypeIds?: string[];
  expectedCloseDate?: string;
  source?: DealSource;
  nextStepDate?: string;
  nextStepType?: DealNextStepType;
  nextStepNote?: string;
  lostReasonId?: string | null;
  lostComment?: string;
  wonAt?: string;
  lostAt?: string;
  orderIds: string[];
  quoteIds: string[];
  createdBy: string;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DealStageHistory {
  _id: string;
  dealId: string;
  fromStageId?: string | null;
  fromStageKey?: string | null;
  toStageId: string;
  toStageKey: string;
  changedBy: string;
  changedByName?: string;
  changedAt: string;
  note?: string;
}

export interface DealFilters {
  ownerId?: string;
  stageKey?: string;
  customerId?: string;
  isDeleted?: boolean;
}

export interface CreateDealPayload {
  title: string;
  customerId: string;
  contactPersonId?: string;
  ownerId: string;
  stageId: string;
  probability?: number;
  estimatedValue?: number;
  estimatedQuantity?: number;
  garmentTypeIds?: string[];
  expectedCloseDate?: string;
  source?: DealSource;
  nextStepDate?: string;
  nextStepType?: DealNextStepType;
  nextStepNote?: string;
}

export interface UpdateDealPayload {
  title?: string;
  customerId?: string;
  contactPersonId?: string;
  ownerId?: string;
  probability?: number;
  estimatedValue?: number;
  estimatedQuantity?: number;
  garmentTypeIds?: string[];
  expectedCloseDate?: string;
  source?: DealSource;
  nextStepDate?: string;
  nextStepType?: DealNextStepType;
  nextStepNote?: string;
  orderIds?: string[];
  quoteIds?: string[];
}

export interface ChangeStagePayload {
  stageId: string;
  note?: string;
  lostReasonId?: string;
  lostComment?: string;
  allowEmptyOrderIds?: boolean;
}

export interface MarkWonPayload {
  orderId: string;
}

export interface MarkLostPayload {
  lostReasonId: string;
  lostComment?: string;
}

@Injectable({ providedIn: 'root' })
export class DealsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/deals`;
  private readonly historyBase = `${environment.apiUrl}/deal-stage-history`;

  getAll(filters: DealFilters = {}): Observable<Deal[]> {
    let params = new HttpParams();
    if (filters.ownerId) params = params.set('ownerId', filters.ownerId);
    if (filters.stageKey) params = params.set('stageKey', filters.stageKey);
    if (filters.customerId) params = params.set('customerId', filters.customerId);
    if (filters.isDeleted !== undefined) {
      params = params.set('isDeleted', String(filters.isDeleted));
    }
    return this.http.get<Deal[]>(this.base, { params });
  }

  getById(id: string): Observable<Deal> {
    return this.http.get<Deal>(`${this.base}/${id}`);
  }

  create(dto: CreateDealPayload): Observable<Deal> {
    return this.http.post<Deal>(this.base, dto);
  }

  update(id: string, dto: UpdateDealPayload): Observable<Deal> {
    return this.http.patch<Deal>(`${this.base}/${id}`, dto);
  }

  changeStage(id: string, dto: ChangeStagePayload): Observable<Deal> {
    return this.http.patch<Deal>(`${this.base}/${id}/stage`, dto);
  }

  markWon(id: string, dto: MarkWonPayload): Observable<Deal> {
    return this.http.patch<Deal>(`${this.base}/${id}/won`, dto);
  }

  markLost(id: string, dto: MarkLostPayload): Observable<Deal> {
    return this.http.patch<Deal>(`${this.base}/${id}/lost`, dto);
  }

  delete(id: string): Observable<Deal> {
    return this.http.delete<Deal>(`${this.base}/${id}`);
  }

  getStageHistory(dealId: string): Observable<DealStageHistory[]> {
    const params = new HttpParams().set('dealId', dealId);
    return this.http.get<DealStageHistory[]>(this.historyBase, { params });
  }
}
