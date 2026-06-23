import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
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

interface Countdown {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
}

interface Firefly {
  left: number;
  top: number;
  delay: number;
  duration: number;
  size: number;
  drift: number;
}



/**
 * Wedding invitation page — Hasmik & Artyom · July 31, 2026
 * A self-contained, chrome-less route that hides the app navbar/footer.
 * All visuals are CSS/SVG — no external animation libraries.
 */
@Component({
  selector: 'app-wedding',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './wedding.component.html',
  styleUrl: './wedding.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WeddingComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly cdr = inject(ChangeDetectorRef);

  // The big day — July 31, 2026, 16:00 local Armenian time
  private readonly weddingDate = new Date('2026-07-31T16:00:00+04:00').getTime();

  // Curtain reveal — flips to true a tick after init for a smooth opening
  curtainOpen = false;

  // Live countdown values rendered into flip cards
  countdown: Countdown = { days: '000', hours: '00', minutes: '00', seconds: '00' };
  // Track which digits just changed so we can flip them
  flipKeys: { [k in keyof Countdown]: number } = { days: 0, hours: 0, minutes: 0, seconds: 0 };
  private previousCountdown: Countdown = { days: '000', hours: '00', minutes: '00', seconds: '00' };

  // RSVP form
  rsvpForm: FormGroup;
  submitting = false;
  submitted = false;
  submitError: string | null = null;

  // Decorative firefly particles drifting behind the hero
  fireflies: Firefly[] = [];

  // The Google Maps embed URL for Platinium Hall, Mughni, Armenia
  mapUrl: SafeResourceUrl;


  // Sections we want to fade in on scroll
  @ViewChildren('revealSection') revealSections!: QueryList<ElementRef<HTMLElement>>;
  private observer?: IntersectionObserver;
  private countdownTimer?: number;

  constructor() {
    // Drinks live outside the form (Set-based UX); the rest is reactive.
    this.rsvpForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
      attending: ['yes', [Validators.required]],
      guestCount: [1, [Validators.required, Validators.min(1), Validators.max(20)]],
      message: ['', [Validators.maxLength(800)]]
    });

    this.mapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      'https://maps.google.com/maps?q=Platinium+Hall+Mughni+Armenia&output=embed'
    );

    this.fireflies = this.generateFireflies(24);
  }

  ngOnInit(): void {
    // Update the countdown right away, then every second
    this.updateCountdown();
    this.countdownTimer = window.setInterval(() => {
      this.updateCountdown();
      this.cdr.markForCheck();
    }, 1000);

    // Lock background scrolling-related artefacts on this chrome-less page
    document.body.classList.add('wedding-invitation-active');
  }

  ngAfterViewInit(): void {
    // Pull the curtain back on the next tick to ensure the initial frame paints first
    requestAnimationFrame(() => {
      this.curtainOpen = true;
      this.cdr.markForCheck();
    });

    // Scroll-triggered fade-in for each section
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
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }
    this.observer?.disconnect();
    document.body.classList.remove('wedding-invitation-active');
  }

  // Smooth scroll to the RSVP form from the hero CTA
  scrollToRsvp(): void {
    const el = document.getElementById('rsvp');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  incrementGuests(): void {
    const current = this.rsvpForm.value.guestCount ?? 1;
    if (current < 20) this.rsvpForm.patchValue({ guestCount: current + 1 });
  }

  decrementGuests(): void {
    const current = this.rsvpForm.value.guestCount ?? 1;
    if (current > 1) this.rsvpForm.patchValue({ guestCount: current - 1 });
  }

  // Compute remaining time and split into zero-padded segments
  private updateCountdown(): void {
    const now = Date.now();
    const diff = Math.max(0, this.weddingDate - now);

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    const next: Countdown = {
      days: this.pad(days, 3),
      hours: this.pad(hours, 2),
      minutes: this.pad(minutes, 2),
      seconds: this.pad(seconds, 2)
    };

    // Bump flip keys only for segments whose value actually changed
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

  // Procedural firefly cloud — randomized but deterministic per refresh
  private generateFireflies(count: number): Firefly[] {
    const items: Firefly[] = [];
    for (let i = 0; i < count; i++) {
      items.push({
        left: Math.random() * 100,
        top: Math.random() * 100,
        delay: -Math.random() * 12,
        duration: 9 + Math.random() * 10,
        size: 2 + Math.random() * 3,
        drift: -30 + Math.random() * 60
      });
    }
    return items;
  }

  // Submit RSVP to the NestJS backend
  onSubmit(): void {
    if (this.submitting || this.submitted) {
      return;
    }
    if (this.rsvpForm.invalid) {
      this.rsvpForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.submitError = null;

    const raw = this.rsvpForm.value;
    const payload = {
      name: (raw.name ?? '').trim(),
      attending: raw.attending,
      guestCount: raw.guestCount ?? 1,
      message: (raw.message ?? '').trim()
    };

    this.http.post('http://localhost:3000/api/wedding-guests', payload).subscribe({
      next: () => {
        this.submitting = false;
        this.submitted = true;
        this.cdr.markForCheck();
      },
      error: () => {
        this.submitting = false;
        this.submitError =
          'We could not deliver your reply just yet — please try again in a moment.';
        this.cdr.markForCheck();
      }
    });
  }

  // Convenience getters for template validation hints
  get nameCtrl() {
    return this.rsvpForm.get('name');
  }

  // Allow Enter inside the textarea without submitting the form
  @HostListener('keydown.enter', ['$event'])
  preventStrayEnter(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    if (target && target.tagName === 'TEXTAREA') {
      return;
    }
    // Otherwise allow default — buttons and submits still work
  }
}
