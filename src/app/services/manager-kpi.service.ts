import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface KpiTier {
  name: string;
  min: number;
  max: number;
  rate: number;
  color?: string;
}

export interface ManagerGoal {
  _id?: string;
  userId: string;
  managerName: string;
  targetInteractions: number;
  targetMeetings: number;
  targetRevenue: number;
  customTiers?: KpiTier[] | null;
}

export interface MonthlyKpi {
  userId: string;
  managerName: string;
  year: number;
  month: number;
  interactions: number;
  meetings: number;
  revenue: number;
  tier: KpiTier;
  tiers: KpiTier[];
  commission: number;
  /** Next tier the manager hasn't reached yet — null when already at top */
  nextTier: KpiTier | null;
  goal: {
    targetInteractions: number;
    targetMeetings: number;
    targetRevenue: number;
    customTiers?: KpiTier[] | null;
  } | null;
}

export interface ManagerUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

@Injectable({ providedIn: 'root' })
export class ManagerKpiService {
  private api = `${environment.apiUrl}/manager-kpi`;

  constructor(private http: HttpClient) {}

  getManagers(): Observable<ManagerUser[]> {
    return this.http.get<ManagerUser[]>(`${this.api}/managers`);
  }

  getTiers(): Observable<KpiTier[]> {
    return this.http.get<KpiTier[]>(`${this.api}/tiers`);
  }

  getAllGoals(): Observable<ManagerGoal[]> {
    return this.http.get<ManagerGoal[]>(`${this.api}/goals`);
  }

  setGoal(goal: Partial<ManagerGoal> & { userId: string; managerName: string }): Observable<ManagerGoal> {
    return this.http.post<ManagerGoal>(`${this.api}/goals`, goal);
  }

  setGoalForAll(goal: Omit<Partial<ManagerGoal>, 'userId' | 'managerName'>): Observable<ManagerGoal[]> {
    return this.http.post<ManagerGoal[]>(`${this.api}/goals/bulk`, goal);
  }

  getAllMonthlyKpi(year: number, month: number): Observable<MonthlyKpi[]> {
    return this.http.get<MonthlyKpi[]>(`${this.api}/monthly`, {
      params: { year: String(year), month: String(month) },
    });
  }

  getMyMonthlyKpi(userId: string, year: number, month: number): Observable<MonthlyKpi> {
    return this.http.get<MonthlyKpi>(`${this.api}/monthly/${userId}`, {
      params: { year: String(year), month: String(month) },
    });
  }
}
