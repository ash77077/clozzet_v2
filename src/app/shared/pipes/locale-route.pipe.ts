import { Pipe, PipeTransform } from '@angular/core';
import { TranslationService, LOCALE_PREFIX, SupportedLang } from '../../services/translation.service';

@Pipe({ name: 'localeRoute', standalone: true, pure: false })
export class LocaleRoutePipe implements PipeTransform {
  constructor(private translationService: TranslationService) {}

  transform(basePath: string): string {
    const lang = this.translationService.getCurrentLanguage();
    const prefix = LOCALE_PREFIX[lang as SupportedLang] ?? '';
    if (basePath === '/') return prefix ? `${prefix}/` : '/';
    return `${prefix}${basePath}`;
  }
}
