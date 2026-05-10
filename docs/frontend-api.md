# API Guide para Frontend

Guía rápida de endpoints para consumir la API desde frontend.

- Base URL local: `http://localhost:3000`
- Swagger UI: `http://localhost:3000/docs`
- OpenAPI JSON: `http://localhost:3000/docs-json`
- Auth: `Bearer <access_token>` en header `Authorization`.

### Uso en esta app (Student_manager)

- **Inicio (dashboard)**: tareas `GET /tasks`; bloque de cuatrimestre con `GET /user-approved-subjects/me` + `GET /subjects/me` (materias del plan propio) y filtro por `UserCareer` (`GET /user-careers/me`).
- **Materias (tab)**: listado del plan con `GET /subjects/me`; altas con `POST /subjects/me` eligiendo `careerId` solo entre `GET /careers/me`; avance / inscripción en malla con `GET` / `POST` / `DELETE` `user-approved-subjects/me`.

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
    "email": "usuario@ejemplo.com"
  }
}
```

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
    "careers": null
  }
}
```

## Reglas de permisos (resumen)

- **ADMIN**: catálogo global (`GET /careers`, `POST /careers`, etc.), materias de cualquier carrera, resto de módulos administrativos.
- **STUDENT**:
  - Crea **sus propias carreras** con institución (`POST /careers/me`). Puede haber el mismo nombre de carrera en distintas instituciones o entre usuarios; solo ve las que **él creó** (`GET /careers/me`, `GET /careers/:id` si es dueño).
  - Agrega **materias solo a carreras de las que es dueño** (`POST /subjects/me`, `quarterNumber` = cuatrimestre). Lista sus materias con `GET /subjects/me`.
  - Horarios de materia: puede gestionar horarios de materias de **sus** carreras (mismo criterio de dueño que admin para las suyas).
  - Asigna **profesores del catálogo** a sus materias con `POST /subject-teachers/me` (ver Subject Teachers).
  - `POST /user-careers/me`: activa o **cambia** la carrera inscrita; solo acepta `careerId` de carreras **creadas por el mismo usuario** (`ownerUserId`).
  - `user-approved-subjects/me`: registra materias en su malla; la materia debe ser de **su** plan (carrera con su `ownerUserId`) y coincidir con su `UserCareer` activo.
- `tasks`: JWT; cada usuario solo ve/edita sus tareas.

## Endpoints por modulo

## App

- `GET /`

## Users

- `POST /users`
- `GET /users`
- `GET /users/:id`
- `PATCH /users/:id`
- `DELETE /users/:id`
- `GET /users/:id/progress` (JWT, admin o propietario)
- `GET /users/:id/progress/summary` (JWT, admin o propietario)

## Careers

Cada carrera tiene **`institution`** (institución). El mismo **nombre** de carrera puede repetirse en otra institución o en otro usuario; lo que define el plan personal es **`ownerUserId`** (dueño). Las creadas por admin tienen `ownerUserId` null (catálogo).

- `GET /careers` (**solo ADMIN**): todas las carreras (catálogo + personales de todos los usuarios).
- `GET /careers/me` (**STUDENT**): solo carreras **que tú creaste**.
- `POST /careers/me` (**STUDENT**): crea tu plan; por defecto lo **activa** como inscripción actual (actualiza `UserCareer` si ya existía).
- `POST /careers` (**ADMIN**): carrera de catálogo (`ownerUserId` null).
- `GET /careers/:id` (JWT): admin ve cualquiera; estudiante **solo** si es dueño de esa carrera.
- `PATCH /careers/:id` / `DELETE /careers/:id` (JWT): admin cualquiera; estudiante **solo** sus carreras (no puede borrar/editar catálogo admin).

Body **admin** `POST /careers` y **estudiante** `POST /careers/me` (mismos campos base + opcionales en `/me`):

```json
{
  "name": "Ingenieria de Software",
  "institution": "Universidad Nacional",
  "description": "Carrera orientada al desarrollo de software",
  "totalCredits": 240,
  "totalSemester": 12
}
```

`totalSemester` = cantidad de **cuatrimestres** (períodos) del plan.

**`POST /careers/me`** opcionales:

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

- `activate` (default `true`): si es `true`, esta carrera queda como tu plan activo (`UserCareer`).
- `currentSemester`: cuatrimestre actual al activar (debe ser ≤ `totalSemester`).

## Teachers

- `GET /teachers` (JWT)
- `GET /teachers/:id` (JWT)
- `POST /teachers` (JWT + ADMIN)
- `PATCH /teachers/:id` (JWT + ADMIN)
- `DELETE /teachers/:id` (JWT + ADMIN)

Body create/update:

```json
{
  "name": "Ana Martinez",
  "email": "ana@study.com"
}
```

## Subjects

