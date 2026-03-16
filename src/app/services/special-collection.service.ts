import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type SpecialCollectionCategory =
  | 'hoodies'
  | 'sweatshirts'
  | 't-shirts'
  | 'tote-bags'
  | 'caps';

export const SPECIAL_COLLECTION_CATEGORIES: { value: SpecialCollectionCategory; label: string }[] = [
  { value: 'hoodies', label: 'Hoodies' },
  { value: 'sweatshirts', label: 'Sweatshirts' },
  { value: 't-shirts', label: 'T-shirts' },
  { value: 'tote-bags', label: 'Tote Bags' },
  { value: 'caps', label: 'Caps' },
];

export interface SpecialCollectionVariant {
  size: string;
  color: string;
  quantity: number;
  soldQuantity: number;
}

export interface SpecialCollectionItem {
  id?: string;
  name: string;
  description: string;
  price: number;
  costPrice: number;
  category: SpecialCollectionCategory;
  material?: string;
  images: string[];
  /** Color-specific images: { "Black": ["img1.jpg"], "White": ["img2.jpg"] } */
  colorImages?: Record<string, string[]>;
  variants: SpecialCollectionVariant[];
  isActive: boolean;
  totalQuantity?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateSpecialCollectionDto {
  name: string;
  description: string;
  price: number;
  costPrice?: number;
  category: string;
  material?: string;
  images?: string[];
  colorImages?: Record<string, string[]>;
  variants: { size: string; color: string; quantity: number }[];
  isActive?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class SpecialCollectionService {
  private apiUrl = `${environment.apiUrl}/special-collection`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<SpecialCollectionItem[]> {
    return this.http.get<SpecialCollectionItem[]>(this.apiUrl);
  }

  getAllAdmin(): Observable<SpecialCollectionItem[]> {
    return this.http.get<SpecialCollectionItem[]>(`${this.apiUrl}/admin/all`);
  }

  getByCategory(category: string): Observable<SpecialCollectionItem[]> {
    return this.http.get<SpecialCollectionItem[]>(`${this.apiUrl}/category/${category}`);
  }

  getById(id: string): Observable<SpecialCollectionItem> {
    return this.http.get<SpecialCollectionItem>(`${this.apiUrl}/${id}`);
  }

  create(dto: CreateSpecialCollectionDto): Observable<SpecialCollectionItem> {
    return this.http.post<SpecialCollectionItem>(this.apiUrl, dto);
  }

  update(id: string, dto: Partial<CreateSpecialCollectionDto>): Observable<SpecialCollectionItem> {
    return this.http.patch<SpecialCollectionItem>(`${this.apiUrl}/${id}`, dto);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  uploadImage(file: File): Observable<{ success: boolean; data: { filename: string } }> {
    const formData = new FormData();
    formData.append('image', file);
    return this.http.post<{ success: boolean; data: { filename: string } }>(
      `${this.apiUrl}/upload-image`,
      formData,
    );
  }

  deleteImage(filename: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/image/${filename}`);
  }

  getImageUrl(filename: string): string {
    return `${environment.apiUrl}/special-collection/image/${filename}`;
  }
}
