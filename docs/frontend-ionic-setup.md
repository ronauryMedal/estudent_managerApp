# Ionic + Angular: entorno y API

Complemento de [frontend-api.md](./frontend-api.md) (endpoints y flujos).

## `environment.apiUrl`

Archivo: `src/environments/environment.ts` (desarrollo) y `environment.prod.ts` (build production).

```ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
};
```

| Uso | Valor típico |
|-----|----------------|
| PC / navegador | `http://localhost:3000` |
| Emulador Android | `http://10.0.2.2:3000` |
| Móvil físico (misma red) | `http://192.168.x.x:3000` |
| **Producción** (`environment.prod.ts`) | `https://videos-nearest-potential-sticker.trycloudflare.com` |
| Otro túnel Cloudflare | `https://xxxx.trycloudflare.com` |

Tras cambiar `apiUrl` en un build para Android: `npm run build` → `npx cap sync android`.

## HttpClient y JWT

- Los servicios usan `apiOrigin(environment.apiUrl)` (`src/app/core/auth-storage.ts`).
- El interceptor `api-auth.interceptor.ts` añade `Authorization: Bearer` solo a URLs que empiezan con `apiUrl`.

## Fotos de perfil y uploads

El API devuelve `photoUrl` relativa, por ejemplo `/uploads/avatars/uuid.jpg`.

URL absoluta en la UI:

```ts
const base = apiOrigin(environment.apiUrl);
const avatar = user.photoUrl ? `${base}${user.photoUrl}` : null;
```

Helper del proyecto: `resolveUserPhotoUrl()` en `src/app/core/utils/user-photo-url.ts`.

## Android (resumen)

Pasos completos: [Instalación en Android](./frontend-api.md#instalación-en-android-capacitor) en `frontend-api.md`.

```bash
npm install @capacitor/android --save   # primera vez
npx cap add android                     # primera vez
npm run build
npx cap sync android
npx cap open android
```

HTTP en dev: `android:usesCleartextTraffic="true"` en `AndroidManifest.xml` si `apiUrl` usa `http://`.

## Túnel Cloudflare (opcional)

Con la API en el puerto 3000:

```bash
cloudflared tunnel --url http://localhost:3000
```

Usá la URL HTTPS generada en `environment.apiUrl`, rebuild y `cap sync`.
