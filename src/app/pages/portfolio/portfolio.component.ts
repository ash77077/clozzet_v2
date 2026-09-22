import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

interface PortfolioItem {
  titleKey: string;
  descriptionKey: string;
  image: string;
  categoryKey: string;
  caseStudyKeys: {
    fabricChoice: string;
    printingTechnique: string;
    clientProblem: string;
    ourSolution: string;
  };
  specs: {
    fabric: string;
    technique: string;
    leadTime: string;
  };
  testimonialKeys?: {
    quote: string;
    author: string;
    position: string;
  };
}

@Component({
  selector: 'app-portfolio',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './portfolio.component.html',
  styleUrls: ['./portfolio.component.scss']
})
export class PortfolioComponent {
  portfolioItems: PortfolioItem[] = [
    {
      titleKey: 'portfolio.items.techStartup.title',
      descriptionKey: 'portfolio.items.techStartup.description',
      image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      categoryKey: 'portfolio.categories.corporateUniforms',
      caseStudyKeys: {
        fabricChoice: 'portfolio.items.techStartup.caseStudy.fabricChoice',
        printingTechnique: 'portfolio.items.techStartup.caseStudy.printingTechnique',
        clientProblem: 'portfolio.items.techStartup.caseStudy.clientProblem',
        ourSolution: 'portfolio.items.techStartup.caseStudy.ourSolution'
      },
      specs: {
        fabric: '65% Cotton, 35% Poly',
        technique: 'Embroidery',
        leadTime: '18 Days'
      },
      testimonialKeys: {
        quote: 'portfolio.items.techStartup.testimonial.quote',
        author: 'portfolio.items.techStartup.testimonial.author',
        position: 'portfolio.items.techStartup.testimonial.position'
      }
    },
    {
      titleKey: 'portfolio.items.restaurant.title',
      descriptionKey: 'portfolio.items.restaurant.description',
      image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      categoryKey: 'portfolio.categories.hospitality',
      caseStudyKeys: {
        fabricChoice: 'portfolio.items.restaurant.caseStudy.fabricChoice',
        printingTechnique: 'portfolio.items.restaurant.caseStudy.printingTechnique',
        clientProblem: 'portfolio.items.restaurant.caseStudy.clientProblem',
        ourSolution: 'portfolio.items.restaurant.caseStudy.ourSolution'
      },
      specs: {
        fabric: 'Performance Blend',
        technique: 'Heat Transfer',
        leadTime: '15 Days'
      },
      testimonialKeys: {
        quote: 'portfolio.items.restaurant.testimonial.quote',
        author: 'portfolio.items.restaurant.testimonial.author',
        position: 'portfolio.items.restaurant.testimonial.position'
      }
    },
    {
      titleKey: 'portfolio.items.conference.title',
      descriptionKey: 'portfolio.items.conference.description',
      image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      categoryKey: 'portfolio.categories.events',
      caseStudyKeys: {
        fabricChoice: 'portfolio.items.conference.caseStudy.fabricChoice',
        printingTechnique: 'portfolio.items.conference.caseStudy.printingTechnique',
        clientProblem: 'portfolio.items.conference.caseStudy.clientProblem',
        ourSolution: 'portfolio.items.conference.caseStudy.ourSolution'
      },
      specs: {
        fabric: '100% Ring-Spun Cotton',
        technique: 'DTG Print',
        leadTime: '12 Days'
      }
    },
    {
      titleKey: 'portfolio.items.healthcare.title',
      descriptionKey: 'portfolio.items.healthcare.description',
      image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      categoryKey: 'portfolio.categories.healthcare',
      caseStudyKeys: {
        fabricChoice: 'portfolio.items.healthcare.caseStudy.fabricChoice',
        printingTechnique: 'portfolio.items.healthcare.caseStudy.printingTechnique',
        clientProblem: 'portfolio.items.healthcare.caseStudy.clientProblem',
        ourSolution: 'portfolio.items.healthcare.caseStudy.ourSolution'
      },
      specs: {
        fabric: 'Antimicrobial Poly-Cotton',
        technique: 'Sublimation',
        leadTime: '20 Days'
      }
    },
    {
      titleKey: 'portfolio.items.sports.title',
      descriptionKey: 'portfolio.items.sports.description',
      image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      categoryKey: 'portfolio.categories.sports',
      caseStudyKeys: {
        fabricChoice: 'portfolio.items.sports.caseStudy.fabricChoice',
        printingTechnique: 'portfolio.items.sports.caseStudy.printingTechnique',
        clientProblem: 'portfolio.items.sports.caseStudy.clientProblem',
        ourSolution: 'portfolio.items.sports.caseStudy.ourSolution'
      },
      specs: {
        fabric: '100% Polyester Mesh',
        technique: 'Sublimation',
        leadTime: '22 Days'
      },
      testimonialKeys: {
        quote: 'portfolio.items.sports.testimonial.quote',
        author: 'portfolio.items.sports.testimonial.author',
        position: 'portfolio.items.sports.testimonial.position'
      }
    },
    {
      titleKey: 'portfolio.items.promotional.title',
      descriptionKey: 'portfolio.items.promotional.description',
      image: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      categoryKey: 'portfolio.categories.marketing',
      caseStudyKeys: {
        fabricChoice: 'portfolio.items.promotional.caseStudy.fabricChoice',
        printingTechnique: 'portfolio.items.promotional.caseStudy.printingTechnique',
        clientProblem: 'portfolio.items.promotional.caseStudy.clientProblem',
        ourSolution: 'portfolio.items.promotional.caseStudy.ourSolution'
      },
      specs: {
        fabric: '100% Organic Cotton',
        technique: 'Screen Print',
        leadTime: '16 Days'
      }
    }
  ];

