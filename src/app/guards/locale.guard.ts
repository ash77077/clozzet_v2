import { inject } from '@angular/core';
import { CanActivateFn, ActivatedRouteSnapshot } from '@angular/router';
import { DOCUMENT } from '@angular/common';
import { TranslationService, LANG_TO_BCP47, SupportedLang } from '../services/translation.service';

export const localeGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const translationService = inject(TranslationService);
  const doc = inject(DOCUMENT);

  const locale = (route.data['locale'] as SupportedLang) ?? 'en';
  translationService.switchLanguage(locale);
  doc.documentElement.lang = LANG_TO_BCP47[locale];

  return true;
};
