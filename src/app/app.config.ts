import { ApplicationConfig, provideZoneChangeDetection, importProvidersFrom, APP_INITIALIZER } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import Aura from '@primeuix/themes/aura';
import { TranslateModule, TranslateLoader, TranslateService } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { firstValueFrom } from 'rxjs';

import { routes } from './app.routes';
import { providePrimeNG } from 'primeng/config';
import { provideAnimations } from '@angular/platform-browser/animations';

// Google Analytics 4 Integration
import { NgxGoogleAnalyticsModule, NgxGoogleAnalyticsRouterModule } from 'ngx-google-analytics';
import { environment } from '../environments/environment';

export function httpLoaderFactory(): TranslateHttpLoader {
  return new TranslateHttpLoader();
}

// Preload translations before the app renders so no component ever sees raw keys
function preloadTranslations(translate: TranslateService): () => Promise<void> {
  return async () => {
    translate.setDefaultLang('en');
    const saved = localStorage.getItem('language');
    const lang = (saved === 'en' || saved === 'am') ? saved : 'en';
    await firstValueFrom(translate.use(lang));
  };
}

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
    importProvidersFrom(
      TranslateModule.forRoot({
        defaultLanguage: 'en',
        loader: {
          provide: TranslateLoader,
          useFactory: httpLoaderFactory
        }
      })
    ),
    {
      provide: APP_INITIALIZER,
      useFactory: preloadTranslations,
      deps: [TranslateService],
      multi: true
    },
    // Google Analytics 4 Configuration
    importProvidersFrom([
      NgxGoogleAnalyticsModule.forRoot(environment.googleAnalyticsId),
      NgxGoogleAnalyticsRouterModule
    ])
  ]
};
