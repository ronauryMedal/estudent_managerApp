# Gemini para investigaciones de tareas

La API puede generar una investigación en formato académico al crear una tarea y enviarla como PDF al correo del estudiante.

El documento generado intenta mantener un tono académico natural, con introducción, desarrollo, análisis, conclusión y referencias APA. El prompt pide suficiente contenido para que el PDF tenga aproximadamente 5 páginas o más.

## Configuración

1. Entra a [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Crea una API key.
3. Agrega estas variables a tu `.env`:

```env
GEMINI_API_KEY=tu-api-key-de-google-ai-studio
GEMINI_MODEL=gemini-2.5-flash-lite
GEMINI_FALLBACK_MODELS=gemini-flash-lite-latest,gemini-3.1-flash-lite,gemini-3.1-flash-lite-preview,gemini-3.5-flash,gemini-2.5-flash
GEMINI_RETRY_ROUNDS=12
GEMINI_RETRY_WAIT_SECONDS=60
PEXELS_API_KEY=tu-api-key-pexels
AI_RESEARCH_MIN_PAGES=3
AI_RESEARCH_MAX_PAGES=15
AI_PRESENTATION_MAX_SLIDES=20
```

`PEXELS_API_KEY` es opcional: sin ella el PowerPoint se genera sin fotos de stock (fondo azul). Obtén una clave gratis en [pexels.com/api](https://www.pexels.com/api/).

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
  "generateAiResearch": true,
  "aiResearchOptions": {
    "advancedMode": true,
    "targetPages": 8,
    "focusNotes": "Énfasis opcional para el prompt",
    "forPresentation": true,
    "presentationSlides": 10
  }
}
```

`aiResearchOptions` solo aplica si `generateAiResearch` es `true`. `forPresentation` requiere `advancedMode: true`.

La respuesta incluye `aiResearch.status`. Consulta `GET /tasks/:id` para ver si terminó.

## Libro + cuestionario (dos PDFs)

| Campo multipart | Tipo de documento |
|-----------------|-------------------|
| `bookPdf` | Libro, capítulo, apuntes |
| `questionnairePdf` | Cuestionario / preguntas |

- **Ambos:** respuestas solo del libro (`QUESTIONNAIRE_WITH_BOOK`).
- **Solo cuestionario:** respuestas con **Google Search** (`QUESTIONNAIRE_WEB`, requiere `useWebResearch: true`, default).
- **Solo libro** (`basedOnUploadedPdf` o `bookPdf`): investigación desde el material (`FROM_BOOK`).

`validateDocumentTypes` (default `true`) avisa si subiste el libro en el campo del cuestionario o viceversa.

## PDF fuente del estudiante (un solo archivo)

Con `basedOnUploadedPdf: true` y `bookPdf` / `sourcePdf`, la IA redacta la investigación **basándose en ese documento**.

```http
POST /tasks/:taskId/ai-research
Authorization: Bearer <token>
Content-Type: multipart/form-data

sourcePdf: <archivo.pdf>
aiResearchOptions: {"basedOnUploadedPdf":true,"advancedMode":true,"forPresentation":true,"presentationSlides":10}
```

El PDF debe tener texto extraíble. Escaneos sin OCR pueden fallar.

Variables opcionales:

```env
AI_SOURCE_PDF_MAX_MB=15
AI_SOURCE_PDF_MAX_TEXT_CHARS=100000
```

## Modo avanzado y exposición

| Opción | Efecto |
|--------|--------|
| `advancedMode` | Activa control de páginas y enfoque |
| `targetPages` | Extensión de la investigación (3–15, según `.env`) |
| `focusNotes` | Texto libre que se añade al prompt de Gemini |
| `basedOnUploadedPdf` | Usa el PDF subido (`sourcePdf`) como fuente principal |
| `forPresentation` | Genera guía de exposición (PDF) + PowerPoint (.pptx) |
| `presentationSlides` | Cantidad de diapositivas (5–20) |

Correo: se envía **un solo mensaje** con hasta 3 adjuntos:

1. `investigacion-*.pdf`
2. `guia-exposicion-*.pdf` (si `forPresentation`)
3. `presentacion-*.pptx` (si `forPresentation`)

El proceso corre en segundo plano. Si Gemini responde con alta demanda, cuota temporal o error de modelo, la API intenta con el siguiente modelo configurado. Si todos fallan en una ronda, espera `GEMINI_RETRY_WAIT_SECONDS` y vuelve a probar hasta `GEMINI_RETRY_ROUNDS`.

## Estados

| Estado | Significado |
|--------|-------------|
| `PENDING` | La solicitud fue creada |
| `PROCESSING` | Gemini está generando el contenido y PDF; si los modelos están ocupados seguirá esperando y reintentando |
| `COMPLETED` | Archivos listos (`pdfUrl`, y si aplica `presentationPdfUrl` / `pptxUrl`); correo bundle enviado si SMTP está activo |
| `FAILED` | Falló la generación después de agotar los reintentos; revisar `aiResearch.error` |

Mientras está `PROCESSING`, `aiResearch.error` puede contener un mensaje temporal como:

```text
Gemini está ocupado. Reintentando con otros modelos en 60 segundos (ronda 2/12).
```

El frontend debe tratar ese mensaje como estado de espera, no como fallo definitivo.

## Notificaciones para frontend

La API crea notificaciones in-app (`Notification.type = GENERAL`) durante el proceso:

| Título | Cuándo aparece |
|--------|----------------|
| `Investigación IA en espera` | Se creó la solicitud y quedó en cola |
| `Investigación IA en proceso` | El backend empezó a generar |
| `Investigación IA esperando modelo` | Todos los modelos fallaron en una ronda y el backend esperará para reintentar |
| `Generando material de exposición` | Tras la investigación, creando guía y PPTX |
| `Material académico listo` | Modo exposición completado |
| `Investigación IA lista` | PDF generado y correo enviado u omitido |
| `Investigación IA falló` | Se agotaron todos los reintentos |

Endpoints útiles:

```http
GET /notifications/me
Authorization: Bearer <token>
```

Respuesta:

```json
{
  "items": [
    {
      "id": "notification_uuid",
      "title": "Investigación IA en proceso",
      "message": "La IA está generando la investigación para \"LA ECOLOGIA\". Te avisaremos cuando el PDF esté listo.",
      "type": "GENERAL",
      "isRead": false,
      "createdAt": "2026-05-26T16:22:28.651Z",
      "userId": "user_uuid"
    }
  ],
  "unreadCount": 1
}
```

Marcar como leída:

```http
PATCH /notifications/:id/read
Authorization: Bearer <token>
```

Marcar todas como leídas:

```http
PATCH /notifications/me/read-all
Authorization: Bearer <token>
```

## Nota académica

Gemini genera un borrador de apoyo. El estudiante debe revisar el contenido, validar datos, ajustar el estilo personal y confirmar referencias APA antes de entregarlo.
