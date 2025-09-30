import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss']
})
export class AboutComponent {
  companyStats = [
    { number: '10+', label: 'Years Experience', icon: 'calendar' },
    { number: '500+', label: 'Happy Clients', icon: 'users' },
    { number: '50K+', label: 'Items Delivered', icon: 'package' },
    { number: '99%', label: 'Satisfaction Rate', icon: 'star' }
  ];

  team = [
    {
      name: 'Sarah Johnson',
      position: 'CEO & Founder',
      image: 'https://images.unsplash.com/photo-1494790108755-2616b612b412?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
      bio: 'Leading CLOZZET with 15+ years in textile industry'
    },
    {
      name: 'Michael Chen',
      position: 'Head of Production',
      image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
      bio: 'Ensuring quality and timely delivery for all orders'
    },
    {
      name: 'Emily Rodriguez',
      position: 'Design Director',
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
      bio: 'Creating stunning custom designs that represent your brand'
    }
  ];

  values = [
    {
      title: 'Quality First',
      description: 'We never compromise on quality. Every item meets our strict standards.',
      icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
    },
    {
      title: 'Innovation',
      description: 'Constantly improving our processes and exploring new technologies.',
      icon: 'M13 10V3L4 14h7v7l9-11h-7z'
    },
    {
      title: 'Partnership',
      description: 'Building long-term relationships with our clients through trust.',
      icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'
    },
    {
      title: 'Sustainability',
      description: 'Committed to eco-friendly practices and sustainable materials.',
      icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9'
    }
  ];
}