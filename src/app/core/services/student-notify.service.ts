import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  checkmarkCircleOutline,
  closeOutline,
  informationCircleOutline,
  warningOutline,
} from 'ionicons/icons';

export type NotifyTone = 'success' | 'error' | 'warning' | 'info';

export interface NotifyOptions {
  header?: string;
  message: string;
  duration?: number;
}

export interface ConfirmOptions {
  header: string;
  message: string;
  cancelText?: string;
  confirmText?: string;
  destructive?: boolean;
  /** Para alertas sobre modales abiertos. */
  overModal?: boolean;
}

const HEADERS: Record<NotifyTone, string> = {
  success: '¡Listo!',
  error: 'Algo salió mal',
  warning: 'Atención',
  info: 'Aviso',
};

const ICONS: Record<NotifyTone, string> = {
  success: 'checkmark-circle-outline',
  error: 'alert-circle-outline',
  warning: 'warning-outline',
  info: 'information-circle-outline',
};

const DURATION: Record<NotifyTone, number> = {
  success: 2600,
  error: 3800,
  warning: 3200,
  info: 2800,
};

@Injectable({ providedIn: 'root' })
export class StudentNotifyService {
  private readonly toast = inject(ToastController);
  private readonly alert = inject(AlertController);

  constructor() {
    addIcons({
      checkmarkCircleOutline,
      alertCircleOutline,
      warningOutline,
      informationCircleOutline,
      closeOutline,
    });
  }

  success(message: string, header?: string): Promise<void> {
    return this.present('success', { message, header });
  }

  error(message: string, header?: string): Promise<void> {
    return this.present('error', { message, header });
  }

  warning(message: string, header?: string): Promise<void> {
    return this.present('warning', { message, header });
  }

  info(message: string, header?: string): Promise<void> {
    return this.present('info', { message, header });
  }

  /** Mensaje de error legible desde respuesta HTTP. */
  errorFromHttp(err: unknown, fallback: string): Promise<void> {
    return this.error(this.parseHttpMessage(err, fallback));
  }

  parseHttpMessage(err: unknown, fallback: string): string {
    if (err instanceof HttpErrorResponse) {
      const apiMsg =
        typeof err.error === 'object' &&
        err.error &&
        'message' in err.error
          ? String((err.error as { message: unknown }).message)
          : typeof err.error === 'string'
            ? err.error
            : '';
      if (apiMsg.trim()) {
        return apiMsg.trim();
      }
      if (err.status === 0) {
        return 'Sin conexión con el servidor. Revisá tu red.';
      }
      if (err.status === 401) {
        return 'Sesión expirada. Volvé a iniciar sesión.';
      }
      if (err.status === 403) {
        return 'No tenés permiso para esta acción.';
      }
      if (err.status === 404) {
        return 'El recurso ya no existe o no se encontró.';
      }
      if (err.status === 409) {
        return 'Ya existe un registro igual o hay un conflicto.';
      }
    }
    return fallback;
  }

  async confirm(opts: ConfirmOptions): Promise<boolean> {
    const variant = opts.destructive ? 'destructive' : 'neutral';
    const cssClass = [
      'app-alert',
      `app-alert--${variant}`,
      opts.overModal ? 'alert-over-modal' : '',
    ]
      .filter(Boolean)
      .join(' ');

    const alert = await this.alert.create({
      mode: 'ios',
      header: opts.header,
      message: opts.message,
      cssClass,
      backdropDismiss: true,
      buttons: [
        { text: opts.cancelText ?? 'Cancelar', role: 'cancel' },
        {
          text: opts.confirmText ?? 'Confirmar',
          role: opts.destructive ? 'destructive' : 'confirm',
        },
      ],
    });

    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role === 'destructive' || role === 'confirm';
  }

  private async present(
    tone: NotifyTone,
    opts: NotifyOptions,
  ): Promise<void> {
    const toast = await this.toast.create({
      mode: 'ios',
      header: opts.header ?? HEADERS[tone],
      message: opts.message,
      duration: opts.duration ?? DURATION[tone],
      position: 'bottom',
      icon: ICONS[tone],
      cssClass: ['app-toast', `app-toast--${tone}`],
      buttons: [
        {
          icon: 'close-outline',
          role: 'cancel',
        },
      ],
      animated: true,
    });

    await toast.present();
    await this.haptic(tone);
  }

  private async haptic(tone: NotifyTone): Promise<void> {
    try {
      if (tone === 'success') {
        await Haptics.notification({ type: NotificationType.Success });
      } else if (tone === 'error') {
        await Haptics.notification({ type: NotificationType.Error });
      } else {
        await Haptics.impact({ style: ImpactStyle.Medium });
      }
    } catch {
      /* Web */
    }
  }
}
