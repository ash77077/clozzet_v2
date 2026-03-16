import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductionRunComponent } from './production-run.component';

describe('ProductionRunComponent', () => {
  let component: ProductionRunComponent;
  let fixture: ComponentFixture<ProductionRunComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductionRunComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductionRunComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
