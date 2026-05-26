# Gemini para investigaciones de tareas

La API puede generar una investigación en formato académico al crear una tarea y enviarla como PDF al correo del estudiante.

## Configuración

1. Entra a [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Crea una API key.
3. Agrega estas variables a tu `.env`:

```env
GEMINI_API_KEY=tu-api-key-de-google-ai-studio
GEMINI_MODEL=gemini-1.5-flash
```

4. Reinicia la API:

```bash
docker compose up -d --build api
```

5. Aplica migraciones:

```bash
docker compose exec api npx prisma migrate deploy
```

## Uso desde frontend

En el body de `POST /tasks`, envía `generateAiResearch: true` cuando el estudiante marque el check:

```json
{
  "title": "Impacto de la inteligencia artificial en la educación",
  "description": "Investigar ventajas, riesgos y ejemplos actuales. Usar referencias APA.",
  "dueDate": "2026-06-01T23:59:00.000Z",
  "subjectId": "subject_uuid",
  "generateAiResearch": true
}
```

La respuesta incluye `aiResearch.status`. Consulta `GET /tasks/:id` para ver si terminó.

## Estados

| Estado | Significado |
|--------|-------------|
| `PENDING` | La solicitud fue creada |
| `PROCESSING` | Gemini está generando el contenido y PDF |
| `COMPLETED` | PDF listo en `aiResearch.pdfUrl`; correo enviado si SMTP está activo |
| `FAILED` | Falló la generación; revisar `aiResearch.error` |

## Nota académica

Gemini genera un borrador de apoyo. El estudiante debe revisar el contenido, validar datos y confirmar referencias APA antes de entregarlo.
