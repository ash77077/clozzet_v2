import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WeddingGuestsService, WeddingGuest, WeddingGuestStats } from '../../services/wedding-guests.service';

@Component({
  selector: 'app-wedding-guests',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './wedding-guests.component.html',
  styleUrl: './wedding-guests.component.scss',
})
export class WeddingGuestsComponent implements OnInit {
  guests: WeddingGuest[] = [];
  stats: WeddingGuestStats | null = null;
  loading = true;
  error = '';

  constructor(private service: WeddingGuestsService) {}

  ngOnInit() {
    this.service.getStats().subscribe({
      next: s => this.stats = s,
      error: () => {}
    });
    this.service.getAll().subscribe({
      next: guests => { this.guests = guests; this.loading = false; },
      error: () => { this.error = 'Failed to load guests'; this.loading = false; }
    });
  }
}
