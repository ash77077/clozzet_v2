import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';
import { FooterComponent } from './components/footer/footer.component';
import { SecondaryNavbarComponent } from './shared/components/secondary-navbar/secondary-navbar.component';
import { AiChatWidgetComponent } from './shared/components/ai-chat-widget/ai-chat-widget.component';
import { AuthService } from './services/auth.service';
import { AiService } from './services/ai.service';
import { Observable } from 'rxjs';
import { map, filter, startWith } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent, FooterComponent, SecondaryNavbarComponent, AiChatWidgetComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'clozzet_v2';
  isAuthenticated$: Observable<boolean>;
  hideNavbars: boolean = false;
  get aiEnabled$() { return this.aiService.aiEnabled$; }

  constructor(
    private authService: AuthService,
    private router: Router,
    private aiService: AiService
  ) {
    this.isAuthenticated$ = this.authService.currentUser$.pipe(
      map(user => !!user)
    );
    // Translation service is automatically initialized
  }

  ngOnInit() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      startWith(null)
    ).subscribe(() => {
      this.checkRoute(this.router.url);
    });
  }

  private checkRoute(url: string) {
    const noNavbarRoutes = [/^\/order-blank\/[^\/]+$/, /^\/login$/, /^\/register$/, /^\/reset-password$/];
    this.hideNavbars = noNavbarRoutes.some(pattern => pattern.test(url.split('?')[0]));
  }
}
