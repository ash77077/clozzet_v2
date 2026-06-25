import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { WeddingGuestsService, WeddingGuest, WeddingGuestStats } from '../../services/wedding-guests.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-wedding-guests',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    TableModule,
    ButtonModule,
    TagModule,
    ToastModule,
    TooltipModule,
    CardModule,
    ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './wedding-guests.component.html',
  styleUrl: './wedding-guests.component.scss',
})
export class WeddingGuestsComponent implements OnInit {
  guests: WeddingGuest[] = [];
  stats: WeddingGuestStats = { totalResponses: 0, attending: 0, notAttending: 0, maybe: 0, totalGuests: 0 };
  loading = true;

  constructor(
    private service: WeddingGuestsService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
  ) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    forkJoin({ guests: this.service.getAll(), stats: this.service.getStats() }).subscribe({
      next: ({ guests, stats }) => {
        this.guests = guests;
        this.stats = stats;
        this.loading = false;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load guest list' });
        this.loading = false;
      },
    });
  }

  confirmDelete(guest: WeddingGuest) {
    this.confirmationService.confirm({
      message: `Remove <strong>${guest.name}</strong> from the guest list?`,
      header: 'Remove Guest',
      icon: 'pi pi-trash',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.delete(guest._id),
    });
  }

  delete(id: string) {
    this.service.delete(id).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Removed', detail: 'Guest removed' });
        this.load();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not remove guest' });
      },
    });
  }

  attendingSeverity(value: string): 'success' | 'danger' | 'warn' | 'info' {
    if (value === 'yes') return 'success';
    if (value === 'no') return 'danger';
    return 'warn';
  }

  attendingLabel(value: string): string {
    if (value === 'yes') return 'Coming';
    if (value === 'no') return 'Not Coming';
    return 'Maybe';
  }
}
