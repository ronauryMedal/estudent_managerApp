import { HttpErrorResponse } from '@angular/common/http';

/** Texto de `message` en respuestas NestJS (string o array). */
export function formatApiErrorBodyMessage(errorBody: unknown): string {
  if (!errorBody) {
    return '';
  }
  if (typeof errorBody === 'string') {
    return errorBody.trim();
  }
  if (typeof errorBody === 'object' && errorBody && 'message' in errorBody) {
    const msg = (errorBody as { message: unknown }).message;
    if (Array.isArray(msg)) {
      return msg.map(String).join(' ').trim();
    }
    if (typeof msg === 'string') {
      return msg.trim();
    }
  }
  return '';
}

/** Mensaje legible para el usuario a partir de un error HTTP. */
export function httpErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof HttpErrorResponse) {
    const apiMsg = formatApiErrorBodyMessage(err.error);
    if (apiMsg) {
      return apiMsg;
    }
    if (err.status === 0) {
      return 'Sin conexión con el servidor. Revisá tu red o que el API esté en línea.';
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
    if (err.status === 400) {
      return 'Revisá los datos enviados (contraseña de al menos 8 caracteres).';
    }
  }
  if (err instanceof Error && err.message === 'INVALID_AUTH_RESPONSE') {
    return 'El servidor respondió de forma inesperada. Probá de nuevo.';
  }
  return fallback;
}
