import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

interface Service {
  id: number;
  titleKey: string;
  descriptionKey: string;
  icon: string;
  featureKeys: string[];
  highlight?: boolean;
}

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './services.component.html',
  styleUrls: ['./services.component.scss']
})
export class ServicesComponent {
  services: Service[] = [
    {
      id: 1,
      titleKey: 'services.items.bulkDiscount.title',
      descriptionKey: 'services.items.bulkDiscount.description',
      icon: 'discount',
      featureKeys: [
        'services.items.bulkDiscount.features.tier1',
        'services.items.bulkDiscount.features.tier2',
        'services.items.bulkDiscount.features.tier3',
        'services.items.bulkDiscount.features.tier4'
      ]
    },
    {
      id: 2,
      titleKey: 'services.items.fastTurnaround.title',
      descriptionKey: 'services.items.fastTurnaround.description',
      icon: 'clock',
      featureKeys: [
        'services.items.fastTurnaround.features.standard',
        'services.items.fastTurnaround.features.rush',
        'services.items.fastTurnaround.features.tracking',
        'services.items.fastTurnaround.features.guaranteed'
      ],
      highlight: true
    },
    {
      id: 3,
      titleKey: 'services.items.premiumQuality.title',
      descriptionKey: 'services.items.premiumQuality.description',
      icon: 'quality',
      featureKeys: [
        'services.items.premiumQuality.features.fabric',
        'services.items.premiumQuality.features.printing',
        'services.items.premiumQuality.features.inspection',
        'services.items.premiumQuality.features.guarantee'
      ]
    },
    {
      id: 4,
      titleKey: 'services.items.customBranding.title',
      descriptionKey: 'services.items.customBranding.description',
      icon: 'design',
      featureKeys: [
        'services.items.customBranding.features.design',
        'services.items.customBranding.features.methods',
        'services.items.customBranding.features.matching',
        'services.items.customBranding.features.compliance'
      ]
    },
    {
      id: 5,
      titleKey: 'services.items.accountManagement.title',
      descriptionKey: 'services.items.accountManagement.description',
      icon: 'support',
      featureKeys: [
        'services.items.accountManagement.features.manager',
        'services.items.accountManagement.features.history',
        'services.items.accountManagement.features.reorder',
        'services.items.accountManagement.features.support'
      ]
    },
    {
      id: 6,
      titleKey: 'services.items.globalShipping.title',
      descriptionKey: 'services.items.globalShipping.description',
      icon: 'shipping',
      featureKeys: [
        'services.items.globalShipping.features.worldwide',
        'services.items.globalShipping.features.options',
        'services.items.globalShipping.features.tracking',
        'services.items.globalShipping.features.insurance'
      ]
    }
  ];

  stats = [
    { number: '500+', labelKey: 'services.stats.clients', icon: 'users' },
    { number: '50K+', labelKey: 'services.stats.items', icon: 'package' },
    { number: '99%', labelKey: 'services.stats.satisfaction', icon: 'star' },
    { number: '7', labelKey: 'services.stats.turnaround', icon: 'clock' }
  ];

  getIconPath(iconName: string): string {
    const iconPaths = {
      discount: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1',
      clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
      quality: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      design: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM7 21h10a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 002 2z',
      support: 'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 100 19.5 9.75 9.75 0 000-19.5z',
      shipping: 'M8 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      users: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a4 4 0 11-8 0 4 4 0 018 0z',
      package: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
      star: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z'
    };
    return iconPaths[iconName as keyof typeof iconPaths] || iconPaths.star;
  }

  trackByServiceId(index: number, service: Service): number {
    return service.id;
  }

  trackByStatLabel(index: number, stat: any): string {
    return stat.label;
  }
}