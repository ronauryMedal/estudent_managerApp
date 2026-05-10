import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { of } from 'rxjs';

import { AuthService } from '../core/services/auth.service';
import { StudentCareerService } from '../core/services/student-career.service';
import { StudentSubjectsService } from '../core/services/student-subjects.service';
import { Tab3Page } from './tab3.page';

describe('Tab3Page', () => {
  let component: Tab3Page;
  let fixture: ComponentFixture<Tab3Page>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Tab3Page],
      providers: [
        provideRouter([]),
        provideIonicAngular(),
        {
          provide: AuthService,
          useValue: {
            currentUser: () => ({
              id: 'u1',
              name: 'Test',
              email: 't@t.com',
            }),
          },
        },
        {
          provide: StudentCareerService,
          useValue: {
            getMyCareers: () => of([]),
          },
        },
        {
          provide: StudentSubjectsService,
          useValue: {
            getMyPlanSubjects: () => of([]),
            createMySubject: () => of({ id: 's1' }),
            getMyEnrollments: () => of([]),
            getMyCareer: () => of(null),
            enroll: () => of({}),
            unenroll: () => of({}),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Tab3Page);
    component = fixture.componentInstance;
    component.ionViewWillEnter();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
