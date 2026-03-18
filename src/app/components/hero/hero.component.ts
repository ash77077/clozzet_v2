import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import {NgxGoogleAnalyticsModule} from "ngx-google-analytics";

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [CommonModule, TranslateModule, NgxGoogleAnalyticsModule],
  templateUrl: './hero.component.html',
  styleUrls: ['./hero.component.scss']
})
export class HeroComponent {
  scrollToQuote(): void {
    const element = document.getElementById('quote-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }

  scrollToProducts(): void {
    const element = document.getElementById('products-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }
}
