import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminOldBillsComponent } from './admin-old-bills.component';

describe('AdminOldBillsComponent', () => {
  let component: AdminOldBillsComponent;
  let fixture: ComponentFixture<AdminOldBillsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminOldBillsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AdminOldBillsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
