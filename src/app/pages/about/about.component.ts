import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss']
})
export class AboutComponent {
  constructor(private router: Router) {}

  getQuote(): void {
    this.router.navigate(['/contact']);
  }

  companyStats = [
    { number: '1', labelKey: 'about.stats.yearsExperience', icon: 'calendar' },
    { number: '150+', labelKey: 'about.stats.happyClients', icon: 'users' },
    { number: '3K+', labelKey: 'about.stats.itemsDelivered', icon: 'package' },
    { number: '93%', labelKey: 'about.stats.satisfactionRate', icon: 'star' }
  ];

  team = [
    {
      nameKey: 'about.team.members.ceo.name',
      positionKey: 'about.team.members.ceo.position',
      image: 'https://images.unsplash.com/photo-1494790108755-2616b612b412?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
      bioKey: 'about.team.members.ceo.bio'
    },
    {
      nameKey: 'about.team.members.production.name',
      positionKey: 'about.team.members.production.position',
      image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
      bioKey: 'about.team.members.production.bio'
    },
    {
      nameKey: 'about.team.members.design.name',
      positionKey: 'about.team.members.design.position',
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
      bioKey: 'about.team.members.design.bio'
    }
  ];

  values = [
    {
      titleKey: 'about.values.quality.title',
      descriptionKey: 'about.values.quality.description',
      icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
    },
    {
      titleKey: 'about.values.innovation.title',
      descriptionKey: 'about.values.innovation.description',
      icon: 'M13 10V3L4 14h7v7l9-11h-7z'
    },
    {
      titleKey: 'about.values.partnership.title',
      descriptionKey: 'about.values.partnership.description',
      icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'
    },
  ];
}
