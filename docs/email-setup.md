# Correo para recordatorios e investigaciones IA

El backend usa la misma configuración SMTP para:

1. Recordatorios automáticos de tareas.
2. Envío del material generado por investigaciones IA (`generateAiResearch: true` o `POST /tasks/:id/ai-research`) en **un solo correo** con 1 a 3 adjuntos según el modo.

Al crear una tarea (`POST /tasks`), el backend programa **dos recordatorios automáticos**:

| Momento | Cuándo se envía |
|---------|------------------|
| **1 día antes** | ~24 h antes de `dueDate` |
| **4 horas antes** | ~4 h antes de `dueDate` |

Cada recordatorio genera:

1. Una fila en **`Notification`** (tipo `TASK_REMINDER`) para la app.
2. Un **correo** al email del usuario (si `MAIL_ENABLED=true` y SMTP está configurado).

Un cron revisa cada **5 minutos** las tareas pendientes (`isCompleted = false`).

Si cambias `dueDate` con `PATCH /tasks/:id`, se reinician los recordatorios (se pueden volver a enviar en las nuevas fechas).

---

## Servicios de correo gratis (recomendados)

| Servicio | Plan gratis | Ideal para |
|----------|-------------|------------|
| **[Brevo](https://www.brevo.com)** (antes Sendinblue) | **300 correos/día** | Proyectos estudiantiles / este API (recomendado) |
| **[Resend](https://resend.com)** | 3 000 correos/mes (~100/día) | APIs modernas; también tiene SMTP |
| **[SendGrid](https://sendgrid.com)** | 100 correos/día para siempre | Uso estable y documentación amplia |
| **[Mailjet](https://www.mailjet.com)** | 200 correos/día | Alternativa a Brevo |

**Recomendación:** crea cuenta en **Brevo** (gratis, 300/día suele bastar para recordatorios).

No uses Gmail personal en producción (límites bajos y puede bloquear SMTP).

---

## Configurar Brevo (paso a paso)

1. Regístrate en [brevo.com](https://www.brevo.com).
2. **Remitentes** → verifica un email (o dominio) que usarás en `MAIL_FROM`.
3. **SMTP y API** → genera una **clave SMTP** (no la contraseña de tu cuenta).
4. En tu `.env`:

```env
MAIL_ENABLED=true
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-correo-verificado@ejemplo.com
SMTP_PASS=xsmtpsib-xxxxxxxx
MAIL_FROM="Study Manager <tu-correo-verificado@ejemplo.com>"
```

5. Reinicia la API:

```bash
docker compose up -d --build api
```

6. Aplica migraciones si falta la de recordatorios:

```bash
docker compose exec api npx prisma migrate deploy
```

---

## Probar sin correo

Con `MAIL_ENABLED=false` (default) solo se crean **notificaciones in-app**; en logs verás `correo: omitido`.

En investigaciones IA, aunque el correo esté desactivado, los archivos pueden quedar en `task.aiResearch` (`pdfUrl`, `presentationPdfUrl`, `pptxUrl`) y el frontend recibe notificaciones in-app (`GENERAL`) sobre espera, proceso, éxito o fallo.

### Adjuntos en investigaciones IA

| Modo | Adjuntos en el correo |
|------|------------------------|
| Estándar | `investigacion-*.pdf` |
| Avanzado + `forPresentation` | Investigación PDF + guía exposición PDF + `presentacion-*.pptx` |

---

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `MAIL_ENABLED` | `true` para enviar correos |
| `SMTP_HOST` | Host SMTP del proveedor |
| `SMTP_PORT` | Normalmente `587` |
| `SMTP_SECURE` | `true` solo si usas puerto 465 |
| `SMTP_USER` | Usuario SMTP |
| `SMTP_PASS` | Clave SMTP del proveedor |
| `MAIL_FROM` | Remitente visible (debe estar verificado en Brevo/Resend/etc.) |

---

## SendGrid (alternativa)

```env
MAIL_ENABLED=true
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.xxxxx   # API Key con permiso "Mail Send"
MAIL_FROM="Study Manager <email-verificado@tudominio.com>"
```

---

## Resend (alternativa)

En el panel de Resend: **SMTP** → copia host, user y password a las mismas variables `SMTP_*`.
