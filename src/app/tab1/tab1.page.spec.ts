import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from '../core/services/auth.service';
import { StudentDashboardService } from '../core/services/student-dashboard.service';
import { Tab1Page } from './tab1.page';

describe('Tab1Page', () => {
  let component: Tab1Page;
  let fixture: ComponentFixture<Tab1Page>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Tab1Page],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            currentUser: () => ({ id: 'test-user', name: 'Test', email: 't@t.com' }),
          },
        },
        {
          provide: StudentDashboardService,
          useValue: {
            loadDashboard: () =>
              of({
                stats: {
                  totalSubjects: 2,
                  approvedSubjects: 1,
                  failedSubjects: 0,
                  pendingTasks: 3,
                },
                upcomingTasks: [
                  {
                    id: 't1',
                    userId: 'test-user',
                    subjectId: 's1',
                    title: 'Entrega demo',
                    dueDate: new Date().toISOString(),
                  },
                ],
              }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Tab1Page);
    component = fixture.componentInstance;
    component.ionViewWillEnter();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
