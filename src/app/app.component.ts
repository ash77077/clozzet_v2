import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';
import { FooterComponent } from './components/footer/footer.component';
import { SecondaryNavbarComponent } from './shared/components/secondary-navbar/secondary-navbar.component';
import { AuthService } from './services/auth.service';
import { Observable } from 'rxjs';
import { map, filter, startWith } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent, FooterComponent, SecondaryNavbarComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'clozzet_v2';
  isAuthenticated$: Observable<boolean>;
  hideNavbars: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router
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
