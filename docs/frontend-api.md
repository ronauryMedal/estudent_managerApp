# API Guide para Frontend

Guía rápida de endpoints para consumir la API desde frontend (Ionic/Angular u otro).

- Base URL local: `http://localhost:3000`
- Swagger UI: `http://localhost:3000/docs`
- OpenAPI JSON: `http://localhost:3000/docs-json`
- Auth: `Bearer <access_token>` en header `Authorization`.

## Flujo de autenticación

1. Registrar o loguear usuario.
2. Guardar `access_token`.
3. Enviar token en cada request protegida.

### `POST /auth/register`

Body:

```json
{
  "name": "Juan Perez",
  "email": "usuario@ejemplo.com",
  "password": "Contrasena123"
}
```

Response (resumen):

```json
{
  "access_token": "jwt...",
  "user": {
    "id": "uuid",
    "name": "Juan Perez",
    "email": "usuario@ejemplo.com",
    "photoUrl": null
  }
}
```

`photoUrl` es `null` hasta que subas una foto con `POST /users/me/photo`.

### `POST /auth/login`

Body:

```json
{
  "email": "usuario@ejemplo.com",
  "password": "Contrasena123"
}
```

Response (resumen):

```json
{
  "access_token": "jwt...",
  "user": {
    "id": "uuid",
    "name": "Juan Perez",
    "email": "usuario@ejemplo.com",
    "photoUrl": "/uploads/avatars/uuid.jpg",
    "careers": null
  }
}
```

`user.careers` puede traer la inscripción activa (`UserCareer`) si existe; no confundir con la lista de planes creados (`GET /careers/me`).

Para mostrar la imagen en el front, concatena base URL + `photoUrl`:

`http://localhost:3000` + `/uploads/avatars/uuid.jpg` → `http://localhost:3000/uploads/avatars/uuid.jpg`

---

## Flujo recomendado para estudiante (STUDENT)

Orden típico al armar la app (onboarding + gestión):

```mermaid
flowchart LR
  A[POST /auth/login] --> B[POST /careers/me]
  B --> C[POST /subjects/me]
  C --> D[POST /teachers/me]
  D --> E[POST /subject-teachers/me]
  B --> F[GET /user-careers/me]
  C --> G[POST /user-approved-subjects/me]
  A --> H[GET /dashboard/me]
```

| Paso | Endpoint | Qué hace |
|------|----------|----------|
| 1 | `POST /careers/me` | Crea **tu** carrera/plan (`ownerUserId` = tu usuario). Por defecto la activa (`UserCareer`). |
| 2 | `GET /careers/me` | Lista **solo** las carreras que tú creaste. |
| 3 | `POST /subjects/me` | Crea materia en una carrera **tuya** (`careerId`). |
| 4 | `GET /subjects/me` | Lista materias de **tus** carreras. |
| 5 | `POST /teachers/me` | Crea un profesor **tuyo** (no es cuenta de login). |
| 6 | `GET /teachers/me` | Lista **todos** los profesores que **tú** creaste. |
| 7 | `POST /subject-teachers/me` | Enlaza un `teacherId` **tuyo** con un `subjectId` **tuyo**. |
| 8 | `GET /subject-teachers/me` | Ver asignaciones profesor–materia de tu plan. |
| 9 | `GET /user-careers/me` | Ver carrera/cuatrimestre activos. |
| 10 | `POST /user-careers/me` | Cambiar a otra carrera **que tú creaste** (opcional). |
| 11 | `POST /user-approved-subjects/me` | Marcar materia en tu malla (plan activo). |
| 12 | `GET /users/me` | Ver perfil (incluye `photoUrl`). |
| 13 | `POST /users/me/photo` | Subir o reemplazar foto de perfil. |
| **Inicio** | **`GET /dashboard/me`** | **Una sola llamada:** tareas pendientes + materias del cuatrimestre actual con horarios y profesores. |

**Importante:** el estudiante **no** usa `GET /teachers` ni `POST /teachers` (solo admin). Para profesores propios: siempre **`/teachers/me`**.

---

## Pantalla de inicio (`GET /dashboard/me`)

Pensado para la **home** del estudiante: UI moderna en Ionic usando estos datos.

| Método | Ruta | Rol |
|--------|------|-----|
| `GET` | `/dashboard/me` | **STUDENT** |

**Headers:** `Authorization: Bearer <token>`

