import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';

import { StudentSideMenuComponent } from './shared/student-side-menu/student-side-menu.component';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrl: 'app.component.scss',
  imports: [IonApp, IonRouterOutlet, StudentSideMenuComponent],
})
export class AppComponent {}
