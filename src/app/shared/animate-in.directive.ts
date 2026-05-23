import { Directive, computed, input } from '@angular/core';

/** Entrada suave con animate.css; delay opcional para listas escalonadas. */
@Directive({
  selector: '[appAnimateIn]',
  standalone: true,
  host: {
    '[class]': 'hostClasses()',
    '[style.animation-delay.ms]': 'delayMs()',
  },
})
export class AnimateInDirective {
  /** Nombre de animación animate.css sin prefijo (ej. fadeInUp). */
  readonly animation = input('fadeInUp');
  readonly delayMs = input(0);
  readonly duration = input<'faster' | 'fast' | 'normal'>('faster');

  readonly hostClasses = computed(
    () =>
      `animate__animated app-animate-in animate__${this.animation()} animate__${this.duration()}`,
  );
}