### Respuesta (forma general)

```json
{
  "userCareer": {
    "id": "uuid",
    "currentSemester": 1,
    "career": { "id": "...", "name": "...", "institution": "...", "totalSemester": 12 },
    "semesters": []
  },
  "currentQuarter": 1,
  "pendingTasks": [
    {
      "id": "...",
      "title": "...",
      "dueDate": "...",
      "isCompleted": false,
      "subjectId": "...",
      "subject": {
        "name": "Programación I",
        "schedules": [{ "weekday": "MONDAY", "startTime": "...", "endTime": "...", "room": null }],
        "career": { "id": "...", "name": "..." }
      }
    }
  ],
  "subjectsThisQuarter": [
    {
      "id": "...",
      "name": "Programación I",
      "quarterNumber": 1,
      "modality": "IN_PERSON",
      "career": {},
      "schedules": [],
      "teachers": [{ "teacher": { "name": "...", "email": null } }]
    }
  ]
}
```

- **`currentQuarter`**: igual que `userCareer.currentSemester`; las materias cumplen `quarterNumber === currentQuarter` y pertenecen a la carrera activa.
- **`pendingTasks`**: hasta 50 con `isCompleted === false`, ordenadas por `dueDate`.
- Sin `UserCareer`: `userCareer` y `currentQuarter` en `null`, `subjectsThisQuarter` vacío; `pendingTasks` igual puede traer datos.

### UI sugerida (Ionic)

1. **Cabecera:** nombre del plan (`userCareer.career.name`) + institución + chip “Cuatrimestre N”.
2. **Este cuatrimestre:** tarjetas por `subjectsThisQuarter`: materia, modalidad, debajo `schedules` (día traducido + hora inicio–fin + aula).
3. **Pendientes:** lista de `pendingTasks` con fecha y `subject.name`.

Consumí `GET /dashboard/me` al entrar a la tab Inicio (`ionViewWillEnter` o resolver).

---

## Reglas de permisos (resumen)

- **ADMIN**: catálogo global (`GET /careers`, `POST /careers`, `GET /teachers`, `POST /teachers`, etc.), materias de cualquier carrera, resto de módulos administrativos.
- **STUDENT**:
  - Crea **sus propias carreras** con institución (`POST /careers/me`). Solo ve las que él creó (`GET /careers/me`). `GET /careers/:id` solo si es dueño (`ownerUserId`).
  - Agrega **materias** solo a carreras propias (`POST /subjects/me`, `GET /subjects/me`). `quarterNumber` = cuatrimestre en el plan.
  - Crea **sus propios profesores** (`POST /teachers/me`) y los lista con `GET /teachers/me` (`ownerUserId` = su usuario). **No** puede usar profesores del catálogo admin.
  - Enlaza profesor + materia con `POST /subject-teachers/me` (materia y profesor deben ser **suyos**).
  - Horarios: `GET/POST/PATCH/DELETE` bajo `/subjects/:subjectId/schedules` si la materia es de **su** carrera.
  - `POST /user-careers/me`: activa o cambia inscripción; solo `careerId` de carreras **creadas por él**.
  - `user-approved-subjects/me`: la materia debe ser de **su** plan y de la **misma carrera** que su `UserCareer` activo.
  - Foto de perfil: `GET /users/me`, `POST /users/me/photo`, `DELETE /users/me/photo` (solo **STUDENT** para subir/borrar).
- **Tasks**: JWT; cada usuario solo ve/edita sus tareas.

### Campos de “dueño” en el modelo

| Entidad | Campo | Significado |
|---------|--------|-------------|
| `Career` | `ownerUserId` | `null` = catálogo admin; `uuid` = plan creado por ese estudiante |
| `Teacher` | `ownerUserId` | `null` = catálogo admin; `uuid` = profesor creado por ese estudiante |

---

## Endpoints por módulo

## App

- `GET /`

## Users

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| `GET` | `/users/me` | JWT | Perfil del usuario autenticado (sin `password`) |
| `POST` | `/users/me/photo` | **STUDENT** | Subir o reemplazar foto de perfil |
| `DELETE` | `/users/me/photo` | **STUDENT** | Quitar foto de perfil |
| `GET` | `/users/:id/progress` | JWT | Progreso académico (admin o propietario) |
| `GET` | `/users/:id/progress/summary` | JWT | Resumen de progreso (admin o propietario) |
| `POST` | `/users` | — | Crear usuario |
| `GET` | `/users` | — | Listar usuarios |
| `GET` | `/users/:id` | — | Usuario por id |
| `PATCH` | `/users/:id` | — | Actualizar usuario |
| `DELETE` | `/users/:id` | — | Eliminar usuario |

