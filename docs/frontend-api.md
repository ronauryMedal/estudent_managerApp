# API Guide para Frontend

Guia rapida de endpoints para consumir la API desde frontend.

- Base URL local: `http://localhost:3000`
- Swagger UI: `http://localhost:3000/docs`
- OpenAPI JSON: `http://localhost:3000/docs-json`
- Auth: `Bearer <access_token>` en header `Authorization`.

## Flujo de autenticacion

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

- **ADMIN**: puede crear/editar/eliminar catalogos y relaciones administrativas.
- **STUDENT**: acceso autenticado a lectura y recursos personales.
- `tasks`: requiere JWT; cada usuario solo ve/edita sus tareas.
- `user-careers/me`: estudiante puede seleccionar su carrera una sola vez.

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

- `GET /careers` (JWT)
- `GET /careers/:id` (JWT)
- `POST /careers` (JWT + ADMIN)
- `PATCH /careers/:id` (JWT + ADMIN)
- `DELETE /careers/:id` (JWT + ADMIN)

Body create/update:

```json
{
  "name": "Ingenieria de Software",
  "description": "Carrera orientada al desarrollo de software",
  "totalCredits": 240,
  "totalSemester": 12
}
```

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

- `GET /subjects` (JWT)
- `GET /subjects/:id` (JWT)
- `POST /subjects` (JWT + ADMIN)
- `PATCH /subjects/:id` (JWT + ADMIN)
- `DELETE /subjects/:id` (JWT + ADMIN)

Body create/update:

```json
{
  "name": "Programacion I",
  "credits": 4,
  "semesterNumber": 1,
  "careerId": "career_uuid"
}
```

## Subject Teachers

- `GET /subject-teachers` (JWT)
- `GET /subject-teachers/:id` (JWT)
- `POST /subject-teachers` (JWT + ADMIN)
- `PATCH /subject-teachers/:id` (JWT + ADMIN)
- `DELETE /subject-teachers/:id` (JWT + ADMIN)

Body create/update:

```json
{
  "subjectId": "subject_uuid",
  "teacherId": "teacher_uuid"
}
```

## User Careers

- `POST /user-careers/me` (JWT, estudiante/usuario autenticado)
- `GET /user-careers/:id` (JWT + ADMIN)
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

- `GET /user-approved-subjects` (JWT)
- `GET /user-approved-subjects/:id` (JWT)
- `POST /user-approved-subjects` (JWT + ADMIN)
- `PATCH /user-approved-subjects/:id` (JWT + ADMIN)
- `DELETE /user-approved-subjects/:id` (JWT + ADMIN)

Body create/update:

```json
{
  "userId": "user_uuid",
  "subjectId": "subject_uuid",
  "approvedAt": "2026-05-07T10:00:00.000Z"
}
```

## Generacion de cliente frontend (opcional)

Puedes generar cliente tipado con OpenAPI:

1. Asegura API arriba.
2. Usa `http://localhost:3000/docs-json`.
3. Genera cliente (ejemplo con `openapi-typescript`):

```bash
npx openapi-typescript http://localhost:3000/docs-json -o src/api/generated.ts
```

Esto te crea tipos TS para requests/responses en frontend.