- `GET /subjects` (**solo ADMIN**): todas las materias.
- `GET /subjects/me` (**STUDENT**): materias cuyo `career.ownerUserId` eres tú.
- `POST /subjects` (**ADMIN**): crea materia en cualquier carrera.
- `POST /subjects/me` (**STUDENT**): crea materia; `careerId` debe ser una carrera **que tú creaste**.
- `GET /subjects/:id` (JWT): admin; estudiante solo si la materia pertenece a **su** carrera (dueño).
- `PATCH /subjects/:id` / `DELETE /subjects/:id` (JWT): misma regla de acceso que `GET` (admin o dueño del plan).

### Modalidad (`modality`)

Valores permitidos (misma convención que en base de datos / Prisma):

| Valor        | Significado   |
|-------------|---------------|
| `IN_PERSON` | Presencial    |
| `VIRTUAL`   | Virtual       |
| `HYBRID`    | Híbrida       |

Si no envías `modality` al crear una materia, el backend usa **`IN_PERSON`** por defecto.

### Presencial / híbrida: edificio, sección y número de curso

Si `modality` es **`IN_PERSON`** o **`HYBRID`**, son **obligatorios** (strings no vacíos tras quitar espacios):

| Campo           | Uso típico                          |
|-----------------|-------------------------------------|
| `building`      | Edificio donde se imparte           |
| `section`       | Sección o grupo (ej. `A`, `01`)     |
| `courseNumber`  | Número o código del curso ofertado  |

Si `modality` es **`VIRTUAL`**, esos tres campos se guardan como `null` y no aplican.

**`quarterNumber`**: cuatrimestre (período) en el plan; debe estar entre `1` y `totalSemester` de la carrera.

Body create/update:

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

Ejemplo solo virtual (sin sede física):

```json
{
  "name": "Introduccion Web",
  "credits": 3,
  "quarterNumber": 1,
  "careerId": "career_uuid",
  "modality": "VIRTUAL"
}
```

`modality`, `building`, `section` y `courseNumber` son opcionales en **update** (partial); el servidor valida el **estado final** (modalidad + datos de sede) tras mezclar con lo ya guardado.

`modality` es opcional en create (por defecto **presencial**; si omites `modality` debes enviar `building`, `section` y `courseNumber` no vacíos).

Las respuestas de `GET /subjects`, `GET /subjects/me`, `GET /subjects/:id` y los updates incluyen un arreglo **`schedules`**: bloques horarios ordenados por día y hora de inicio (puede estar vacío).

## Horarios de materia (`subject-schedules`)

Una misma materia puede tener **varios bloques** (ej. lunes 08:00–10:00 y viernes 18:00–20:00). Cada bloque es un registro con día de semana, hora inicio/fin (24 h) y aula opcional.

### Días (`weekday`)

| Valor       | Día        |
|------------|------------|
| `MONDAY`   | Lunes      |
| `TUESDAY`  | Martes     |
| `WEDNESDAY`| Miércoles  |
| `THURSDAY` | Jueves     |
| `FRIDAY`   | Viernes    |
| `SATURDAY` | Sábado     |
| `SUNDAY`   | Domingo    |

### Endpoints

- `GET /subjects/:subjectId/schedules` (JWT): admin o dueño del plan al que pertenece la materia.
- `POST` / `PATCH` / `DELETE` … (JWT): admin o **dueño** de la carrera de esa materia.

Body `POST` / campos en `PATCH` (partial):

```json
{
  "weekday": "FRIDAY",
  "startTime": "18:00",
  "endTime": "20:00",
  "room": "Lab 2"
}
```

`startTime` y `endTime` se envían como **`HH:mm`** (24 h). La fin debe ser **posterior** a la inicio (mismo bloque, mismo día).

En las respuestas JSON, Prisma suele devolver `startTime` y `endTime` como **fecha ISO** (solo importa la parte horaria en UTC, p. ej. `1970-01-01T18:00:00.000Z` para 18:00). El frontend puede leer hora y minutos en UTC o formatear según necesidad.

Al borrar una materia, sus horarios se eliminan en cascada.

## Subject Teachers

Relación entre una **materia** y un **profesor** (el profesor sigue siendo dado de alta por admin en `GET /teachers` / catálogo).

- `GET /subject-teachers` (**solo ADMIN**): todas las asignaciones.
- `POST /subject-teachers` (**ADMIN**): asignar en cualquier materia.
- `POST /subject-teachers/me` (**STUDENT**): asignas un profesor a **tu** materia (`subjectId` de una carrera **creada por ti**). Body igual que abajo.
- `GET /subject-teachers/me` (**STUDENT**): listado de asignaciones donde la materia es de **tus** carreras.
- `GET /subject-teachers/:id` (JWT): admin; estudiante solo si esa fila es de una materia **suya** (dueño del plan).
- `PATCH /subject-teachers/:id` / `DELETE …` (JWT): admin; estudiante solo sobre asignaciones de **sus** materias. Si el estudiante cambia `subjectId` en el PATCH, la nueva materia también debe ser suya.

