import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuoteFormComponent } from '../../components/quote-form/quote-form.component';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, QuoteFormComponent],
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss']
})
export class ContactComponent {
  contactInfo = [
    {
      title: 'Email Us',
      value: 'clozzet.corp@gmail.com',
      description: 'Get a response within 4 hours',
      icon: 'M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
    },
    {
      title: 'Call Us',
      value: '+374 (44) 01 07 44',
      description: 'Mon-Fri, 9AM-6PM EST',
      icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z'
    },
    {
      title: 'Visit Us',
      value: '123 Business District',
      description: 'Corporate City, CC 12345',
      icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z'
    }
  ];

  officeHours = [
    { day: 'Monday - Friday', hours: '9:00 AM - 6:00 PM' },
    { day: 'Saturday', hours: '10:00 AM - 2:00 PM' },
    { day: 'Sunday', hours: 'Closed' }
  ];
}
