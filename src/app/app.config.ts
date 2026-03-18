import { ApplicationConfig, provideZoneChangeDetection, Injectable, importProvidersFrom } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import Aura from '@primeuix/themes/aura';
import { provideTranslateService, TranslateLoader } from '@ngx-translate/core';
import { Observable } from 'rxjs';

import { routes } from './app.routes';
import {providePrimeNG} from "primeng/config";
import {provideAnimations} from "@angular/platform-browser/animations";

// Google Analytics 4 Integration
import { NgxGoogleAnalyticsModule, NgxGoogleAnalyticsRouterModule } from 'ngx-google-analytics';
import { environment } from '../environments/environment';

// Custom Translation Loader
@Injectable()
export class CustomTranslateLoader implements TranslateLoader {
  constructor(private http: HttpClient) {}

  getTranslation(lang: string): Observable<any> {
    return this.http.get(`/assets/i18n/${lang}.json`);
  }
}

// Translation loader factory
const httpLoaderFactory: (http: HttpClient) => CustomTranslateLoader = (http: HttpClient) =>
  new CustomTranslateLoader(http);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withInMemoryScrolling({
      scrollPositionRestoration: 'top'
    })),
    provideAnimations(),
    provideHttpClient(withInterceptors([AuthInterceptor])),
    providePrimeNG({
      theme: {
        preset: Aura,
        options: { darkModeSelector: '.app-dark' },
      },
    }),
    provideTranslateService({
      fallbackLang: 'en',
      loader: {
        provide: TranslateLoader,
        useFactory: httpLoaderFactory,
        deps: [HttpClient]
      }
    }),
    // Google Analytics 4 Configuration
    // NgxGoogleAnalyticsModule: Core GA4 functionality
    // NgxGoogleAnalyticsRouterModule: Automatically tracks route changes as page views
    // Securely pulls GA Measurement ID from environment.ts
    importProvidersFrom([
      NgxGoogleAnalyticsModule.forRoot(environment.googleAnalyticsId),
      NgxGoogleAnalyticsRouterModule
    ])
  ]
};
