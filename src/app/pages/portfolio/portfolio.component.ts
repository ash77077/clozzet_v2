import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-portfolio',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './portfolio.component.html',
  styleUrls: ['./portfolio.component.scss']
})
export class PortfolioComponent {
  portfolioItems = [
    {
      title: 'Tech Startup Uniforms',
      description: 'Custom polo shirts and t-shirts for a growing tech company',
      image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      category: 'Corporate Uniforms'
    },
    {
      title: 'Restaurant Chain Branding',
      description: 'Complete branded apparel solution for restaurant staff',
      image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      category: 'Hospitality'
    },
    {
      title: 'Conference Merchandise',
      description: 'Custom t-shirts and sweatshirts for annual tech conference',
      image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      category: 'Events'
    },
    {
      title: 'Healthcare Uniforms',
      description: 'Professional medical scrubs and accessories',
      image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      category: 'Healthcare'
    },
    {
      title: 'Sports Team Gear',
      description: 'Custom athletic wear for corporate sports teams',
      image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      category: 'Sports'
    },
    {
      title: 'Promotional Campaign',
      description: 'Branded merchandise for product launch campaign',
      image: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      category: 'Marketing'
    }
  ];

  categories = ['All', 'Corporate Uniforms', 'Hospitality', 'Events', 'Healthcare', 'Sports', 'Marketing'];
  activeCategory = 'All';

  get filteredPortfolio() {
    if (this.activeCategory === 'All') {
      return this.portfolioItems;
    }
    return this.portfolioItems.filter(item => item.category === this.activeCategory);
  }

  setActiveCategory(category: string) {
    this.activeCategory = category;
  }
}