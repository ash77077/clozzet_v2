import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductRecipeComponent } from './product-recipe.component';

describe('ProductRecipeComponent', () => {
  let component: ProductRecipeComponent;
  let fixture: ComponentFixture<ProductRecipeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductRecipeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductRecipeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
