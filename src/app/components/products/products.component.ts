import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Product {
  id: number;
  name: string;
  category: string;
  image: string;
  description: string;
  features: string[];
  materials: string[];
  thickness: string[];
  startingPrice: number;
}

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss']
})
export class ProductsComponent {
  selectedProduct: Product | null = null;
  showImageModal: boolean = false;
  showDetailsModal: boolean = false;

  products: Product[] = [
    {
      id: 1,
      name: 'Custom T-Shirts',
      category: 'T-Shirt',
      image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80',
      description: 'Premium cotton t-shirts perfect for company events, team building, and brand promotion.',
      features: ['Multiple Colors Available', 'Screen Printing & Embroidery', 'Bulk Discounts', 'Unisex Sizes'],
      materials: ['100% Cotton', '95% Cotton 5% Spandex', '60% Cotton 40% Polyester'],
      thickness: ['150 GSM (Light)', '180 GSM (Medium)', '220 GSM (Heavy)'],
      startingPrice: 12
    },
    {
      id: 2,
      name: 'Polo Shirts',
      category: 'Polo',
      image: 'https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80',
      description: 'Professional polo shirts ideal for corporate uniforms and business casual environments.',
      features: ['Moisture-Wicking Fabric', 'Collar Stability', 'Professional Fit', 'Logo Embroidery'],
      materials: ['100% Pique Cotton', '65% Polyester 35% Cotton', '92% Cotton 8% Lycra'],
      thickness: ['180 GSM (Medium)', '200 GSM (Premium)', '240 GSM (Heavy Duty)'],
      startingPrice: 18
    },
    {
      id: 3,
      name: 'Hoodies',
      category: 'Hoodie',
      image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80',
      description: 'Comfortable hoodies perfect for team outings and casual company wear.',
      features: ['Soft Interior Fleece', 'Adjustable Drawstrings', 'Kangaroo Pockets', 'Custom Colors'],
      materials: ['80% Cotton 20% Polyester', '100% Cotton Fleece', '50% Cotton 50% Polyester'],
      thickness: ['280 GSM (Medium)', '320 GSM (Heavy)', '380 GSM (Premium)'],
      startingPrice: 25
    },
    {
      id: 4,
      name: 'Custom Caps',
      category: 'Cap',
      image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80',
      description: 'High-quality caps and hats perfect for outdoor events and brand visibility.',
      features: ['Adjustable Sizing', 'UV Protection', 'Embroidered Logos', 'Multiple Styles'],
      materials: ['100% Cotton Twill', '100% Polyester Mesh', '65% Cotton 35% Polyester'],
      thickness: ['Medium Weight', 'Heavy Duty', 'Lightweight Mesh'],
      startingPrice: 15
    },
    {
      id: 5,
      name: 'Tote Bags',
      category: 'Tote Bag',
      image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80',
      description: 'Eco-friendly tote bags perfect for corporate events and promotional campaigns.',
      features: ['Large Print Area', 'Eco-Friendly', 'Reinforced Handles', 'Washable'],
      materials: ['100% Cotton Canvas', '100% Recycled Cotton', '80% Cotton 20% Jute'],
      thickness: ['8 oz Canvas', '10 oz Canvas', '12 oz Heavy Canvas'],
      startingPrice: 8
    },
    {
      id: 6,
      name: 'Custom Aprons',
      category: 'Apron',
      image: 'https://images.unsplash.com/photo-1577003833619-76bbd7f82948?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80',
      description: 'Professional aprons for restaurants, cafes, and hospitality businesses.',
      features: ['Stain Resistant', 'Adjustable Straps', 'Multiple Pockets', 'Easy Care Fabric'],
      materials: ['100% Cotton Duck', '65% Polyester 35% Cotton', '100% Polyester Blend'],
      thickness: ['Medium Weight', 'Heavy Duty Canvas', 'Professional Grade'],
      startingPrice: 20
    }
  ];

  activeCategory: string = 'All';
  categories: string[] = ['All', 'T-Shirt', 'Polo', 'Hoodie', 'Cap', 'Tote Bag', 'Apron'];

  get filteredProducts(): Product[] {
    if (this.activeCategory === 'All') {
      return this.products;
    }
    return this.products.filter(product => product.category === this.activeCategory);
  }

  setActiveCategory(category: string): void {
    this.activeCategory = category;
  }

  requestQuote(): void {
    // Close any open modals
    this.closeModal();
    
    // Navigate to quote section
    const element = document.getElementById('quote-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    // You could also pass product information to the quote form
  }

  trackByProductId(index: number, product: Product): number {
    return product.id;
  }

  viewProductImage(product: Product): void {
    this.selectedProduct = product;
    this.showImageModal = true;
  }

  viewProductDetails(product: Product): void {
    this.selectedProduct = product;
    this.showDetailsModal = true;
  }

  closeModal(): void {
    this.showImageModal = false;
    this.showDetailsModal = false;
    this.selectedProduct = null;
  }
}
