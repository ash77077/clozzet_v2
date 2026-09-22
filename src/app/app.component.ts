import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';
import { FooterComponent } from './components/footer/footer.component';
import { SecondaryNavbarComponent } from './shared/components/secondary-navbar/secondary-navbar.component';
import { AiChatWidgetComponent } from './shared/components/ai-chat-widget/ai-chat-widget.component';
import { AuthService } from './services/auth.service';
import { AiService } from './services/ai.service';
import { SeoService } from './services/seo.service';
import { TranslationService, LANG_TO_BCP47 } from './services/translation.service';
import { Observable } from 'rxjs';
import { map, filter } from 'rxjs/operators';
import {KpiBadgeComponent} from "./shared/components/kpi-badge/kpi-badge.component";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent, FooterComponent, SecondaryNavbarComponent, AiChatWidgetComponent, KpiBadgeComponent, KpiBadgeComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'clozzet_v2';
  isAuthenticated$: Observable<boolean>;
  hideNavbars: boolean = false;
  get aiEnabled$() { return this.aiService.aiEnabled$; }

  private doc = inject(DOCUMENT);

  constructor(
    private authService: AuthService,
    private router: Router,
    private aiService: AiService,
    private seoService: SeoService,
    private translationService: TranslationService
  ) {
    this.isAuthenticated$ = this.authService.currentUser$.pipe(
      map(user => !!user)
    );

    // Set html[lang] immediately from persisted language (before first NavigationEnd)
    const lang = this.translationService.getCurrentLanguage();
    this.doc.documentElement.lang = LANG_TO_BCP47[lang];
  }

  ngOnInit() {
    this.checkRoute(window.location.pathname);
    this.seoService.init();

    // Keep html[lang] in sync whenever language is switched outside of route navigation
    this.translationService.langChange$.subscribe(lang => {
      this.doc.documentElement.lang = LANG_TO_BCP47[lang];
    });

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event) => {
      this.checkRoute((event as NavigationEnd).urlAfterRedirects);
    });
  }

  private checkRoute(url: string) {
    const noNavbarRoutes = [/^\/order-blank\/[^\/]+$/, /^\/login$/, /^\/register$/, /^\/reset-password$/, /^\/invitation$/, /^\/invitation2$/, /^\/ash-gog-wedding-invitation$/];
    this.hideNavbars = noNavbarRoutes.some(pattern => pattern.test(url.split('?')[0]));
  }
}
