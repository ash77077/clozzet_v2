import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { NgxGoogleAnalyticsModule } from 'ngx-google-analytics';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [CommonModule, TranslateModule, NgxGoogleAnalyticsModule],
  templateUrl: './hero.component.html',
  styleUrls: ['./hero.component.scss']
})
export class HeroComponent implements OnInit, OnDestroy {
  isDesktop = true;
  private bpSub?: Subscription;

  constructor(private bp: BreakpointObserver) {}

  ngOnInit(): void {
    this.bpSub = this.bp.observe('(min-width: 993px)').subscribe(result => {
      this.isDesktop = result.matches;
    });
  }

  ngOnDestroy(): void {
    this.bpSub?.unsubscribe();
  }

  scrollToQuote(): void {
    const element = document.getElementById('quote-section');
    if (element) element.scrollIntoView({ behavior: 'smooth' });
  }

  scrollToProducts(): void {
    const element = document.getElementById('products-section');
    if (element) element.scrollIntoView({ behavior: 'smooth' });
  }
}
