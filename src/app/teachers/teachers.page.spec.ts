import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { of } from 'rxjs';

import { StudentSubjectTeachersService } from '../core/services/student-subject-teachers.service';
import { StudentTeachersService } from '../core/services/student-teachers.service';
import { TeachersPage } from './teachers.page';

describe('TeachersPage', () => {
  let component: TeachersPage;
  let fixture: ComponentFixture<TeachersPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeachersPage],
      providers: [
        provideRouter([]),
        provideIonicAngular(),
        {
          provide: StudentSubjectTeachersService,
          useValue: {
            getMyLinks: () => of([]),
          },
        },
        {
          provide: StudentTeachersService,
          useValue: {
            getMyTeachers: () =>
              of([
                {
                  id: 't1',
                  name: 'Ana Martínez',
                  email: 'ana@study.com',
                },
              ]),
            createMyTeacher: () =>
              of({ id: 't2', name: 'Nuevo', email: null }),
            deleteMyTeacher: () => of({}),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TeachersPage);
    component = fixture.componentInstance;
    component.ionViewWillEnter();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load teachers list', () => {
    expect(component.teacherCount()).toBe(1);
    expect(component.teachers()[0]?.name).toBe('Ana Martínez');
  });
});
