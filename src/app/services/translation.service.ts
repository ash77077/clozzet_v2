import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private currentLang: string = 'en';

  constructor(private translate: TranslateService) {
    this.initializeLanguage();
  }

  private initializeLanguage(): void {
    // Set default language
    this.translate.setDefaultLang('en');

    // Try to get saved language from localStorage
    const savedLang = localStorage.getItem('language');

    if (savedLang && this.isValidLanguage(savedLang)) {
      this.currentLang = savedLang;
    } else {
      // Try to get browser language
      const browserLang = this.translate.getBrowserLang();
      this.currentLang = browserLang && this.isValidLanguage(browserLang) ? browserLang : 'en';
    }

    // Set the language
    this.translate.use(this.currentLang);
  }

  /**
   * Switch to a different language
   * @param lang Language code (e.g., 'en', 'am')
   */
  switchLanguage(lang: string): void {
    if (this.isValidLanguage(lang)) {
      this.currentLang = lang;
      this.translate.use(lang);
      localStorage.setItem('language', lang);
    }
  }

  /**
   * Get the current language
   * @returns Current language code
   */
  getCurrentLanguage(): string {
    return this.currentLang;
  }

  /**
   * Get instant translation for a key
   * @param key Translation key
   * @param params Optional parameters for interpolation
   * @returns Translated string
   */
  instant(key: string, params?: any): string {
    return this.translate.instant(key, params);
  }

  /**
   * Get async translation for a key
   * @param key Translation key
   * @param params Optional parameters for interpolation
   */
  get(key: string, params?: any) {
    return this.translate.get(key, params);
  }

  /**
   * Check if a language is valid/supported
   * @param lang Language code
   * @returns True if language is supported
   */
  private isValidLanguage(lang: string): boolean {
    const supportedLanguages = ['en', 'am'];
    return supportedLanguages.includes(lang);
  }

  /**
   * Get list of supported languages
   * @returns Array of supported language codes
   */
  getSupportedLanguages(): string[] {
    return ['en', 'am'];
  }
}