Body `POST` / `POST …/me` / `PATCH`:

```json
{
  "subjectId": "subject_uuid",
  "teacherId": "teacher_uuid"
}
```

No puede repetirse el mismo par `subjectId` + `teacherId` (error **409** si ya existe).

## User Careers

- `POST /user-careers/me` (**STUDENT**): elige o cambia carrera activa; `careerId` debe ser una carrera **creada por ti**. Si ya tenías inscripción, se **actualiza** (no falla por duplicado).
- `GET /user-careers/me` (**STUDENT**): tu `UserCareer` actual con carrera y semestres.
- `GET /user-careers/:id` (JWT): **ADMIN** cualquiera; estudiante solo si el `UserCareer` es **suyo** (`userId`).
- `GET /user-careers` (JWT + ADMIN)
- `GET /user-careers/user/:userId` (JWT + ADMIN)
- `POST /user-careers` (JWT + ADMIN)
- `PATCH /user-careers/:id` (JWT + ADMIN)
- `DELETE /user-careers/:id` (JWT + ADMIN)

Body `POST /user-careers/me`:

```json
{
  "careerId": "career_uuid",
  "currentSemester": 1
}
```

## User Semesters

- `GET /user-semesters` (JWT)
- `GET /user-semesters/:id` (JWT)
- `POST /user-semesters` (JWT + ADMIN)
- `PATCH /user-semesters/:id` (JWT + ADMIN)
- `DELETE /user-semesters/:id` (JWT + ADMIN)

Body create/update:

```json
{
  "userCareerId": "user_career_uuid",
  "number": 2,
  "isActive": true
}
```

## Tasks

- `GET /tasks` (JWT)
- `GET /tasks/:id` (JWT)
- `POST /tasks` (JWT)
- `PATCH /tasks/:id` (JWT)
- `DELETE /tasks/:id` (JWT)

Body create/update:

```json
{
  "title": "Practica de funciones",
  "description": "Capitulo 1",
  "dueDate": "2026-05-20T23:59:00.000Z",
  "subjectId": "subject_uuid"
}
```

`userId` no se envia; se toma desde el JWT.

## User Approved Subjects

Registro de **avance / inscripción en la malla** del estudiante (entidad `UserApprovedSubject` en Prisma): enlaza al usuario con una **materia** (`subjectId`). Esa materia suele ser una que el estudiante creó en su plan (`POST /subjects/me`); la API exige coherencia con la carrera activa del usuario (ver abajo).

### Estudiante (solo rol `STUDENT`)

Requisito: el usuario debe tener ya una carrera activa (`POST /user-careers/me` o activación al crear carrera). La materia debe tener `careerId` **igual** al de esa inscripción (`UserCareer`); si no, la API responde **403**.

- `GET /user-approved-subjects/me` (JWT + STUDENT): lista las materias del usuario autenticado (incluye `subject` y `career` anidados en la respuesta).
- `POST /user-approved-subjects/me` (JWT + STUDENT): agrega una materia a su lista.

Body `POST /user-approved-subjects/me`:

```json
{
  "subjectId": "subject_uuid"
}
```

- `DELETE /user-approved-subjects/me/:id` (JWT + STUDENT): elimina una inscripción. `:id` es el **id del registro** `UserApprovedSubject`, no el `subjectId`. Solo puede borrar filas propias.

Errores frecuentes: **400** si aún no tiene carrera; **403** si la materia es de otra carrera; **409** si ya tenía esa materia registrada.

### Admin y listados generales

- `GET /user-approved-subjects` (JWT)
- `GET /user-approved-subjects/:id` (JWT)
- `POST /user-approved-subjects` (JWT + ADMIN)
- `PATCH /user-approved-subjects/:id` (JWT + ADMIN)
- `DELETE /user-approved-subjects/:id` (JWT + ADMIN)

Body create (admin):

```json
{
  "userId": "user_uuid",
  "subjectId": "subject_uuid",
  "approvedAt": "2026-05-07T10:00:00.000Z"
}
```

`approvedAt` es **opcional**; si se omite, se usa la fecha/hora actual.

Body update (admin): mismos campos en partial según `PATCH`.

## Generación de cliente frontend (opcional)

Puedes generar cliente tipado con OpenAPI:

1. Asegura API arriba.
2. Usa `http://localhost:3000/docs-json`.
3. Genera cliente (ejemplo con `openapi-typescript`):

```bash
npx openapi-typescript http://localhost:3000/docs-json -o src/api/generated.ts
```

Esto te crea tipos TS para requests/responses en frontend.
