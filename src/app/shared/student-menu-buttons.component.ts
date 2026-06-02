import { Component, inject } from '@angular/core';
import { IonButtons, IonMenuButton } from '@ionic/angular/standalone';

import { AuthService } from '../core/services/auth.service';

/** Botón hamburguesa que abre el menú lateral (`menuId="student-menu"`). */
@Component({
  selector: 'app-student-menu-buttons',
  standalone: true,
  imports: [IonButtons, IonMenuButton],
  template: `
    <ion-buttons slot="start">
      <ion-menu-button
        menu="student-menu"
        class="student-menu-btn"
        aria-label="Abrir menú lateral"
        [disabled]="!auth.isAuthenticated()"
      ></ion-menu-button>
    </ion-buttons>
  `,
  styleUrl: './student-menu-buttons.component.scss',
})
export class StudentMenuButtonsComponent {
  readonly auth = inject(AuthService);
}
