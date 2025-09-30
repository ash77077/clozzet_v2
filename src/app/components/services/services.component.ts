import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Service {
  id: number;
  title: string;
  description: string;
  icon: string;
  features: string[];
  highlight?: boolean;
}

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './services.component.html',
  styleUrls: ['./services.component.scss']
})
export class ServicesComponent {
  services: Service[] = [
    {
      id: 1,
      title: 'Bulk Order Discounts',
      description: 'Save more with our competitive bulk pricing. The more you order, the more you save.',
      icon: 'discount',
      features: [
        '25+ items: 10% discount',
        '50+ items: 15% discount',
        '100+ items: 20% discount',
        'Custom pricing for 500+ items'
      ]
    },
    {
      id: 2,
      title: 'Fast Turnaround',
      description: 'Get your branded apparel quickly with our industry-leading production times.',
      icon: 'clock',
      features: [
        '7-day standard production',
        '3-day rush service available',
        'Real-time order tracking',
        'Guaranteed delivery dates'
      ],
      highlight: true
    },
    {
      id: 3,
      title: 'Premium Quality',
      description: 'We use only the finest materials and latest printing techniques for lasting results.',
      icon: 'quality',
      features: [
        'Premium fabric selection',
        'Fade-resistant printing',
        'Quality control inspection',
        '100% satisfaction guarantee'
      ]
    },
    {
      id: 4,
      title: 'Custom Branding',
      description: 'Complete brand customization with our professional design and printing services.',
      icon: 'design',
      features: [
        'Logo design assistance',
        'Multiple printing methods',
        'Color matching service',
        'Brand guideline compliance'
      ]
    },
    {
      id: 5,
      title: 'Account Management',
      description: 'Dedicated support with personalized service for all your corporate apparel needs.',
      icon: 'support',
      features: [
        'Dedicated account manager',
        'Order history tracking',
        'Reorder simplification',
        '24/7 customer support'
      ]
    },
    {
      id: 6,
      title: 'Global Shipping',
      description: 'Reliable worldwide delivery with tracking and insurance for your peace of mind.',
      icon: 'shipping',
      features: [
        'Worldwide delivery',
        'Multiple shipping options',
        'Order tracking included',
        'Shipping insurance available'
      ]
    }
  ];

  stats = [
    { number: '500+', label: 'Happy Clients', icon: 'users' },
    { number: '50K+', label: 'Items Delivered', icon: 'package' },
    { number: '99%', label: 'Satisfaction Rate', icon: 'star' },
    { number: '7', label: 'Day Turnaround', icon: 'clock' }
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