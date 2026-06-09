import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { Subject, takeUntil, filter } from 'rxjs';
import { trigger, transition, style, animate } from '@angular/animations';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ChipModule } from 'primeng/chip';
import { SelectModule } from 'primeng/select';
import { BadgeModule } from 'primeng/badge';
import { TooltipModule } from 'primeng/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import { AiService } from '../../../services/ai.service';
import { CustomersService } from '../../../services/customers.service';
import { ChatMessage } from '../../../models/ai.models';
import { Customer } from '../../../models/customer.model';

interface DisplayMessage {
  role: 'user' | 'assistant';
  content: string;
  isTyping?: boolean;
}

@Component({
  selector: 'app-ai-chat-widget',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    InputTextModule,
    ChipModule,
    SelectModule,
    BadgeModule,
    TooltipModule,
    TranslateModule,
  ],
  templateUrl: './ai-chat-widget.component.html',
  styleUrl: './ai-chat-widget.component.scss',
  animations: [
    trigger('slideUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px) scale(0.97)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'translateY(0) scale(1)' }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0, transform: 'translateY(12px) scale(0.97)' }))
      ])
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(8px)' }),
        animate('180ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class AiChatWidgetComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesEnd') messagesEnd!: ElementRef;

  isOpen = false;
  isTyping = false;
  inputText = '';
  messages: DisplayMessage[] = [];
  customers: Customer[] = [];
  selectedCustomer: Customer | null = null;
  chipsVisible = true;
  generalChips: string[] = [];
  customerChips: string[] = [];
  isOnCustomerPage = false;
  private destroy$ = new Subject<void>();
  private shouldScrollToBottom = false;

  constructor(
    private aiService: AiService,
    private customersService: CustomersService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.customersService.getAll().pipe(takeUntil(this.destroy$)).subscribe({
      next: (customers) => { this.customers = customers; },
      error: () => {}
    });

    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe((e: any) => {
      this.checkCurrentRoute(e.urlAfterRedirects);
    });
    this.checkCurrentRoute(this.router.url);
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private checkCurrentRoute(url: string): void {
    const match = url.match(/\/customer-profile\/([^\/\?]+)/);
    this.isOnCustomerPage = !!match;
    if (match && this.customers.length) {
      const found = this.customers.find(c => c._id === match[1]);
      if (found) this.selectedCustomer = found;
    }
    this.updateChips();
  }

  private updateChips(): void {
    if (this.isOnCustomerPage && this.selectedCustomer) {
      this.customerChips = [
        'AI.CHIP_SUMMARIZE',
        'AI.CHIP_CALL_TIME',
        'AI.CHIP_DRAFT_FOLLOWUP',
      ];
    } else {
      this.generalChips = [
        'AI.CHIP_WHO_TO_CALL',
        'AI.CHIP_AT_RISK',
        'AI.CHIP_SEASONAL',
      ];
    }
  }

  get activeChips(): string[] {
    return this.isOnCustomerPage ? this.customerChips : this.generalChips;
  }

  togglePanel(): void {
    this.isOpen = !this.isOpen;
  }

  onCustomerChange(customer: Customer | null): void {
    this.selectedCustomer = customer;
    this.messages = [];
    if (customer) {
      this.messages.push({ role: 'assistant', content: `Now discussing: ${customer.companyName}` });
    }
    this.chipsVisible = true;
    this.shouldScrollToBottom = true;
  }

  sendChip(chipKey: string): void {
    const chipTextMap: Record<string, string> = {
      'AI.CHIP_SUMMARIZE': 'Summarize this customer',
      'AI.CHIP_CALL_TIME': 'Best time to call?',
      'AI.CHIP_DRAFT_FOLLOWUP': 'Draft a follow-up message',
      'AI.CHIP_WHO_TO_CALL': 'Who should I call today?',
      'AI.CHIP_AT_RISK': 'Any customers at risk?',
      'AI.CHIP_SEASONAL': 'Show seasonal opportunities',
    };
    this.chipsVisible = false;
    this.sendMessage(chipTextMap[chipKey] || chipKey);
  }

  onEnter(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey && this.inputText.trim()) {
      this.sendMessage(this.inputText.trim());
    }
  }

  sendMessage(content: string): void {
    if (!content.trim()) return;
    this.messages.push({ role: 'user', content });
    this.inputText = '';
    this.isTyping = true;
    this.shouldScrollToBottom = true;

    const apiMessages: ChatMessage[] = this.messages
      .filter(m => !m.isTyping)
      .map(m => ({ role: m.role, content: m.content }));

    this.aiService.sendChatMessage(apiMessages, this.selectedCustomer || undefined).subscribe({
      next: (reply) => {
        this.isTyping = false;
        this.messages.push({ role: 'assistant', content: reply });
        this.shouldScrollToBottom = true;
      },
      error: () => {
        this.isTyping = false;
        this.messages.push({ role: 'assistant', content: 'Sorry, something went wrong. Please try again.' });
        this.shouldScrollToBottom = true;
      }
    });
  }

  private scrollToBottom(): void {
    try {
      this.messagesEnd?.nativeElement?.scrollIntoView({ behavior: 'smooth' });
    } catch {}
  }
}
