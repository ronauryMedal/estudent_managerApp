// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  /**
   * Origen del backend (sin `/` final).
   * Auth: POST `{apiUrl}/auth/login` y POST `{apiUrl}/auth/register`
   *
   * Android emulador:     'http://10.0.2.2:3000'
   * Celular misma Wi‑Fi:  'http://<IP-LAN-PC>:3000'
   * Producción (build release): ver environment.prod.ts
   *   https://videos-nearest-potential-sticker.trycloudflare.com
   */
  apiUrl: 'http://localhost:3000',
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
