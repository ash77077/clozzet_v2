import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ProductDetailsFormData {
  orderNumber: string;
  clientName: string;
  salesPerson: string;
  deadline: string;
  quantity: number;
  priority: string;
  clothType: string;
  textileType: string;
  fabricWeight?: number;
  colors: string[];
  customColorDetails?: string;
  sizeQuantities: { [size: string]: number };
  printingMethod: string;
  logoPosition?: string;
  logoSize?: string;
  logoFiles?: string[];
  designFiles?: string[];
  referenceImages?: string[];
  pantoneColors?: string;
  neckStyle?: string;
  sleeveType?: string;
  fit?: string;
  hoodieStyle?: string;
  pocketType?: string;
  zipperType?: string;
  collarStyle?: string;
  buttonCount?: string;
  placketStyle?: string;
  bagStyle?: string;
  handleType?: string;
  bagDimensions?: string;
  reinforcement?: string;
  capStyle?: string;
  visorType?: string;
  closure?: string;
  apronStyle?: string;
  neckStrap?: string;
  waistTie?: string;
  pocketDetails?: string;
  specialInstructions?: string;
  packagingRequirements?: string;
  shippingAddress?: string;
}

export interface ProductDetailsResponse {
  success: boolean;
  message: string;
  data: any;
}

@Injectable({
  providedIn: 'root'
})
export class ProductDetailsService {
  private apiUrl = `${environment.apiUrl}/product-details`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  submitProductDetails(productDetails: ProductDetailsFormData): Observable<ProductDetailsResponse> {
    return this.http.post<ProductDetailsResponse>(
      this.apiUrl,
      productDetails,
      { headers: this.getHeaders() }
    );
  }

  getAllProductDetails(): Observable<ProductDetailsResponse> {
    return this.http.get<ProductDetailsResponse>(
      this.apiUrl,
      { headers: this.getHeaders() }
    );
  }

  getProductDetailsById(id: string): Observable<ProductDetailsResponse> {
    return this.http.get<ProductDetailsResponse>(
      `${this.apiUrl}/${id}`,
      { headers: this.getHeaders() }
    );
  }

  getProductDetailsByOrderNumber(orderNumber: string): Observable<ProductDetailsResponse> {
    return this.http.get<ProductDetailsResponse>(
      `${this.apiUrl}/search/order/${orderNumber}`,
      { headers: this.getHeaders() }
    );
  }

  searchByClient(clientName: string): Observable<ProductDetailsResponse> {
    return this.http.get<ProductDetailsResponse>(
      `${this.apiUrl}/search/client?name=${encodeURIComponent(clientName)}`,
      { headers: this.getHeaders() }
    );
  }

  getByPriority(priority: string): Observable<ProductDetailsResponse> {
    return this.http.get<ProductDetailsResponse>(
      `${this.apiUrl}/search/priority/${priority}`,
      { headers: this.getHeaders() }
    );
  }

  getByClothType(clothType: string): Observable<ProductDetailsResponse> {
    return this.http.get<ProductDetailsResponse>(
      `${this.apiUrl}/search/cloth-type/${clothType}`,
      { headers: this.getHeaders() }
    );
  }

  getStatistics(): Observable<ProductDetailsResponse> {
    return this.http.get<ProductDetailsResponse>(
      `${this.apiUrl}/statistics`,
      { headers: this.getHeaders() }
    );
  }

  updateStatus(id: string, status: string): Observable<ProductDetailsResponse> {
    return this.http.patch<ProductDetailsResponse>(
      `${this.apiUrl}/${id}/status`,
      { status },
      { headers: this.getHeaders() }
    );
  }

  deleteProductDetails(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${id}`,
      { headers: this.getHeaders() }
    );
  }

  updateManufacturingStatus(id: string, manufacturingStatus: string, updatedBy?: string): Observable<ProductDetailsResponse> {
    return this.http.patch<ProductDetailsResponse>(
      `${this.apiUrl}/${id}/manufacturing-status`,
      { manufacturingStatus, updatedBy },
      { headers: this.getHeaders() }
    );
  }

  addManufacturingNotes(id: string, content: string, author: string): Observable<ProductDetailsResponse> {
    return this.http.post<ProductDetailsResponse>(
      `${this.apiUrl}/${id}/manufacturing-notes`,
      { content, author },
      { headers: this.getHeaders() }
    );
  }

  getByManufacturingStatus(status: string): Observable<ProductDetailsResponse> {
    return this.http.get<ProductDetailsResponse>(
      `${this.apiUrl}/manufacturing/status/${status}`,
      { headers: this.getHeaders() }
    );
  }

  uploadFiles(files: File[]): Observable<ProductDetailsResponse> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : ''
      // Don't set Content-Type for FormData - browser will set it automatically with boundary
    });

    return this.http.post<ProductDetailsResponse>(
      `${this.apiUrl}/upload-files`,
      formData,
      { headers }
    );
  }
}