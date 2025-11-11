import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';
import { FooterComponent } from './components/footer/footer.component';
import { SecondaryNavbarComponent } from './shared/components/secondary-navbar/secondary-navbar.component';
import { AuthService } from './services/auth.service';
import { Observable } from 'rxjs';
import { map, filter } from 'rxjs/operators';

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
    // Check current route on init
    this.checkRoute(this.router.url);

    // Subscribe to route changes
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.checkRoute(event.url);
    });
  }

  private checkRoute(url: string) {
    // Hide navbars and footer when viewing an order (URL matches /order-blank/:id)
    const orderBlankPattern = /^\/order-blank\/[^\/]+$/;
    this.hideNavbars = orderBlankPattern.test(url);
  }
}
