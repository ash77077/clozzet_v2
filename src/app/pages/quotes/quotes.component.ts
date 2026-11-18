import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';

import { QuoteService, Quote } from '../../services/quote.service';
import { AuthService } from '../../services/auth.service';

type StatusFilter = '' | 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';

@Component({
  selector: 'app-quotes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    TranslateModule,
    ButtonModule,
    TagModule,
    InputTextModule,
    Select,
    TooltipModule,
    SkeletonModule,
  ],
  templateUrl: './quotes.component.html',
  styleUrl: './quotes.component.scss',
})
export class QuotesComponent implements OnInit {
  private readonly quoteService = inject(QuoteService);
  private readonly authService  = inject(AuthService);
  private readonly router       = inject(Router);

  loading   = signal(true);
  quotes    = signal<Quote[]>([]);
  search    = signal('');
  statusFilter = signal<StatusFilter>('');
  myOnly    = signal(false);

  statusOptions = [
    { label: 'All statuses', value: '' },
    { label: 'Draft',        value: 'draft' },
    { label: 'Sent',         value: 'sent' },
    { label: 'Accepted',     value: 'accepted' },
    { label: 'Rejected',     value: 'rejected' },
    { label: 'Expired',      value: 'expired' },
  ];

  filtered = computed(() => {
    const q   = this.search().toLowerCase();
    const st  = this.statusFilter();
    const uid = this.authService.getCurrentUser()?.id;
    return this.quotes().filter(quote => {
      if (st && quote.status !== st) return false;
      if (this.myOnly() && quote.ownerId !== (uid ?? '')) return false;
      if (q) {
        const hay = `${quote.number} ${quote.customerName ?? ''} ${quote.ownerName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  });

  ngOnInit() {
    this.quoteService.findAll().subscribe({
      next: (list) => { this.quotes.set(list); this.loading.set(false); },
      error: ()     => { this.loading.set(false); },
    });
  }

  openQuote(id: string) {
    this.router.navigate(['/quotes', id]);
  }

  statusSeverity(status: Quote['status']): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    const map: Record<string, any> = {
      draft:      'secondary',
      sent:       'info',
      accepted:   'success',
      rejected:   'danger',
      expired:    'warn',
      superseded: 'contrast',
    };
    return map[status] ?? 'secondary';
  }

  formatAmt(n: number): string {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ֏';
  }

  formatDate(d?: string): string {
    if (!d) return '—';
    const dt = new Date(d);
    return [
      String(dt.getDate()).padStart(2, '0'),
      String(dt.getMonth() + 1).padStart(2, '0'),
      dt.getFullYear(),
    ].join('.');
  }
}
