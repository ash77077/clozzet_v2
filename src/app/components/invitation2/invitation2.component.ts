import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChild,
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

  private readonly weddingDate = new Date('2026-07-31T17:30:00+04:00').getTime();

  curtainOpen = false;
  envelopeOpened = false;
  envelopeHidden = false;
  tapHintVisible = false;

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
      title: 'Փեսայի տուն',
      venue: 'Դավթաշեն',
      address: 'Գրիգոր Աղաբաբյան 9',
      mapQuery: 'Yerevan, Grigor Aghababyan 9',
      icon: 'groom'
    },
    {
      time: '12:30',
      title: 'Հարսի տուն',
      venue: 'Դավթաշեն',
      address: 'Hayk Asatryan Bride House',
      mapQuery: 'Азата Шеренца, 2/6 Yerevan Armenia',
      icon: 'bride'
    },
    {
      time: '15:00',
      title: 'Պսակադրություն',
      venue: 'Տեղերի Վանք',
      address: 'Tegher, Monastery',
      mapQuery: 'Tegher Monastery Armenia',
      icon: 'church'
    },
    {
      time: '17:30',
      title: 'Խնջույքի վայրը',
      venue: 'Platinium Hall',
      address: 'Գ․ Մուղնի',
      mapQuery: 'Platinium Wedding Hall, Mughni, Armenia',
      icon: 'reception'
    }
  ];

  mapUrlCeremony: SafeResourceUrl;
  mapUrlReception: SafeResourceUrl;

  // Õ“Õ¸ÖƒÕ¸Õ­Õ¾Õ¡Õ® ÕÕ¥Õ¯ÖÕ«Õ¡Õ¶Õ¥Ö€Õ« Ö‡ Õ”Õ¡Ö€Õ¿Õ¥Ö€Õ« Observer-Õ¶Õ¥Ö€
  @ViewChildren('revealSection') revealSections!: QueryList<ElementRef<HTMLElement>>;
  @ViewChildren('revealCard') revealCards!: QueryList<ElementRef<HTMLElement>>; // Õ…Õ¸Ö‚Ö€Õ¡Ö„Õ¡Õ¶Õ¹ÕµÕ¸Ö‚Ö€ Ö„Õ¡Ö€Õ¿ Õ¡Õ¼Õ¡Õ¶Õ±Õ«Õ¶
  @ViewChild('routePath') routePathRef?: ElementRef<SVGPathElement>;
  @ViewChild('timelineSection') timelineSectionRef?: ElementRef<HTMLElement>;
  @ViewChild('bgAudio') bgAudioRef?: ElementRef<HTMLAudioElement>;
  @ViewChild('weddingVideo') weddingVideoRef?: ElementRef<HTMLVideoElement>;

  isMuted = false;

  indicatorX = 50;
  indicatorY = 0;
  pathLength = 0;      // SVG Õ£Õ®Õ« Õ¨Õ¶Õ¤Õ°Õ¡Õ¶Õ¸Ö‚Ö€ Õ¥Ö€Õ¯Õ¡Ö€Õ¸Ö‚Õ©ÕµÕ¸Ö‚Õ¶Õ¨
  activeProgress = 0;  // Ô¸Õ¶Õ©Õ¡ÖÕ«Õ¯ Õ½Ö„Ö€Õ¸Õ¬Õ« Õ¡Õ¼Õ¡Õ»Õ¨Õ¶Õ©Õ¡ÖÕ¨ (0-Õ«Ö 1)
  routeStopPoints: { x: number; y: number; label: string; threshold: number }[] = [];

  private scrollListener?: () => void;
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
      'https://yandex.com/maps/?text=Tegher+Monastery+Armenia&output=embed&z=14'
    );
    this.mapUrlReception = this.sanitizer.bypassSecurityTrustResourceUrl(
      'https://yandex.com/maps/-/CTuyeT4R'
    );
  }

  ngOnInit(): void {
    this.updateCountdown();
    this.countdownTimer = window.setInterval(() => {
      this.updateCountdown();
      this.cdr.markForCheck();
    }, 1000);
    document.body.classList.add('invitation2-active');
    setTimeout(() => { this.tapHintVisible = true; this.cdr.markForCheck(); }, 3000);
  }

  ngAfterViewInit(): void {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      this.revealSections.forEach(s => s.nativeElement.classList.add('is-visible'));
      this.revealCards.forEach(c => c.nativeElement.classList.add('is-visible'));
      return;
    }

    // Õ•ÕºÕ¿Õ«Õ´Õ¡Õ¬ IntersectionObserver
    this.observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            this.observer?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -5% 0px' }
    );

    // Ô´Õ«Õ¿Õ¡Ö€Õ¯Õ¸Ö‚Õ´ Õ¥Õ¶Ö„ Õ½Õ¸Õ¾Õ¸Ö€Õ¡Õ¯Õ¡Õ¶ Õ½Õ¥Õ¯ÖÕ«Õ¡Õ¶Õ¥Ö€Õ¨
    this.revealSections.forEach(section => this.observer!.observe(section.nativeElement));

    // Ô´Õ«Õ¿Õ¡Ö€Õ¯Õ¸Ö‚Õ´ Õ¥Õ¶Ö„ Õ©Õ¡ÕµÕ´Õ¬Õ¡ÕµÕ¶Õ« Ö„Õ¡Ö€Õ¿Õ¥Ö€Õ¨ Õ¡Õ¼Õ¡Õ¶Õ±Õ«Õ¶-Õ¡Õ¼Õ¡Õ¶Õ±Õ«Õ¶
    this.revealCards.forEach(card => this.observer!.observe(card.nativeElement));

    requestAnimationFrame(() => {
      this.computeStopPoints();
      this.onWindowScroll();
      this.cdr.markForCheck();
    });

    this.scrollListener = () => {
      this.onWindowScroll();
      this.cdr.markForCheck();
    };

    window.addEventListener('scroll', this.scrollListener, { passive: true });
    window.addEventListener('resize', this.scrollListener, { passive: true });

    // Play video when it enters the viewport
    const video = this.weddingVideoRef?.nativeElement;
    if (video) {
      const videoObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              video.play().catch(() => {});
            } else {
              video.pause();
            }
          });
        },
        { threshold: 0.3 }
      );
      videoObserver.observe(video);
    }
  }

  ngOnDestroy(): void {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    this.observer?.disconnect();
    if (this.scrollListener) {
      window.removeEventListener('scroll', this.scrollListener);
      window.removeEventListener('resize', this.scrollListener);
    }
    document.body.classList.remove('invitation2-active');
  }

  openEnvelope(): void {
    if (this.envelopeOpened) return;
    this.envelopeOpened = true;
    this.cdr.markForCheck();

    // Start music when envelope is opened
    const audio = this.bgAudioRef?.nativeElement;
    if (audio) {
      audio.volume = 0.7;
      audio.play().catch(() => {});
    }

    setTimeout(() => {
      this.envelopeHidden = true;
      this.curtainOpen = true;
      this.cdr.markForCheck();
    }, 1800);
  }

  toggleMute(): void {
    const audio = this.bgAudioRef?.nativeElement;
    if (!audio) return;
    this.isMuted = !this.isMuted;
    audio.muted = this.isMuted;
    this.cdr.markForCheck();
  }

  private computeStopPoints(): void {
    const path = this.routePathRef?.nativeElement;
    if (!path) return;

    const total = path.getTotalLength();
    this.pathLength = total;

    const startPt = path.getPointAtLength(0);
    this.indicatorX = startPt.x;
    this.indicatorY = startPt.y;

    const itemsCount = this.timeline.length;
    this.routeStopPoints = this.timeline.map((event, i) => {
      // ÕˆÖ€Õ¸Õ·Õ¸Ö‚Õ´ Õ¥Õ¶Ö„ ÕµÕ¸Ö‚Ö€Õ¡Ö„Õ¡Õ¶Õ¹ÕµÕ¸Ö‚Ö€ Õ¯Õ¥Õ¿Õ« Õ¿Õ¸Õ¯Õ¸Õ½Õ¡ÕµÕ«Õ¶ Õ·Õ¥Õ´Õ¨ (threshold) Õ£Õ®Õ« Õ¾Ö€Õ¡
      const pct = itemsCount > 0 ? (i + 0.5) / itemsCount : 0.5;
      const pt  = path.getPointAtLength(pct * total);
      return { x: pt.x, y: pt.y, label: event.title, threshold: pct };
    });
  }

  private onWindowScroll(): void {
    const path = this.routePathRef?.nativeElement;
    const timelineSec = this.timelineSectionRef?.nativeElement;
    if (!path || !timelineSec) return;

    // Õ€Õ¡Õ·Õ¾Õ¡Ö€Õ¯Õ¸Ö‚Õ´ Õ¥Õ¶Ö„ Õ½Ö„Ö€Õ¸Õ¬Õ¨Õ Õ°Õ«Õ´Õ¶Õ¾Õ¥Õ¬Õ¸Õ¾ Õ©Õ¡ÕµÕ´Õ¬Õ¡ÕµÕ¶ Õ½Õ¥Õ¯ÖÕ«Õ¡ÕµÕ« Õ¤Õ«Ö€Ö„Õ« Õ¾Ö€Õ¡
    const rect = timelineSec.getBoundingClientRect();
    const viewHeight = window.innerHeight;

    // Ô±Õ¶Õ«Õ´Õ¡ÖÕ«Õ¡Õ¶ Õ½Õ¯Õ½Õ¾Õ¸Ö‚Õ´ Õ§, Õ¥Ö€Õ¢ Õ©Õ¡ÕµÕ´Õ¬Õ¡ÕµÕ¶Õ« Õ£Õ¬Õ¸Ö‚Õ­Õ¨ Õ°Õ¡Õ½Õ¶Õ¸Ö‚Õ´ Õ§ Õ§Õ¯Ö€Õ¡Õ¶Õ« 80%-Õ«Õ¶
    // Ö‡ Õ¡Õ¾Õ¡Ö€Õ¿Õ¾Õ¸Ö‚Õ´ Õ§, Õ¥Ö€Õ¢ Õ©Õ¡ÕµÕ´Õ¬Õ¡ÕµÕ¶Õ« Õ¾Õ¥Ö€Õ»Õ¨ Õ¢Õ¡Ö€Õ±Ö€Õ¡Õ¶Õ¸Ö‚Õ´ Õ§ Õ§Õ¯Ö€Õ¡Õ¶Õ« 20%-Õ«Ö
    const startThreshold = viewHeight * 0.8;
    const endThreshold = viewHeight * 0.2;

    const totalDistance = rect.height + (startThreshold - endThreshold);
    const currentProgress = startThreshold - rect.top;

    let progress = totalDistance > 0 ? currentProgress / totalDistance : 0;
    progress = Math.max(0, Math.min(1, progress)); // Õ½Õ¡Õ°Õ´Õ¡Õ¶Õ¡ÖƒÕ¡Õ¯Õ¸Ö‚Õ´ Õ¥Õ¶Ö„ 0-1 Õ´Õ«Õ»Õ¡Õ¯Õ¡ÕµÖ„Õ¸Ö‚Õ´

    this.activeProgress = progress;

    const len = path.getTotalLength();
    const pt  = path.getPointAtLength(progress * len);

    this.indicatorX = pt.x;
    this.indicatorY = pt.y;
  }

  scrollToRsvp(): void {
    const el = document.getElementById('rsvp');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  openMap(query: string): void {
    const url = `https://yandex.com/maps/?text=${encodeURIComponent(query)}`;
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








