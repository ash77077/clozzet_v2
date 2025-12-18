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

export interface ProductVariantInput {
  size: string;
  color: string;
  quantity: number;
}

export interface UpdateRetailProductDto {
  name?: string;
  description?: string;
  price?: number;
  category?: string;
  material?: string;
  images?: string[];
  variants?: ProductVariantInput[];
}

export interface SaleRecord {
  size: string;
  color: string;
  quantity: number;
  soldPrice: number;
  soldDate: Date;
}

export interface SaleListItem {
  saleId: string;
  productId: string;
  productName: string;
  category: string;
  size: string;
  color: string;
  quantity: number;
  soldPrice: number;
  soldDate: Date;
  isExternal: boolean;
  isStandalone?: boolean;
}

export interface RetailProduct {
  _id?: string;
  name: string;
  description: string;
  price: number;
  costPrice: number;
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

  updateRetailProduct(id: string, product: UpdateRetailProductDto): Observable<RetailProduct> {
    return this.http.patch<RetailProduct>(`${this.apiUrl}/${id}`, product);
  }

  sellVariant(id: string, sellRequest: SellVariantRequest): Observable<RetailProduct> {
    return this.http.post<RetailProduct>(`${this.apiUrl}/${id}/sell-variant`, sellRequest);
  }

  // Record external sale (doesn't affect inventory)
  recordExternalSale(id: string, sellRequest: SellVariantRequest): Observable<RetailProduct> {
    return this.http.post<RetailProduct>(`${this.apiUrl}/${id}/external-sale`, sellRequest);
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

  // Get all sales history
  getAllSales(): Observable<SaleListItem[]> {
    return this.http.get<SaleListItem[]>(`${this.apiUrl}/sales/all`);
  }

  // Return/undo a sale
  returnSale(productId: string, saleId: string): Observable<RetailProduct> {
    return this.http.post<RetailProduct>(`${this.apiUrl}/${productId}/return-sale/${saleId}`, {});
  }

  // Update sold price of a sale
  updateSalePrice(productId: string, saleId: string, newPrice: number): Observable<RetailProduct> {
    return this.http.patch<RetailProduct>(`${this.apiUrl}/${productId}/update-sale-price/${saleId}`, { newPrice });
  }

  // Record standalone sale (for Quick Sell when product not in database)
  recordStandaloneSale(saleData: {
    category: string;
    size: string;
    color: string;
    quantity: number;
    soldPrice: number;
  }): Observable<any> {
    return this.http.post(`${environment.apiUrl}/standalone-sales`, saleData);
  }

  // Quick Sell: Create product and immediately sell it
  quickSell(saleData: {
    category: string;
    size: string;
    color: string;
    quantity: number;
    soldPrice: number;
  }): Observable<RetailProduct> {
    return this.http.post<RetailProduct>(`${this.apiUrl}/quick-sell`, saleData);
  }
}
