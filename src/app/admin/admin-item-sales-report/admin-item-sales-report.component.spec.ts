import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminItemSalesReportComponent } from './admin-item-sales-report.component';

describe('AdminItemSalesReportComponent', () => {
  let component: AdminItemSalesReportComponent;
  let fixture: ComponentFixture<AdminItemSalesReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminItemSalesReportComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AdminItemSalesReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
