import { Component, HostBinding, input, output } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { addIcons } from 'ionicons';
import { add } from 'ionicons/icons';

/**
 * Botón flotante «+» fijo (más fiable que ion-fab en Android/WebView).
 * Debe ir fuera de ion-content, como hermano del modal.
 */
@Component({
  selector: 'app-fab-add',
  standalone: true,
  imports: [IonIcon],
  template: `
    <button
      type="button"
      class="app-fab-add"
      [attr.aria-label]="label()"
      [disabled]="disabled()"
      (click)="handleClick($event)"
    >
      <ion-icon name="add" aria-hidden="true"></ion-icon>
    </button>
  `,
  styleUrl: './app-fab-add.component.scss',
})
export class AppFabAddComponent {
  /** Texto para lectores de pantalla. */
  readonly label = input('Crear nuevo');
  readonly disabled = input(false);
  /** Si false, más abajo (pantallas sin tab bar, ej. Profesores). */
  readonly withTabBar = input(true);

  readonly pressed = output<void>();

  @HostBinding('class.app-fab-add-host--tabbed')
  get tabbedClass(): boolean {
    return this.withTabBar();
  }

  @HostBinding('class.app-fab-add-host--standalone')
  get standaloneClass(): boolean {
    return !this.withTabBar();
  }

  constructor() {
    addIcons({ add });
  }

  handleClick(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.disabled()) {
      return;
    }
    void this.hapticTap();
    this.pressed.emit();
  }

  private async hapticTap(): Promise<void> {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      /* Web */
    }
  }
}
