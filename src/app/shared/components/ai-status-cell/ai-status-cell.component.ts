import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import { AiService } from '../../../services/ai.service';
import { Customer } from '../../../models/customer.model';
import { CustomerAiResult } from '../../../models/ai.models';

@Component({
  selector: 'app-ai-status-cell',
  standalone: true,
  imports: [CommonModule, TagModule, ButtonModule, TooltipModule, TranslateModule],
  template: `
    <ng-container *ngIf="result; else noResult">
      <p-tag [value]="result.status" [severity]="getSeverity(result.status)" styleClass="text-xs">
      </p-tag>
      <i *ngIf="isStale"
         class="pi pi-clock ml-1 text-yellow-500 text-xs"
         [pTooltip]="'AI.STALE_WARNING' | translate">
      </i>
    </ng-container>
    <ng-template #noResult>
      <p-button
        label="Analyze"
        icon="pi pi-sparkles"
        styleClass="p-button-text p-button-sm"
        size="small"
        (onClick)="analyzeClicked.emit(customer)">
      </p-button>
    </ng-template>
  `
})
export class AiStatusCellComponent implements OnInit {
  @Input() customer!: Customer;
  @Output() analyzeClicked = new EventEmitter<Customer>();

  result: CustomerAiResult | null = null;
  isStale = false;

  constructor(private aiService: AiService) {}

  ngOnInit(): void {
    if (this.customer._id) {
      this.result = this.aiService.getCachedAnalysis(this.customer._id);
      if (this.result) {
        const analyzedAt = new Date(this.result.analyzed_at);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        this.isStale = analyzedAt < sevenDaysAgo;
      }
    }
  }

  getSeverity(status: string): string {
    const map: Record<string, string> = {
      'hot lead': 'danger',
      'warm lead': 'warning',
      'cold lead': 'info',
      'loyal customer': 'success',
      'new contact': 'secondary',
      'at risk': 'danger',
    };
    return map[status] || 'info';
  }
}