  clientLogos = [
    { name: 'Webb Fontaine', logo: 'https://webbfontaine.com/hubfs/raw_assets/public/assets/images/logo_dark.svg' },
    { name: 'Synergy', logo: 'https://www.synisys.com/wp-content/uploads/2022/06/SYNERGY-LOGO-blue.svg' },
    { name: 'Teracloud', logo: 'https://teracloud.com/images/teracloud-logo.svg' },
    { name: 'Sceon', logo: 'https://sceon.am/assets/images/sceon-logo.svg' },
    { name: 'Fifth', logo: 'https://cdn.staff.am/staff.am/upload/8/8/0/1/8801e614.png.webp' },
    { name: 'One Planet', logo: 'https://cdn.staff.am/staff.am/upload/8/e/a/6/8ea69b74.jpg.webp' },
    { name: 'Holiday Inn', logo: 'https://digital.ihg.com/is/content/ihg/hi_logo' },
    { name: 'Team Telecom', logo: 'https://www.telecomarmenia.am/img/logo.svg?v=1' },
    { name: 'UWC', logo: 'https://resources.finalsite.net/images/v1695647157/uwcdilijanorg/zgr5ydn6oqnoyghprchl/UWCD-logo.svg' },
    { name: 'UATE', logo: 'https://uate.org/wp-content/uploads/2024/05/UATE-LogoType-Main-1024x574.png' },
    { name: 'Fastshift', logo: 'https://static.ucraft.net/fs/ucraft/userFiles/fastshif/images/logo.png?v=1678703970' },
    { name: 'Valan Group', logo: 'https://www.valangroup.am/image/logo/logo.png' },
    { name: 'Drive Motors', logo: 'https://drivemotors.am/wp-content/uploads/2021/02/Drive_logo-01-e1613744824999.png' },
    { name: 'Lebanon Shawarma', logo: 'https://lebanonshawarma.am/wp-content/themes/shawarma/assets/images/lebanon_logo.svg' },
    { name: 'Courtyard By Marriott', logo: 'https://cache.marriott.com/content/dam/marriott-digital/cy/global-property-shared/en_us/logo/assets/cy_logo_L.png' },
    { name: 'Armenian Game Changers', logo: 'https://www.f6s.com/content-resource/media/1244013_large.jpeg' },
    { name: 'Ampere', logo: 'https://ampere.am/wp-content/uploads/2026/02/Frame-39-300x108-1.png' },
    { name: 'Turboline', logo: 'https://static.tildacdn.com/tild3264-6663-4239-a661-643231323933/Turboline2jpg_.png' },
    { name: 'Ceramica', logo: 'https://ceramica.fra1.digitaloceanspaces.com/2025/01/LOGONER-02-280x102.png' }
  ];

  categories = [
    { key: 'portfolio.categories.all', value: 'all' },
    { key: 'portfolio.categories.corporateUniforms', value: 'corporateUniforms' },
    { key: 'portfolio.categories.hospitality', value: 'hospitality' },
    { key: 'portfolio.categories.events', value: 'events' },
    { key: 'portfolio.categories.healthcare', value: 'healthcare' },
    { key: 'portfolio.categories.sports', value: 'sports' },
    { key: 'portfolio.categories.marketing', value: 'marketing' }
  ];
  activeCategory = 'all';

  get filteredPortfolio() {
    if (this.activeCategory === 'all') {
      return this.portfolioItems;
    }
    const categoryKey = `portfolio.categories.${this.activeCategory}`;
    return this.portfolioItems.filter(item => item.categoryKey === categoryKey);
  }

  setActiveCategory(categoryValue: string) {
    this.activeCategory = categoryValue;
  }
}
