import { Injectable, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { TranslationService, LANG_TO_BCP47, SupportedLang } from './translation.service';

export interface SeoData {
  title: string;
  description: string;
  /** Absolute URL path only (e.g. '/about' or '/hy/about') — service prepends base URL */
  path?: string;
  /** Relative path to share image under /images/, defaults to 'share.jpg' */
  image?: string;
  noIndex?: boolean;
}

const BASE_URL = 'https://clozzet.am';
const DEFAULT_IMAGE = `${BASE_URL}/images/share.jpg`;
const ORG_NAME = 'Clozzet';
const PHONE = '+37444010744';
const EMAIL = 'sales@clozzet.am';
const SOCIAL_URLS = [
  'https://www.linkedin.com/company/clozzet1',
  'https://www.facebook.com/people/Clozzet/61576798492197',
  'https://www.instagram.com/clozzet.corp/'
];

/** Maps each public path (without locale prefix) to its canonical path segment */
const PUBLIC_PATHS = ['', 'about', 'products', 'services', 'portfolio', 'contact', 'privacy', 'terms', 'cookies'];

const JSON_LD_SCRIPT_ID = 'structured-data';
const HREFLANG_IDS = { en: 'hreflang-en', hy: 'hreflang-hy', xd: 'hreflang-xdefault' };

@Injectable({ providedIn: 'root' })
export class SeoService {
  private titleSvc = inject(Title);
  private meta = inject(Meta);
  private doc = inject(DOCUMENT);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private translationService = inject(TranslationService);

  /** Call once from AppComponent.ngOnInit */
  init(): void {
    // Apply immediately for the initial hard load
    const initialRoute = this.deepestChild(this.activatedRoute);
    this.apply(initialRoute.snapshot.data['seo'], this.router.url);

    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(() => this.deepestChild(this.activatedRoute))
    ).subscribe(route => {
      this.apply(route.snapshot.data['seo'], this.router.url);
    });
  }

  apply(seo: SeoData | undefined, currentUrl: string): void {
    const lang = this.translationService.getCurrentLanguage();
    const bcp47 = LANG_TO_BCP47[lang];
    const rawPath = seo?.path ?? currentUrl.split('?')[0];
    const canonical = `${BASE_URL}${rawPath === '/' ? '' : rawPath}`;
    const image = seo?.image ? `${BASE_URL}/images/${seo.image}` : DEFAULT_IMAGE;
    const ogLocale = lang === 'am' ? 'hy_AM' : 'en_US';
    const ogLocaleAlt = lang === 'am' ? 'en_US' : 'hy_AM';

    const fullTitle = seo?.title
      ? (seo.title.includes('Clozzet') ? seo.title : `${seo.title} | Clozzet`)
      : ORG_NAME;
    const description = seo?.description ?? 'Custom branded apparel for teams and businesses in Armenia.';

    // ── html[lang] ────────────────────────────────────────────────────────
    this.doc.documentElement.lang = bcp47;

    // ── Title ─────────────────────────────────────────────────────────────
    this.titleSvc.setTitle(fullTitle);

    // ── Standard meta ─────────────────────────────────────────────────────
    this.upsertMeta('name', 'description', description);
    if (seo?.noIndex) {
      this.upsertMeta('name', 'robots', 'noindex, nofollow');
    } else {
      this.meta.removeTag('name="robots"');
    }

    // ── Canonical ─────────────────────────────────────────────────────────
    this.upsertLink('canonical', canonical);

    // ── hreflang alternates ───────────────────────────────────────────────
    this.upsertHreflang(seo, rawPath);

    // ── Open Graph ────────────────────────────────────────────────────────
    this.upsertMeta('property', 'og:type', 'website');
    this.upsertMeta('property', 'og:site_name', ORG_NAME);
    this.upsertMeta('property', 'og:locale', ogLocale);
    this.upsertMeta('property', 'og:locale:alternate', ogLocaleAlt);
    this.upsertMeta('property', 'og:title', fullTitle);
    this.upsertMeta('property', 'og:description', description);
    this.upsertMeta('property', 'og:url', canonical);
    this.upsertMeta('property', 'og:image', image);
    this.upsertMeta('property', 'og:image:width', '1200');
    this.upsertMeta('property', 'og:image:height', '630');
    this.upsertMeta('property', 'og:image:alt', `${ORG_NAME} — ${description.slice(0, 80)}`);

    // ── Twitter Card ──────────────────────────────────────────────────────
    this.upsertMeta('name', 'twitter:card', 'summary_large_image');
    this.upsertMeta('name', 'twitter:title', fullTitle);
    this.upsertMeta('name', 'twitter:description', description);
    this.upsertMeta('name', 'twitter:image', image);

    // ── JSON-LD ───────────────────────────────────────────────────────────
    this.upsertJsonLd(canonical, bcp47, lang);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private upsertHreflang(seo: SeoData | undefined, rawPath: string): void {
    // Derive the canonical page path without locale prefix
    const pagePath = rawPath.startsWith('/hy') ? rawPath.slice(3) || '/' : rawPath;
    const isPublic = PUBLIC_PATHS.some(p => {
      const full = p ? `/${p}` : '/';
      return pagePath === full || pagePath.startsWith(`/${p}/`);
    });

    if (!isPublic || seo?.noIndex) {
      // Remove hreflang tags from non-public pages
      Object.values(HREFLANG_IDS).forEach(id => this.doc.getElementById(id)?.remove());
      return;
    }

    const enPath = pagePath === '/' ? '' : pagePath;
    const enUrl = `${BASE_URL}${enPath}`;
    const hyUrl = `${BASE_URL}/hy${enPath || '/'}`;

    this.upsertLinkById(HREFLANG_IDS.en, 'alternate', enUrl, 'en');
    this.upsertLinkById(HREFLANG_IDS.hy, 'alternate', hyUrl, 'hy');
    this.upsertLinkById(HREFLANG_IDS.xd, 'alternate', enUrl, 'x-default');
  }

  private upsertMeta(attrName: 'name' | 'property', attrValue: string, content: string): void {
    const selector = `${attrName}="${attrValue}"`;
    if (this.meta.getTag(selector)) {
      this.meta.updateTag({ [attrName]: attrValue, content });
    } else {
      this.meta.addTag({ [attrName]: attrValue, content });
    }
  }

  private upsertLink(rel: string, href: string): void {
    let el = this.doc.querySelector(`link[rel="${rel}"]:not([hreflang])`) as HTMLLinkElement | null;
    if (!el) {
      el = this.doc.createElement('link');
      el.setAttribute('rel', rel);
      this.doc.head.appendChild(el);
    }
    el.setAttribute('href', href);
  }

  private upsertLinkById(id: string, rel: string, href: string, hreflang: string): void {
    let el = this.doc.getElementById(id) as HTMLLinkElement | null;
    if (!el) {
      el = this.doc.createElement('link');
      el.id = id;
      el.setAttribute('rel', rel);
      el.setAttribute('hreflang', hreflang);
      this.doc.head.appendChild(el);
    }
    el.setAttribute('href', href);
  }

  private upsertJsonLd(canonical: string, bcp47: string, lang: SupportedLang): void {
    // Armenian fields are TODO — team will supply translations
    const isArmenian = lang === 'am';

    const schema = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': ['Organization', 'LocalBusiness'],
          '@id': `${BASE_URL}/#organization`,
          name: isArmenian ? 'TODO: Clozzet (Armenian)' : ORG_NAME,
          url: BASE_URL,
          inLanguage: bcp47,
          logo: {
            '@type': 'ImageObject',
            url: `${BASE_URL}/images/logo-black.png`,
            width: 412,
            height: 80
          },
          image: DEFAULT_IMAGE,
          description: isArmenian
            ? 'TODO: Armenian description'
            : 'Custom branded apparel, private label and white label manufacturing for businesses in Armenia.',
          telephone: PHONE,
          email: EMAIL,
          address: {
            '@type': 'PostalAddress',
            streetAddress: isArmenian ? 'TODO: Sebastia 3/10 (Armenian)' : 'Sebastia 3/10',
            addressLocality: isArmenian ? 'TODO: Yerevan (Armenian)' : 'Yerevan',
            addressCountry: 'AM'
          },
          geo: {
            '@type': 'GeoCoordinates',
            latitude: 40.18111,
            longitude: 44.51361
          },
          openingHoursSpecification: [
            {
              '@type': 'OpeningHoursSpecification',
              dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
              opens: '09:00',
              closes: '18:00'
            }
          ],
          sameAs: SOCIAL_URLS,
          currenciesAccepted: 'AMD, USD',
          priceRange: '$$'
        },
        {
          '@type': 'WebPage',
          '@id': `${canonical}#webpage`,
          url: canonical,
          inLanguage: bcp47,
          isPartOf: { '@id': `${BASE_URL}/#website` }
        }
      ]
    };

    let script = this.doc.getElementById(JSON_LD_SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = this.doc.createElement('script');
      script.id = JSON_LD_SCRIPT_ID;
      script.type = 'application/ld+json';
      this.doc.head.appendChild(script);
    }
    script.textContent = JSON.stringify(schema);
  }

  private deepestChild(route: ActivatedRoute): ActivatedRoute {
    let r = route;
    while (r.firstChild) r = r.firstChild;
    return r;
  }
}
