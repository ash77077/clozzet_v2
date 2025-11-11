import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ProductVariant {
  name: string;
  colors: string[];
  sizes: string[];
  materials: string[];
  gsm?: string[];
  image?: string;
}

export interface Product {
  _id?: string;
  id: string;
  name: string;
  category: string;
  tagline: string;
  description: string;
  images: string[];
  features: string[];
  variants: ProductVariant[];
  useCases: string[];
  startingPrice: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ProductsService {
  private apiUrl = `${environment.apiUrl}/products`;

  constructor(private http: HttpClient) {}

  // Public endpoints
  getAllProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(this.apiUrl);
  }

  getProduct(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${id}`);
  }

  // Admin endpoints
  getAllProductsAdmin(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/admin/all`);
  }

  createProduct(product: Product): Observable<Product> {
    return this.http.post<Product>(this.apiUrl, product);
  }

  updateProduct(id: string, product: Partial<Product>): Observable<Product> {
    return this.http.patch<Product>(`${this.apiUrl}/${id}`, product);
  }

  toggleActive(id: string): Observable<Product> {
    return this.http.patch<Product>(`${this.apiUrl}/${id}/toggle-active`, {});
  }

  deleteProduct(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  uploadVariantImage(file: File): Observable<{ success: boolean; message: string; data: { filename: string } }> {
    const formData = new FormData();
    formData.append('image', file);
    return this.http.post<{ success: boolean; message: string; data: { filename: string } }>(
      `${this.apiUrl}/upload-variant-image`,
      formData
    );
  }

  getVariantImageUrl(filename: string): string {
    return `${environment.apiUrl}/products/variant-image/${filename}`;
  }
}