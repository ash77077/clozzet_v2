import { Injectable, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter, map } from 'rxjs/operators';

export interface SeoData {
  title: string;
  description: string;
  /** Absolute URL path only (e.g. '/about') — service prepends the base URL */
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
const ADDRESS = 'Sebastia 3/10, Yerevan, Armenia';
const SOCIAL_URLS = [
  'https://www.linkedin.com/company/clozzet1',
  'https://www.facebook.com/people/Clozzet/61576798492197',
  'https://www.instagram.com/clozzet.corp/'
];

const JSON_LD_SCRIPT_ID = 'structured-data';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private title = inject(Title);
  private meta = inject(Meta);
  private doc = inject(DOCUMENT);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);

  /** Call once from AppComponent.ngOnInit */
  init(): void {
    // Apply immediately for the initial hard load (crawlers never see a NavigationEnd)
    const initialRoute = this.deepestChild(this.activatedRoute);
    this.apply(initialRoute.snapshot.data['seo'], this.router.url);

    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(() => this.deepestChild(this.activatedRoute))
    ).subscribe(route => {
      const seo: SeoData | undefined = route.snapshot.data['seo'];
      this.apply(seo, this.router.url);
    });
  }

  apply(seo: SeoData | undefined, currentPath: string): void {
    const path = seo?.path ?? currentPath.split('?')[0];
    const canonical = `${BASE_URL}${path === '/' ? '' : path}`;
    const image = seo?.image ? `${BASE_URL}/images/${seo.image}` : DEFAULT_IMAGE;

    const fullTitle = seo?.title
      ? (seo.title.includes('Clozzet') ? seo.title : `${seo.title} | Clozzet`)
      : ORG_NAME;
    const description = seo?.description ?? 'Custom branded apparel for teams and businesses in Armenia.';

    // ── Title ──────────────────────────────────────────────────────────────
    this.title.setTitle(fullTitle);

    // ── Standard meta ──────────────────────────────────────────────────────
    this.upsertMeta('name', 'description', description);
    if (seo?.noIndex) {
      this.upsertMeta('name', 'robots', 'noindex, nofollow');
    } else {
      this.meta.removeTag('name="robots"');
    }

    // ── Canonical ──────────────────────────────────────────────────────────
    this.upsertLink('canonical', canonical);

    // ── Open Graph ────────────────────────────────────────────────────────
    this.upsertMeta('property', 'og:type', 'website');
    this.upsertMeta('property', 'og:site_name', ORG_NAME);
    this.upsertMeta('property', 'og:locale', 'en_US');
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
    this.upsertJsonLd(canonical);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private upsertMeta(attrName: 'name' | 'property', attrValue: string, content: string): void {
    const selector = `${attrName}="${attrValue}"`;
    if (this.meta.getTag(selector)) {
      this.meta.updateTag({ [attrName]: attrValue, content });
    } else {
      this.meta.addTag({ [attrName]: attrValue, content });
    }
  }

  private upsertLink(rel: string, href: string): void {
    let el = this.doc.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
    if (!el) {
      el = this.doc.createElement('link');
      el.setAttribute('rel', rel);
      this.doc.head.appendChild(el);
    }
    el.setAttribute('href', href);
  }

  private upsertJsonLd(canonical: string): void {
    const schema = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': ['Organization', 'LocalBusiness'],
          '@id': `${BASE_URL}/#organization`,
          name: ORG_NAME,
          url: BASE_URL,
          logo: {
            '@type': 'ImageObject',
            url: `${BASE_URL}/images/logo-black.png`,
            width: 412,
            height: 80
          },
          image: DEFAULT_IMAGE,
          description: 'Custom branded apparel, private label and white label manufacturing for businesses in Armenia.',
          telephone: PHONE,
          email: EMAIL,
          address: {
            '@type': 'PostalAddress',
            streetAddress: 'Sebastia 3/10',
            addressLocality: 'Yerevan',
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
