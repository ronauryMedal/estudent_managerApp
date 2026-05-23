import { Component, input, output } from '@angular/core';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronBackOutline } from 'ionicons/icons';

/** Botón atrás para páginas con ruta o modales (modo acción). */
@Component({
  selector: 'app-student-nav-back',
  standalone: true,
  imports: [IonButtons, IonBackButton, IonButton, IonIcon],
  template: `
    <ion-buttons slot="start">
      @if (actionMode()) {
        <ion-button
          fill="clear"
          class="nav-back-btn"
          [attr.aria-label]="ariaLabel()"
          (click)="dismiss.emit()"
        >
          <ion-icon slot="icon-only" name="chevron-back-outline"></ion-icon>
        </ion-button>
      } @else {
        <ion-back-button
          [defaultHref]="defaultHref()"
          text=""
          icon="chevron-back-outline"
        ></ion-back-button>
      }
    </ion-buttons>
  `,
  styles: [
    `
      .nav-back-btn {
        --padding-start: 4px;
        --padding-end: 8px;
        margin-inline-start: 2px;
      }
    `,
  ],
})
export class StudentNavBackComponent {
  /** Ruta por defecto si no hay historial (solo modo página). */
  readonly defaultHref = input('/tabs/tab1');
  /** En modales: emite al pulsar en lugar de navegar. */
  readonly actionMode = input(false);
  readonly ariaLabel = input('Volver');

  readonly dismiss = output<void>();

  constructor() {
    addIcons({ chevronBackOutline });
  }
}
