import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type PipelineStageType = 'open' | 'won' | 'lost';

export interface PipelineStage {
  _id: string;
  key: string;
  nameHy: string;
  nameEn: string;
  probability: number;
  type: PipelineStageType;
  order: number;
  isSystem: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdatePipelineStagePayload {
  nameHy?: string;
  nameEn?: string;
  probability?: number;
}

@Injectable({ providedIn: 'root' })
export class PipelineStagesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/pipeline-stages`;

  getAll(): Observable<PipelineStage[]> {
    return this.http.get<PipelineStage[]>(this.base);
  }

  getAdmin(): Observable<PipelineStage[]> {
    return this.http.get<PipelineStage[]>(`${this.base}/admin`);
  }

  update(id: string, dto: UpdatePipelineStagePayload): Observable<PipelineStage> {
    return this.http.patch<PipelineStage>(`${this.base}/${id}`, dto);
  }
}
