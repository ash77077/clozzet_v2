import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface SelectedProductInfo {
  productName: string;
  category: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProductQuoteService {
  private selectedProductSubject = new BehaviorSubject<SelectedProductInfo | null>(null);
  selectedProduct$ = this.selectedProductSubject.asObservable();

  setSelectedProduct(productInfo: SelectedProductInfo | null): void {
    this.selectedProductSubject.next(productInfo);
  }

  clearSelectedProduct(): void {
    this.selectedProductSubject.next(null);
  }
}
