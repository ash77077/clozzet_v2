import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccessoriesRegistryComponent } from './accessories-registry.component';

describe('AccessoriesRegistryComponent', () => {
  let component: AccessoriesRegistryComponent;
  let fixture: ComponentFixture<AccessoriesRegistryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccessoriesRegistryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccessoriesRegistryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
