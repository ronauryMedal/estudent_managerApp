import { Injectable, inject } from '@angular/core';
import { httpErrorMessage } from '../utils/api-error-message';
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

  success(message: string, header?: string, duration?: number): Promise<void> {
    return this.present('success', { message, header, duration });
  }

  error(message: string, header?: string, duration?: number): Promise<void> {
    return this.present('error', { message, header, duration });
  }

  warning(message: string, header?: string, duration?: number): Promise<void> {
    return this.present('warning', { message, header, duration });
  }

  info(message: string, header?: string, duration?: number): Promise<void> {
    return this.present('info', { message, header, duration });
  }

  /** Mensaje de error legible desde respuesta HTTP. */
  errorFromHttp(err: unknown, fallback: string): Promise<void> {
    return this.error(this.parseHttpMessage(err, fallback));
  }

  parseHttpMessage(err: unknown, fallback: string): string {
    return httpErrorMessage(err, fallback);
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
