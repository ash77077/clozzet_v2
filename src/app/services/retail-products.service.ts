import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ProductVariant {
  size: string;
  color: string;
  quantity: number;
  soldQuantity: number;
}

export interface SaleRecord {
  size: string;
  color: string;
  quantity: number;
  soldPrice: number;
  soldDate: Date;
}

export interface RetailProduct {
  _id?: string;
  name: string;
  description: string;
  price: number;
  category: string;
  material?: string;
  images: string[];
  variants: ProductVariant[];
  salesHistory?: SaleRecord[];
  totalQuantity: number;
  totalSold: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SellVariantRequest {
  size: string;
  color: string;
  quantity: number;
  soldPrice?: number;
}

@Injectable({
  providedIn: 'root'
})
export class RetailProductsService {
  private apiUrl = `${environment.apiUrl}/retail-products`;

  constructor(private http: HttpClient) {}

  getAllRetailProducts(): Observable<RetailProduct[]> {
    return this.http.get<RetailProduct[]>(this.apiUrl);
  }

  getAvailableProducts(): Observable<RetailProduct[]> {
    return this.http.get<RetailProduct[]>(`${this.apiUrl}/available`);
  }

  getSoldProducts(): Observable<RetailProduct[]> {
    return this.http.get<RetailProduct[]>(`${this.apiUrl}/sold`);
  }

  getRetailProduct(id: string): Observable<RetailProduct> {
    return this.http.get<RetailProduct>(`${this.apiUrl}/${id}`);
  }

  createRetailProduct(product: RetailProduct): Observable<RetailProduct> {
    return this.http.post<RetailProduct>(this.apiUrl, product);
  }

  updateRetailProduct(id: string, product: Partial<RetailProduct>): Observable<RetailProduct> {
    return this.http.patch<RetailProduct>(`${this.apiUrl}/${id}`, product);
  }

  sellVariant(id: string, sellRequest: SellVariantRequest): Observable<RetailProduct> {
    return this.http.post<RetailProduct>(`${this.apiUrl}/${id}/sell-variant`, sellRequest);
  }

  restockVariant(id: string, size: string, color: string, quantity: number): Observable<RetailProduct> {
    return this.http.post<RetailProduct>(`${this.apiUrl}/${id}/restock-variant?size=${size}&color=${color}&quantity=${quantity}`, {});
  }

  getSalesReport(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}/sales-report`);
  }

  deleteRetailProduct(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  uploadProductImage(file: File): Observable<{ success: boolean; message: string; data: { filename: string } }> {
    const formData = new FormData();
    formData.append('image', file);
    return this.http.post<{ success: boolean; message: string; data: { filename: string } }>(
      `${this.apiUrl}/upload-image`,
      formData
    );
  }

  getProductImageUrl(filename: string): string {
    return `${environment.apiUrl}/retail-products/image/${filename}`;
  }
}