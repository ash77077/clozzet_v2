import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeroComponent } from '../../components/hero/hero.component';
import { ProductsComponent } from '../../components/products/products.component';
import { ServicesComponent } from '../../components/services/services.component';
import { QuoteFormComponent } from '../../components/quote-form/quote-form.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    HeroComponent,
    ProductsComponent,
    ServicesComponent,
    QuoteFormComponent
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  showChristmasTheme = environment.features.christmasTheme;
  snowflakes: number[] = [];

  ngOnInit(): void {
    if (this.showChristmasTheme) {
      // Generate 50 snowflakes with random properties
      this.snowflakes = Array.from({ length: 50 }, (_, i) => i);
    }
  }

  getSnowflakeStyle(index: number) {
    const left = Math.random() * 100;
    const animationDelay = Math.random() * 10;
    const fontSize = Math.random() * 10 + 10;
    const animationDuration = Math.random() * 10 + 10;

    return {
      left: `${left}%`,
      animationDelay: `${animationDelay}s`,
      fontSize: `${fontSize}px`,
      animationDuration: `${animationDuration}s`
    };
  }
}
