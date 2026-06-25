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
import { environment } from '../../../environments/environment';

interface Countdown {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
}

interface Bubble {
  left: number;
  top: number;
  delay: number;
  duration: number;
  size: number;
  drift: number;
  hue: number;
}



/**
 * Wedding invitation page — Ashkharhik & Gohar · July 31, 2026
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

  // Decorative soap bubbles floating behind the hero
  fireflies: Bubble[] = [];

  // Full flowers scattered across the screen
  petals = Array.from({ length: 20 }, (_, i) => {
    const s = i * 137.508;
    return {
      x:        (i / 20) * 105 - 2,         // spread 0–105% width
      y:        (i / 20) * 108 - 4,         // spread 0–108% height
      rotate:   s % 360,                    // initial rotation
      scale:    0.55 + (s % 100) / 180,     // 0.55 – 1.1 size variety
      delay:    (i % 8) * 0.09,            // 0 – 0.63s stagger
      duration: 1.3 + (s % 100) / 110,     // 1.3 – 2.2s fall
      drift:    -140 + (s % 280),           // horizontal drift px
      spin:     -240 + (s % 480),           // spin while falling
      variant:  i % 3,                      // 3 full flower types
    };
  });

  mapUrlCeremony: SafeResourceUrl;
  mapUrlReception: SafeResourceUrl;


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

    this.mapUrlCeremony = this.sanitizer.bypassSecurityTrustResourceUrl(
      'https://maps.google.com/maps?q=Tegher+Monastery+Tegher+Armenia&output=embed'
    );
    this.mapUrlReception = this.sanitizer.bypassSecurityTrustResourceUrl(
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
    // Let the browser paint the closed curtain first, then open it
    requestAnimationFrame(() => {
      setTimeout(() => {
        this.curtainOpen = true;
        this.cdr.markForCheck();
      }, 800);
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

  // Procedural soap bubble cloud
  private generateFireflies(count: number): Bubble[] {
    const items: Bubble[] = [];
    for (let i = 0; i < count; i++) {
      items.push({
        left:     Math.random() * 100,
        top:      80 + Math.random() * 20,   // start near bottom
        delay:    -Math.random() * 18,
        duration: 12 + Math.random() * 14,
        size:     14 + Math.random() * 32,   // bigger — real bubble scale
        drift:    -40 + Math.random() * 80,
        hue:      Math.floor(Math.random() * 360),
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

    this.http.post(`${environment.apiUrl}/wedding-guests`, payload).subscribe({
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