### Foto de perfil (`photoUrl`)

El campo `photoUrl` en `User` guarda la **ruta pública** relativa (ej. `/uploads/avatars/{userId}.jpg`). Los archivos se sirven estáticos en:

`{BASE_URL}{photoUrl}` → `http://localhost:3000/uploads/avatars/{userId}.jpg`

**Reglas de subida (`POST /users/me/photo`):**

| Regla | Valor |
|-------|--------|
| Content-Type | `multipart/form-data` |
| Campo del archivo | **`photo`** (obligatorio) |
| Formatos | JPEG, PNG, WebP |
| Tamaño máximo | 5 MB |
| Reemplazo | Si ya tenías foto, se sobrescribe automáticamente |

**Headers:** `Authorization: Bearer <token>`

**Response** (ejemplo tras subir):

```json
{
  "id": "uuid",
  "name": "Juan Perez",
  "email": "usuario@ejemplo.com",
  "role": "STUDENT",
  "photoUrl": "/uploads/avatars/uuid.jpg",
  "createdAt": "2026-05-17T21:00:00.000Z"
}
```

**Errores frecuentes:**

| Código | Causa |
|--------|--------|
| **400** | Sin archivo, campo distinto de `photo`, formato no permitido o archivo > 5 MB |
| **401** | Sin token |
| **403** | Rol distinto de STUDENT en subida/borrado |

### Ejemplo Angular / Ionic (subir foto)

```typescript
async uploadProfilePhoto(file: File, token: string) {
  const formData = new FormData();
  formData.append('photo', file);

  const res = await fetch('http://localhost:3000/users/me/photo', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ photoUrl: string | null }>;
}
```

**Mostrar avatar en template** (con `apiBase = 'http://localhost:3000'`):

```html
<ion-avatar>
  <img
    [src]="user.photoUrl ? apiBase + user.photoUrl : 'assets/default-avatar.png'"
    alt="Foto de perfil"
  />
</ion-avatar>
```

Input de archivo (Ionic):

```html
<input type="file" accept="image/jpeg,image/png,image/webp" (change)="onPhotoSelected($event)" />
```

```typescript
async onPhotoSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const updated = await this.uploadProfilePhoto(file, this.token);
  this.user.photoUrl = updated.photoUrl;
}
```

**Quitar foto:** `DELETE /users/me/photo` (mismo header JWT). La respuesta trae `photoUrl: null`.

**Refrescar perfil:** `GET /users/me` devuelve el usuario completo sin contraseña.

---

Cada carrera tiene **`institution`**. El mismo **nombre** puede repetirse entre instituciones o usuarios; el plan personal se identifica por **`ownerUserId`**.

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| `GET` | `/careers` | ADMIN | Todas las carreras |
| `GET` | `/careers/me` | STUDENT | Solo carreras **que tú creaste** |
| `POST` | `/careers/me` | STUDENT | Crear plan propio (+ activar inscripción) |
| `POST` | `/careers` | ADMIN | Catálogo (`ownerUserId` null) |
| `GET` | `/careers/:id` | JWT | Admin: cualquiera; estudiante: solo si es dueño |
| `PATCH` | `/careers/:id` | JWT | Admin: cualquiera; estudiante: solo sus carreras |
| `DELETE` | `/careers/:id` | JWT | Igual que PATCH |

Body base (`POST /careers` y `POST /careers/me`):

```json
{
  "name": "Ingenieria de Software",
  "institution": "Universidad Nacional",
  "description": "Carrera orientada al desarrollo de software",
  "totalCredits": 240,
  "totalSemester": 12
}
```

`totalSemester` = cantidad de **cuatrimestres** del plan. `totalCredits` puede ser `0` si no llevas control de créditos.

**Solo `POST /careers/me`** — campos opcionales:

```json
{
  "name": "Ingenieria de Software",
  "institution": "Universidad Nacional",
  "description": "...",
  "totalCredits": 240,
  "totalSemester": 12,
  "activate": true,
  "currentSemester": 1
}
```

