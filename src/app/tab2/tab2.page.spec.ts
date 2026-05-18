import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { of } from 'rxjs';

import { StudentSubjectsService } from '../core/services/student-subjects.service';
import { StudentTasksService } from '../core/services/student-tasks.service';
import { Tab2Page } from './tab2.page';

describe('Tab2Page', () => {
  let component: Tab2Page;
  let fixture: ComponentFixture<Tab2Page>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Tab2Page],
      providers: [
        provideIonicAngular(),
        {
          provide: StudentTasksService,
          useValue: {
            list: () => of([]),
            create: () => of({ id: 't1' }),
            delete: () => of({}),
          },
        },
        {
          provide: StudentSubjectsService,
          useValue: {
            getMyPlanSubjects: () => of([]),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Tab2Page);
    component = fixture.componentInstance;
    component.ionViewWillEnter();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
