import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { Subscription } from 'rxjs';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  calendarOutline,
  chevronForwardOutline,
  clipboardOutline,
  libraryOutline,
} from 'ionicons/icons';

import { StudentDashboardPayload } from '../core/models/student-dashboard.model';
import { AuthService } from '../core/services/auth.service';
import { StudentDashboardService } from '../core/services/student-dashboard.service';
import { userCareerContextLine } from '../core/utils/user-career-context';
import { StudentMenuButtonsComponent } from '../shared/student-menu-buttons.component';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  imports: [
    StudentMenuButtonsComponent,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonSpinner,
    IonButton,
    IonRefresher,
    IonRefresherContent,
    IonIcon,
    IonList,
    IonItem,
    IonLabel,
    IonNote,
  ],
})
export class Tab1Page {
  readonly auth = inject(AuthService);
  private readonly dashboard = inject(StudentDashboardService);
  private readonly destroyRef = inject(DestroyRef);

  private loadSub?: Subscription;

  readonly payload = signal<StudentDashboardPayload | null>(null);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly firstName = computed(() => {
    const u = this.auth.currentUser();
    const n = u?.name?.trim();
    if (!n) {
      return '';
    }
    return n.split(/\s+/)[0] ?? '';
  });

  readonly contextLine = computed(() =>
    userCareerContextLine(this.auth.currentUser()),
  );

  constructor() {
    addIcons({
      calendarOutline,
      alertCircleOutline,
      clipboardOutline,
      libraryOutline,
      chevronForwardOutline,
    });
    this.destroyRef.onDestroy(() => this.loadSub?.unsubscribe());
  }

  ionViewWillEnter(): void {
    this.reload();
  }

  /** Días hasta la fecha de entrega (solo calendario, sin hora). Negativo = vencida. */
  private dueDayOffset(iso: string): number | null {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return null;
    }
    const now = new Date();
    const startToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const startDue = new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
    );
    return Math.round(
      (startDue.getTime() - startToday.getTime()) / 86_400_000,
    );
  }

  dueRelativeLabel(iso: string): string {
    const diff = this.dueDayOffset(iso);
    if (diff === null) {
      return '';
    }
    if (diff < 0) {
      return 'Vencida';
    }
    if (diff === 0) {
      return 'Hoy';
    }
    if (diff === 1) {
      return 'Mañana';
    }
    if (diff <= 7) {
      return `En ${diff} días`;
    }
    return `En ${diff} días`;
  }

  dueNoteColor(iso: string): 'danger' | 'warning' | 'medium' {
    const diff = this.dueDayOffset(iso);
    if (diff === null) {
      return 'medium';
    }
    if (diff < 0) {
      return 'danger';
    }
    if (diff <= 1) {
      return 'warning';
    }
    return 'medium';
  }

  formatDueDateTime(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return '';
    }
    return d.toLocaleString('es', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  reload(event?: { target?: { complete?: () => void } }): void {
    const user = this.auth.currentUser();
    if (!user?.id) {
      this.errorMessage.set('No hay usuario en sesión.');
      event?.target?.complete?.();
      return;
    }

    this.loadSub?.unsubscribe();
    this.loading.set(true);
    this.errorMessage.set(null);

    this.loadSub = this.dashboard.loadDashboard(user).subscribe({
      next: (p) => {
        this.payload.set(p);
        this.loading.set(false);
        event?.target?.complete?.();
      },
      error: () => {
        this.payload.set(null);
        this.loading.set(false);
        this.errorMessage.set(
          'No se pudo cargar el panel. Comprueba la conexión o vuelve a intentar.',
        );
        event?.target?.complete?.();
      },
    });
  }
}