- `activate` (default `true`): deja esta carrera como plan activo (`UserCareer`).
- `currentSemester`: cuatrimestre actual al activar (≤ `totalSemester`).

---

## Teachers (profesores)

Un **Teacher** no es un `User` con login: es un registro (`name`, `email` opcional). El estudiante crea los suyos y los asigna a materias.

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| `GET` | `/teachers/me` | STUDENT | **Lista todos los profesores que tú creaste** |
| `POST` | `/teachers/me` | STUDENT | Crear profesor propio |
| `GET` | `/teachers` | ADMIN | Catálogo global |
| `POST` | `/teachers` | ADMIN | Crear en catálogo (`ownerUserId` null) |
| `GET` | `/teachers/:id` | JWT | Admin: cualquiera; estudiante: solo si `ownerUserId` es él |
| `PATCH` | `/teachers/:id` | JWT | Admin: cualquiera; estudiante: solo sus profesores |
| `DELETE` | `/teachers/:id` | JWT | Igual que PATCH |

Body `POST /teachers/me` y `POST /teachers`:

```json
{
  "name": "Ana Martinez",
  "email": "ana@study.com"
}
```

`email` es opcional.

**Frontend:** pantalla “Mis profesores” → `GET /teachers/me`. Formulario “Nuevo profesor” → `POST /teachers/me`. Al asignar a una materia, usar un `id` devuelto por esa lista.

---

## Subjects (materias)

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| `GET` | `/subjects` | ADMIN | Todas |
| `GET` | `/subjects/me` | STUDENT | Materias de carreras con `ownerUserId` = tú |
| `POST` | `/subjects/me` | STUDENT | Crear en carrera **tuya** |
| `POST` | `/subjects` | ADMIN | Cualquier carrera |
| `GET` | `/subjects/:id` | JWT | Admin o dueño del plan de la materia |
| `PATCH` | `/subjects/:id` | JWT | Igual |
| `DELETE` | `/subjects/:id` | JWT | Igual |

### Modalidad (`modality`)

| Valor | Significado |
|-------|-------------|
| `IN_PERSON` | Presencial (default) |
| `VIRTUAL` | Virtual |
| `HYBRID` | Híbrida |

Si `modality` es `IN_PERSON` o `HYBRID`, son obligatorios `building`, `section`, `courseNumber` (strings no vacíos). En `VIRTUAL` se guardan como `null`.

**`quarterNumber`**: cuatrimestre en el plan; entre `1` y `totalSemester` de la carrera.

Body ejemplo (`POST /subjects` o `/subjects/me`):

```json
{
  "name": "Programacion I",
  "credits": 4,
  "quarterNumber": 1,
  "careerId": "career_uuid",
  "modality": "HYBRID",
  "building": "Edificio Central",
  "section": "A",
  "courseNumber": "PROG-2026-01"
}
```

Virtual:

```json
{
  "name": "Introduccion Web",
  "credits": 3,
  "quarterNumber": 1,
  "careerId": "career_uuid",
  "modality": "VIRTUAL"
}
```

Las respuestas incluyen `schedules` (horarios) y, según el include, `career`, `teachers`, etc.

---

## Horarios de materia (`/subjects/:subjectId/schedules`)

Varios bloques por materia (ej. lunes 08:00–10:00 y viernes 18:00–20:00).

### Días (`weekday`)

`MONDAY` … `SUNDAY`

| Método | Ruta | Acceso |
|--------|------|--------|
| `GET` | `/subjects/:subjectId/schedules` | Admin o dueño de la carrera |
| `POST` | `/subjects/:subjectId/schedules` | Idem |
| `PATCH` | `/subjects/:subjectId/schedules/:scheduleId` | Idem |
| `DELETE` | `/subjects/:subjectId/schedules/:scheduleId` | Idem |

Body `POST` / `PATCH`:

```json
{
  "weekday": "FRIDAY",
  "startTime": "18:00",
  "endTime": "20:00",
  "room": "Lab 2"
}
```

`startTime` / `endTime`: **`HH:mm`** (24 h). Fin > inicio.

En JSON, Prisma puede devolver horas como ISO (`1970-01-01T18:00:00.000Z`); el front puede leer UTC o formatear.

---

