import { Component, ElementRef, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';

import { StudentSideMenuComponent } from './shared/student-side-menu/student-side-menu.component';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrl: 'app.component.scss',
  imports: [IonApp, IonRouterOutlet, StudentSideMenuComponent],
})
export class AppComponent {
  private readonly hostEl = inject(ElementRef<HTMLElement>);

  constructor() {
    /** `ion-menu` resuelve el contenido con `getElementById('main-content')`. */
    this.hostEl.nativeElement.id = 'main-content';
  }
}
