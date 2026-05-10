import { Component } from '@angular/core';
import { IonButtons, IonMenuButton } from '@ionic/angular/standalone';

/** Botón hamburguesa que abre el menú lateral del estudiante (`menuId="student-menu"`). */
@Component({
  selector: 'app-student-menu-buttons',
  standalone: true,
  imports: [IonButtons, IonMenuButton],
  template: `
    <ion-buttons slot="start">
      <ion-menu-button
        menu="student-menu"
        aria-label="Abrir menú lateral"
      ></ion-menu-button>
    </ion-buttons>
  `,
})
export class StudentMenuButtonsComponent {}