## Subject Teachers (profesor ↔ materia)

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| `GET` | `/subject-teachers/me` | STUDENT | Asignaciones donde la materia es de **tus** carreras |
| `POST` | `/subject-teachers/me` | STUDENT | Enlazar profesor **tuyo** + materia **tuya** |
| `GET` | `/subject-teachers` | ADMIN | Todas |
| `POST` | `/subject-teachers` | ADMIN | Cualquier par válido |
| `GET` | `/subject-teachers/:id` | JWT | Admin; estudiante si la materia es suya |
| `PATCH` | `/subject-teachers/:id` | JWT | Idem |
| `DELETE` | `/subject-teachers/:id` | JWT | Idem |

Body `POST` / `POST …/me`:

```json
{
  "subjectId": "subject_uuid",
  "teacherId": "teacher_uuid"
}
```

**Estudiante:**

- `subjectId`: materia de carrera con `ownerUserId` = tu `userId`.
- `teacherId`: profesor con `ownerUserId` = tu `userId` (creado con `POST /teachers/me`).

**409** si el par `subjectId` + `teacherId` ya existe.

---

## User Careers (inscripción activa)

| Método | Ruta | Rol |
|--------|------|-----|
| `GET` | `/user-careers/me` | STUDENT — tu inscripción actual (o `null`) |
| `POST` | `/user-careers/me` | STUDENT — elegir/cambiar carrera **propia** |
| `GET` | `/user-careers/:id` | ADMIN cualquiera; STUDENT solo si `userId` es él |
| `GET` | `/user-careers` | ADMIN |
| `GET` | `/user-careers/user/:userId` | ADMIN |
| `POST` | `/user-careers` | ADMIN |
| `PATCH` | `/user-careers/:id` | ADMIN |
| `DELETE` | `/user-careers/:id` | ADMIN |

Body `POST /user-careers/me`:

```json
{
  "careerId": "career_uuid",
  "currentSemester": 1
}
```

`currentSemester` ≤ `totalSemester` de la carrera. Si ya había inscripción, se **actualiza** (no 409).

---

## User Semesters

- `GET /user-semesters` (JWT)
- `GET /user-semesters/:id` (JWT)
- `POST /user-semesters` (JWT + ADMIN)
- `PATCH /user-semesters/:id` (JWT + ADMIN)
- `DELETE /user-semesters/:id` (JWT + ADMIN)

Body:

```json
{
  "userCareerId": "user_career_uuid",
  "number": 2,
  "isActive": true
}
```

---

## Tasks

- `GET /tasks` (JWT) — solo las del usuario del token
- `GET /tasks/:id` (JWT)
- `POST /tasks` (JWT)
- `POST /tasks/:id/ai-research` (JWT) — generar investigación IA para una tarea existente
- `PATCH /tasks/:id` (JWT)
- `DELETE /tasks/:id` (JWT)

Body:

```json
{
  "title": "Practica de funciones",
  "description": "Capitulo 1",
  "dueDate": "2026-05-20T23:59:00.000Z",
  "subjectId": "subject_uuid",
  "generateAiResearch": true
}
```

`userId` no se envía; viene del JWT.

### Cambiar estado de una tarea

Para marcar una tarea como completada o pendiente desde el front, usa `PATCH /tasks/:id`:

```json
{
  "isCompleted": true
}
```

Para volverla pendiente:

```json
{
  "isCompleted": false
}
```

El backend solo actualiza tareas del usuario autenticado.

`generateAiResearch` es opcional. Si viene `true`, el backend:

1. Crea la tarea.
2. Genera una investigación con Gemini usando `title`, `description` y la materia.
3. Convierte el contenido a PDF.
4. Envía el PDF al correo del estudiante.
5. Guarda el estado en `task.aiResearch`.

Respuesta esperada al inicio:

```json
{
  "id": "task_uuid",
  "title": "Practica de funciones",
  "aiResearch": {
    "status": "PENDING",
    "pdfUrl": null,
    "error": null
  }
}
```

Estados posibles:

| Estado | Significado |
|--------|-------------|
| `PENDING` | Solicitud creada, esperando procesamiento |
| `PROCESSING` | Gemini/PDF/correo en ejecución |
| `COMPLETED` | PDF generado; si el correo estaba activo, enviado |
| `FAILED` | Falló Gemini, PDF o configuración; revisar `error` |

También puedes generar la investigación después:

```http
POST /tasks/:id/ai-research
Authorization: Bearer <token>
```

El PDF queda disponible en `aiResearch.pdfUrl`, por ejemplo:

`http://localhost:3000/uploads/ai-research/task_uuid.pdf`

