import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChildren,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface Countdown {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
}

interface Petal {
  left: number;
  size: number;
  delay: number;
  duration: number;
  drift: number;
  hue: number;
  opacity: number;
  variant: number;
}

interface TimelineEvent {
  time: string;
  title: string;
  venue: string;
  address: string;
  mapQuery: string;
  icon: 'church' | 'bride' | 'groom' | 'reception';
}

/**
 * "Beating Heart" invitation — Ashkharhik & Gohar · July 31, 2026
 * Chrome-less standalone Angular route inspired by belleame.am/beating_heart.
 * White / beige / pastel palette.
 */
@Component({
  selector: 'app-invitation2',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './invitation2.component.html',
  styleUrl: './invitation2.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Invitation2Component implements OnInit, AfterViewInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly cdr = inject(ChangeDetectorRef);

  // The big day — July 31, 2026 at 17:30 Armenia time (UTC+4)
  private readonly weddingDate = new Date('2026-07-31T17:30:00+04:00').getTime();

  curtainOpen = false;

  countdown: Countdown = { days: '000', hours: '00', minutes: '00', seconds: '00' };
  flipKeys: { [k in keyof Countdown]: number } = { days: 0, hours: 0, minutes: 0, seconds: 0 };
  private previousCountdown: Countdown = { days: '000', hours: '00', minutes: '00', seconds: '00' };

  rsvpForm: FormGroup;
  submitting = false;
  submitted = false;
  submitError: string | null = null;

  petals: Petal[] = Array.from({ length: 15 }, (_, i) => {
    const s = i * 137.508;
    return {
      left:     Math.random() * 100,
      size:     10 + Math.random() * 18,
      delay:    Math.random() * 12,
      duration: 12 + Math.random() * 10,
      drift:    -80 + Math.random() * 160,
      hue:      Math.floor(s % 20),
      opacity:  0.35 + Math.random() * 0.45,
      variant:  i % 3
    };
  });

  timeline: TimelineEvent[] = [
    {
      time: '12:00',
      title: 'Pesayi tun',
      venue: 'Nor Nork',
      address: 'Davit Bek 220/20',
      mapQuery: 'David Bek Street 220 Nor Nork Yerevan Armenia',
      icon: 'groom'
    },
    {
      time: '12:30',
      title: 'Harsi tun',
      venue: 'Nor Nork',
      address: 'Nanseni pogoc 50',
      mapQuery: 'Nansen Street 50 Nor Nork Yerevan Armenia',
      icon: 'bride'
    },
    {
      time: '15:00',
      title: 'Psakadrutʻyun',
      venue: 'Tegher Monastery',
      address: 'Tegher, Aragacotn',
      mapQuery: 'Tegher Monastery Armenia',
      icon: 'church'
    },
    {
      time: '17:30',
      title: 'Harsanyac handisutʻyun',
      venue: 'Platinium Hall',
      address: 'Mughni, Armenia',
      mapQuery: 'Platinium Hall Mughni Armenia',
      icon: 'reception'
    }
  ];

  mapUrlCeremony: SafeResourceUrl;
  mapUrlReception: SafeResourceUrl;

  @ViewChildren('revealSection') revealSections!: QueryList<ElementRef<HTMLElement>>;
  private observer?: IntersectionObserver;
  private countdownTimer?: number;

  constructor() {
    this.rsvpForm = this.fb.group({
      name:       ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
      partner:    ['solo', [Validators.required]],
      attending:  ['yes', [Validators.required]],
      guestCount: [1, [Validators.required, Validators.min(1), Validators.max(10)]],
      song:       ['', [Validators.maxLength(200)]],
      message:    ['', [Validators.maxLength(500)]]
    });

    this.mapUrlCeremony = this.sanitizer.bypassSecurityTrustResourceUrl(
      'https://maps.google.com/maps?q=Tegher+Monastery+Armenia&output=embed'
    );
    this.mapUrlReception = this.sanitizer.bypassSecurityTrustResourceUrl(
      'https://maps.google.com/maps?q=Platinium+Hall+Mughni+Armenia&output=embed'
    );
  }

  ngOnInit(): void {
    this.updateCountdown();
    this.countdownTimer = window.setInterval(() => {
      this.updateCountdown();
      this.cdr.markForCheck();
    }, 1000);
    document.body.classList.add('invitation2-active');
  }

  ngAfterViewInit(): void {
    requestAnimationFrame(() => {
      setTimeout(() => {
        this.curtainOpen = true;
        this.cdr.markForCheck();
      }, 800);
    });

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      this.revealSections.forEach(s => s.nativeElement.classList.add('is-visible'));
      return;
    }

    this.observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            this.observer?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.18, rootMargin: '0px 0px -8% 0px' }
    );

    this.revealSections.forEach(section => this.observer!.observe(section.nativeElement));
  }

  ngOnDestroy(): void {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    this.observer?.disconnect();
    document.body.classList.remove('invitation2-active');
  }

  scrollToRsvp(): void {
    const el = document.getElementById('rsvp');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  openMap(query: string): void {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  incrementGuests(): void {
    const current = this.rsvpForm.value.guestCount ?? 1;
    if (current < 10) this.rsvpForm.patchValue({ guestCount: current + 1 });
  }

  decrementGuests(): void {
    const current = this.rsvpForm.value.guestCount ?? 1;
    if (current > 1) this.rsvpForm.patchValue({ guestCount: current - 1 });
  }

  private updateCountdown(): void {
    const now = Date.now();
    const diff = Math.max(0, this.weddingDate - now);

    const days    = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours   = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    const next: Countdown = {
      days:    this.pad(days, 3),
      hours:   this.pad(hours, 2),
      minutes: this.pad(minutes, 2),
      seconds: this.pad(seconds, 2)
    };

    (Object.keys(next) as Array<keyof Countdown>).forEach(k => {
      if (next[k] !== this.previousCountdown[k]) {
        this.flipKeys[k] = (this.flipKeys[k] + 1) % 1_000_000;
      }
    });

    this.previousCountdown = next;
    this.countdown = next;
  }

  private pad(n: number, width: number): string {
    return n.toString().padStart(width, '0');
  }

  onSubmit(): void {
    if (this.submitting || this.submitted) return;
    if (this.rsvpForm.invalid) {
      this.rsvpForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.submitError = null;

    const raw = this.rsvpForm.value;
    const payload = {
      name:       (raw.name ?? '').trim(),
      partner:    raw.partner,
      attending:  raw.attending,
      guestCount: raw.guestCount ?? 1,
      song:       (raw.song ?? '').trim(),
      message:    (raw.message ?? '').trim()
    };

    this.http.post(`${environment.apiUrl}/wedding-guests2`, payload).subscribe({
      next: () => {
        this.submitting = false;
        this.submitted = true;
        this.cdr.markForCheck();
      },
      error: () => {
        this.submitting = false;
        this.submitError = 'Could not send your reply. Please try again.';
        this.cdr.markForCheck();
      }
    });
  }

  get nameCtrl() {
    return this.rsvpForm.get('name');
  }
}
