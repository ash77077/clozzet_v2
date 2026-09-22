import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';

type LegalDoc = 'privacy' | 'terms' | 'cookies';

interface Section {
  heading: string;
  body: string;
}

interface Doc {
  title: string;
  lastUpdated: string;
  intro: string;
  sections: Section[];
}

const DOCS: Record<LegalDoc, Doc> = {
  privacy: {
    title: 'Privacy Policy',
    lastUpdated: 'September 2026',
    intro: 'CLOZZET ("we", "us", "our") respects your privacy. This policy explains what personal data we collect, how we use it, and your rights regarding that data.',
    sections: [
      {
        heading: '1. Data we collect',
        body: 'We collect information you provide directly — such as your name, business name, email address, phone number, and project details — when you submit a quote request or create an account. We also collect standard server logs (IP address, browser type, pages visited) for security and analytics purposes.'
      },
      {
        heading: '2. How we use your data',
        body: 'Your data is used to process and respond to your enquiry, prepare and send a custom quote, manage your account, and send service-related communications. We do not sell your personal data to third parties.'
      },
      {
        heading: '3. Data retention',
        body: 'We retain your data for as long as necessary to fulfil the purposes described above and comply with our legal obligations, typically no longer than 3 years after your last interaction with us.'
      },
      {
        heading: '4. Your rights',
        body: 'Under applicable data-protection law you have the right to access, correct, or delete the personal data we hold about you. To exercise these rights, contact us at sales@clozzet.am.'
      },
      {
        heading: '5. Security',
        body: 'We implement industry-standard technical and organisational measures to protect your data against unauthorised access, loss, or alteration.'
      },
      {
        heading: '6. Contact',
        body: 'Questions about this policy? Email us at sales@clozzet.am or write to CLOZZET, Sebastia 3/10, Yerevan, Armenia.'
      }
    ]
  },
  terms: {
    title: 'Terms of Service',
    lastUpdated: 'September 2026',
    intro: 'These Terms of Service govern your use of the CLOZZET website and any order or service agreement entered into with CLOZZET. By using our website or placing an order you agree to these terms.',
    sections: [
      {
        heading: '1. Services',
        body: 'CLOZZET provides custom-branded apparel manufacturing, design, and fulfilment services for businesses. All orders are subject to a formal written quotation accepted by both parties.'
      },
      {
        heading: '2. Orders and payment',
        body: 'An order is confirmed only upon receipt of a signed order form and agreed deposit. Full payment is due before shipment unless a credit account has been established in writing.'
      },
      {
        heading: '3. Intellectual property',
        body: 'You warrant that any logos, artwork, or designs you supply are owned by you or that you have the necessary licences. CLOZZET retains ownership of all production tooling and proprietary processes.'
      },
      {
        heading: '4. Delivery',
        body: 'Lead times stated in the quotation are estimates. CLOZZET is not liable for delays caused by circumstances beyond our reasonable control, including supply-chain disruptions or customs clearance.'
      },
      {
        heading: '5. Returns and defects',
        body: 'Claims for defective goods must be raised within 14 days of delivery with photographic evidence. Approved claims will be remedied by reprint or store credit at our discretion.'
      },
      {
        heading: '6. Limitation of liability',
        body: 'Our total liability to you shall not exceed the value of the order giving rise to the claim. We are not liable for indirect or consequential loss.'
      },
      {
        heading: '7. Governing law',
        body: 'These terms are governed by the laws of the Republic of Armenia. Disputes shall be resolved in the courts of Yerevan.'
      }
    ]
  },
  cookies: {
    title: 'Cookie Policy',
    lastUpdated: 'September 2026',
    intro: 'This Cookie Policy explains how CLOZZET uses cookies and similar technologies when you visit our website.',
    sections: [
      {
        heading: '1. What are cookies?',
        body: 'Cookies are small text files placed on your device by websites you visit. They are widely used to make websites work efficiently and to provide information to site owners.'
      },
      {
        heading: '2. Cookies we use',
        body: 'We use strictly necessary cookies to keep you logged in and maintain your session, preference cookies to remember your language choice, and analytics cookies (Google Analytics) to understand how visitors interact with our site so we can improve it.'
      },
      {
        heading: '3. Third-party cookies',
        body: 'Google Analytics sets cookies to measure traffic and usage patterns. This data is processed by Google in accordance with their privacy policy. We do not use advertising or social-tracking cookies.'
      },
      {
        heading: '4. Managing cookies',
        body: 'You can control or delete cookies through your browser settings. Note that disabling certain cookies may affect the functionality of this website, including keeping you signed in.'
      },
      {
        heading: '5. Changes',
        body: 'We may update this policy from time to time. The "last updated" date at the top of the page will reflect any changes.'
      },
      {
        heading: '6. Contact',
        body: 'Questions about our use of cookies? Contact us at sales@clozzet.am.'
      }
    ]
  }
};

@Component({
  selector: 'app-legal',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './legal.component.html',
  styleUrls: ['./legal.component.scss']
})
export class LegalComponent implements OnInit {
  doc: Doc | null = null;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.data.subscribe(data => {
      const key = data['doc'] as LegalDoc;
      this.doc = DOCS[key] ?? null;
    });
  }
}