Variables necesarias en `.env`:

```env
GEMINI_API_KEY=tu-api-key-de-google-ai-studio
GEMINI_MODEL=gemini-1.5-flash
```

### Recordatorios automáticos

Al crear una tarea, el servidor programa recordatorios **sin llamadas extra del front**:

| Momento | Acción |
|---------|--------|
| ~24 h antes de `dueDate` | Notificación in-app + correo (si SMTP activo) |
| ~4 h antes de `dueDate` | Idem |

- Revisión cada **5 minutos** en el backend.
- Si editas `dueDate` (`PATCH /tasks/:id`), se reprograman los recordatorios.
- Tareas ya `isCompleted: true` no reciben recordatorios.
- Si la entrega es en menos de 24 h, puede no enviarse el de “1 día”; si es en menos de 4 h, tampoco el de “4 horas”.

Configuración de correo: ver [`docs/email-setup.md`](./email-setup.md) (Brevo, Resend, SendGrid).

---

## User Approved Subjects (malla / materias cursando)

### Estudiante (`STUDENT`)

Requisitos para `POST /user-approved-subjects/me`:

1. Tener inscripción activa (`UserCareer`), normalmente tras `POST /careers/me` con `activate: true` o `POST /user-careers/me`.
2. La materia debe ser de una carrera **creada por ti** (`career.ownerUserId` = tu id).
3. La materia debe pertenecer a la **misma carrera** que tu `UserCareer.careerId`.

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/user-approved-subjects/me` | Tus inscripciones (incluye `subject` y `career`) |
| `POST` | `/user-approved-subjects/me` | Agregar materia |
| `DELETE` | `/user-approved-subjects/me/:id` | Quitar inscripción (`:id` = id del registro, no `subjectId`) |

Body `POST`:

```json
{
  "subjectId": "subject_uuid"
}
```

Errores: **401** sin token; **403** materia de otra carrera o plan ajeno; **409** ya inscripto.

### Admin

- `GET /user-approved-subjects`
- `GET /user-approved-subjects/:id`
- `POST /user-approved-subjects` (ADMIN)
- `PATCH /user-approved-subjects/:id` (ADMIN)
- `DELETE /user-approved-subjects/:id` (ADMIN)

Body admin create:

```json
{
  "userId": "user_uuid",
  "subjectId": "subject_uuid",
  "approvedAt": "2026-05-07T10:00:00.000Z"
}
```

`approvedAt` opcional.

---

## Códigos HTTP frecuentes

| Código | Cuándo |
|--------|--------|
| **401** | Sin token, token inválido o expirado |
| **403** | Rol incorrecto o recurso de otro usuario |
| **404** | Id inexistente o ruta mal ordenada (usar `/me` antes de `/:id`) |
| **409** | Duplicado (ej. mismo profesor en la misma materia) |
| **400** | Validación (cuatrimestre, modalidad, campos obligatorios, foto inválida o demasiado grande) |

---

## Datos de prueba (seed)

Tras migraciones y seed (Docker):

```bash
docker compose exec api npx prisma migrate deploy
docker compose exec api npx prisma db seed
```

Contraseña común: **`12345678`**.

| Usuario | Rol | Uso |
|---------|-----|-----|
| `admin@study.com` | ADMIN | Catálogo, `GET /careers`, `GET /teachers`, etc. |
| `student@study.com` | STUDENT | Plan propio, materias, **profesores con `ownerUserId` del estudiante**, horarios, tareas |
| `maria@study.com` | STUDENT | Plan corto UX (1 cuatrimestre) |

El seed imprime IDs útiles en consola. Si falla con tabla inexistente, aplicar migraciones primero.

---

## Docker y URL en el front

- API en Docker: `http://localhost:3000` desde el navegador.
- Emulador Android: suele requerir `http://10.0.2.2:3000` o la IP de tu PC.
- Tras cambios en el backend: `docker compose build api && docker compose up -d api`.
- Las fotos de perfil se persisten en el volumen Docker `uploads_data` (ruta interna `/app/uploads`). No se pierden al reconstruir la imagen, salvo que uses `docker compose down -v`.

---

## Generación de cliente frontend (opcional)

1. API arriba.
2. OpenAPI: `http://localhost:3000/docs-json`.
3. Ejemplo:

```bash
npx openapi-typescript http://localhost:3000/docs-json -o src/api/generated.ts
```
