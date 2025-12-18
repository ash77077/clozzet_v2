import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { RetailProductsService, SaleListItem } from '../../../services/retail-products.service';

@Component({
  selector: 'app-sales-history',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ConfirmDialogModule,
    ToastModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './sales-history.component.html',
  styleUrl: './sales-history.component.scss'
})
export class SalesHistoryComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  sales: SaleListItem[] = [];
  isLoadingSales = false;
  showEditPriceModal = false;
  selectedSale: SaleListItem | null = null;
  newSoldPrice: number = 0;

  constructor(
    private retailProductsService: RetailProductsService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadSales();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadSales(): void {
    this.isLoadingSales = true;
    this.retailProductsService.getAllSales()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (sales) => {
          this.sales = sales;
          this.isLoadingSales = false;
        },
        error: (err) => {
          console.error('Error loading sales:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load sales history'
          });
          this.isLoadingSales = false;
        }
      });
  }

  openEditPriceModal(sale: SaleListItem): void {
    this.selectedSale = sale;
    this.newSoldPrice = sale.soldPrice;
    this.showEditPriceModal = true;
  }

  closeEditPriceModal(): void {
    this.showEditPriceModal = false;
    this.selectedSale = null;
  }

  updateSoldPrice(): void {
    if (!this.selectedSale || this.newSoldPrice <= 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Invalid Price',
        detail: 'Please enter a valid price'
      });
      return;
    }

    this.retailProductsService.updateSalePrice(
      this.selectedSale.productId,
      this.selectedSale.saleId,
      this.newSoldPrice
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Update the sale in the list
          if (this.selectedSale) {
            this.selectedSale.soldPrice = this.newSoldPrice;
          }
          this.closeEditPriceModal();
          this.messageService.add({
            severity: 'success',
            summary: 'Price Updated',
            detail: 'Sold price updated successfully'
          });
        },
        error: (err) => {
          console.error('Error updating price:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to update price'
          });
        }
      });
  }

  confirmReturnSale(sale: SaleListItem): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to return this sale? (${sale.productName} - ${sale.color} ${sale.size} x${sale.quantity})`,
      header: 'Return Sale Confirmation',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => {
        this.returnSale(sale);
      }
    });
  }

  returnSale(sale: SaleListItem): void {
    this.retailProductsService.returnSale(sale.productId, sale.saleId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Remove the sale from the list
          this.sales = this.sales.filter(s => s.saleId !== sale.saleId);
          this.messageService.add({
            severity: 'success',
            summary: 'Sale Returned',
            detail: 'Sale returned successfully. Stock has been restored.'
          });
        },
        error: (err) => {
          console.error('Error returning sale:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to return sale: ' + (err.error?.message || 'Unknown error')
          });
        }
      });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('hy-AM', {
      style: 'currency',
      currency: 'AMD'
    }).format(amount);
  }

  formatDate(date: Date | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  goBack(): void {
    this.router.navigate(['/retail-sales']);
  }
}
