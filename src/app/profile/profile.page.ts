import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import {
  IonAvatar,
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { Subscription, forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { addIcons } from 'ionicons';
import {
  cameraOutline,
  personCircleOutline,
  trashOutline,
} from 'ionicons/icons';

import { User } from '../core/models/user.model';
import { AuthService } from '../core/services/auth.service';
import { StudentNotifyService } from '../core/services/student-notify.service';
import {
  StudentProfileService,
  UserCareerMine,
} from '../core/services/student-profile.service';
import { userInitials } from '../core/utils/user-initials';
import { resolveUserPhotoUrl } from '../core/utils/user-photo-url';
import { StudentNavBackComponent } from '../shared/student-nav-back.component';
import { AnimateInDirective } from '../shared/animate-in.directive';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  imports: [
    StudentNavBackComponent,
    AnimateInDirective,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonAvatar,
    IonButton,
    IonIcon,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
  ],
})
export class ProfilePage {
  private readonly auth = inject(AuthService);
  private readonly profileApi = inject(StudentProfileService);
  private readonly notify = inject(StudentNotifyService);
  private readonly destroyRef = inject(DestroyRef);

  private loadSub?: Subscription;
  private photoSub?: Subscription;

  readonly loading = signal(false);
  readonly photoBusy = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly profile = signal<User | null>(null);
  readonly myCareer = signal<UserCareerMine | null>(null);

  readonly initials = computed(() =>
    userInitials(this.profile()?.name ?? this.auth.currentUser()?.name),
  );

  readonly roleLabel = computed(() => {
    const role = this.profile()?.role ?? this.auth.currentUser()?.role;
    if (role === 'STUDENT') {
      return 'Estudiante';
    }
    if (role === 'ADMIN') {
      return 'Administrador';
    }
    return role ?? '—';
  });

  readonly careerLine = computed(() => {
    const uc = this.myCareer();
    if (!uc?.career?.name) {
      return null;
    }
    const parts = [uc.career.name];
    if (uc.career.institution?.trim()) {
      parts.push(uc.career.institution.trim());
    }
    if (uc.currentSemester != null) {
      parts.push(`Cuatrimestre ${uc.currentSemester}`);
    }
    return parts.join(' · ');
  });

  constructor() {
    addIcons({ cameraOutline, trashOutline, personCircleOutline });
    this.destroyRef.onDestroy(() => {
      this.loadSub?.unsubscribe();
      this.photoSub?.unsubscribe();
    });
  }

  ionViewWillEnter(): void {
    this.reload();
  }

  avatarSrc(): string | null {
    return (
      this.profile()?.avatarUrl ?? this.auth.currentUser()?.avatarUrl ?? null
    );
  }

  hasPhoto(): boolean {
    return !!this.avatarSrc();
  }

  reload(event?: { target?: { complete?: () => void } }): void {
    this.loadSub?.unsubscribe();
    this.loading.set(true);
    this.errorMessage.set(null);

    this.loadSub = forkJoin({
      profile: this.profileApi.getMe(),
      myCareer: this.profileApi.getMyCareer(),
    })
      .pipe(
        finalize(() => {
          this.loading.set(false);
          event?.target?.complete?.();
        }),
      )
      .subscribe({
        next: ({ profile, myCareer }) => {
          this.applyProfileUser(profile);
          this.myCareer.set(myCareer);
        },
        error: () => {
          this.errorMessage.set(
            'No se pudo cargar tu perfil. Revisá la conexión.',
          );
        },
      });
  }

  openPhotoPicker(input: HTMLInputElement): void {
    if (this.photoBusy()) {
      return;
    }
    input.click();
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.photoBusy()) {
      return;
    }

    if (!ALLOWED_PHOTO_TYPES.has(file.type)) {
      void this.notify.warning('Formato no permitido. Usá JPEG, PNG o WebP.');
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      void this.notify.warning('La imagen no puede superar 5 MB.');
      return;
    }

    this.photoSub?.unsubscribe();
    this.photoBusy.set(true);
    this.photoSub = this.profileApi
      .uploadPhoto(file)
      .pipe(finalize(() => this.photoBusy.set(false)))
      .subscribe({
        next: (user) => {
          this.applyProfileUser(user, true);
          void this.notify.success('Foto de perfil actualizada.');
        },
        error: (err: HttpErrorResponse) => {
          void this.notify.error(this.photoErrorMessage(err));
        },
      });
  }

  removePhoto(): void {
    if (this.photoBusy() || !this.hasPhoto()) {
      return;
    }

    this.photoSub?.unsubscribe();
    this.photoBusy.set(true);
    this.photoSub = this.profileApi
      .deletePhoto()
      .pipe(finalize(() => this.photoBusy.set(false)))
      .subscribe({
        next: (user) => {
          this.applyProfileUser(user, true);
          void this.notify.success('Foto de perfil eliminada.');
        },
        error: (err: HttpErrorResponse) => {
          void this.notify.error(this.photoErrorMessage(err));
        },
      });
  }

  formatDate(iso: string | undefined): string {
    if (!iso) {
      return '—';
    }
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return '—';
    }
    return d.toLocaleDateString('es', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  private photoErrorMessage(err: HttpErrorResponse): string {
    if (err.status === 400) {
      return 'No se pudo subir la foto. Revisá formato (JPEG/PNG/WebP) y tamaño (máx. 5 MB).';
    }
    if (err.status === 403) {
      return 'Solo estudiantes pueden cambiar la foto de perfil.';
    }
  return 'No se pudo actualizar la foto. Intentá de nuevo.';
  }

  private applyProfileUser(user: User, bustCache = false): void {
    if (bustCache && user.photoUrl) {
      const base = resolveUserPhotoUrl(user.photoUrl);
      user = {
        ...user,
        avatarUrl: base ? `${base}?v=${Date.now()}` : null,
      };
    }
    this.profile.set(user);
    this.auth.updateCurrentUser(user);
  }

}
