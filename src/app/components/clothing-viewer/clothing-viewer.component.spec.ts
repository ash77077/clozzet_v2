import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClothingViewerComponent } from './clothing-viewer.component';

describe('ClothingViewerComponent', () => {
  let component: ClothingViewerComponent;
  let fixture: ComponentFixture<ClothingViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClothingViewerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClothingViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
