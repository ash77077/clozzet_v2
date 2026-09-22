import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, Observable } from 'rxjs';

export const SUPPORTED_LANGS = ['en', 'am'] as const;
export type SupportedLang = typeof SUPPORTED_LANGS[number];

/** ISO 639-1 code used in hreflang / html[lang] — maps internal code → BCP 47 */
export const LANG_TO_BCP47: Record<SupportedLang, string> = { en: 'en', am: 'hy' };

@Injectable({ providedIn: 'root' })
export class TranslationService {
  private currentLang$ = new BehaviorSubject<SupportedLang>('en');

  /** Emits the active language code ('en' | 'am') on every change and on init */
  readonly langChange$: Observable<SupportedLang> = this.currentLang$.asObservable();

  constructor(private translate: TranslateService) {
    // APP_INITIALIZER in app.config.ts already called setDefaultLang + use() and awaited
    // the HTTP load. We just sync the BehaviorSubject to whatever is active now.
    const active = this.translate.currentLang as SupportedLang;
    this.currentLang$.next(this.isValid(active) ? active : 'en');

    // Keep BehaviorSubject in sync if language is switched later
    this.translate.onLangChange.subscribe(e => {
      if (this.isValid(e.lang)) this.currentLang$.next(e.lang as SupportedLang);
    });
  }

  switchLanguage(lang: SupportedLang | string): void {
    if (!this.isValid(lang)) return;
    const code = lang as SupportedLang;
    this.translate.use(code);
    localStorage.setItem('language', code);
    this.currentLang$.next(code);
  }

  getCurrentLanguage(): SupportedLang {
    return this.currentLang$.value;
  }

  getSupportedLanguages(): SupportedLang[] {
    return [...SUPPORTED_LANGS];
  }

  instant(key: string, params?: any): string {
    return this.translate.instant(key, params);
  }

  get(key: string, params?: any) {
    return this.translate.get(key, params);
  }

  private isValid(lang: string): boolean {
    return (SUPPORTED_LANGS as readonly string[]).includes(lang);
  }
}
