export interface TaskCreateNotifyInput {
  title: string;
  generateAiResearch: boolean;
  advancedMode: boolean;
  forPresentation: boolean;
  targetPages: number;
  presentationSlides: number;
  hasBookPdf: boolean;
  hasQuestionnairePdf: boolean;
  offline: boolean;
}

export interface TaskActionToast {
  header: string;
  message: string;
  duration?: number;
}

function quoteTitle(title: string): string {
  const t = title.trim();
  return t ? `«${t}»` : 'La tarea';
}

/** Toast al crear una tarea (con o sin IA, online u offline). */
export function taskCreateNotifyContent(
  input: TaskCreateNotifyInput,
): TaskActionToast {
  const q = quoteTitle(input.title);

  if (input.offline) {
    if (input.generateAiResearch) {
      return {
        header: 'Tarea guardada sin conexión',
        message: `${q} se sincronizará al volver internet. La investigación con IA se procesará entonces; te llegará un correo cuando esté lista.`,
        duration: 5200,
      };
    }
    return {
      header: 'Tarea guardada sin conexión',
      message: `${q} quedó guardada en el dispositivo y se subirá cuando haya conexión.`,
      duration: 4200,
    };
  }

  if (!input.generateAiResearch) {
    return {
      header: 'Tarea agregada',
      message: `${q} se añadió a tu lista. Te recordaremos antes de la fecha de entrega.`,
      duration: 3600,
    };
  }

  if (input.hasBookPdf && input.hasQuestionnairePdf) {
    return {
      header: 'Tarea con investigación IA',
      message: `${q} creada. La IA responderá el cuestionario con tu libro; recibirás el resultado por correo.`,
      duration: 4800,
    };
  }

  if (input.hasQuestionnairePdf) {
    return {
      header: 'Tarea con investigación IA',
      message: `${q} creada. La IA responderá el cuestionario (búsqueda web); te avisaremos por correo.`,
      duration: 4800,
    };
  }

  if (input.hasBookPdf) {
    return {
      header: 'Tarea con investigación IA',
      message: `${q} creada. La IA generará la investigación desde tu PDF; te llegará por correo.`,
      duration: 4800,
    };
  }

  if (input.advancedMode && input.forPresentation) {
    return {
      header: 'Tarea con IA y exposición',
      message: `${q} creada. Prepararemos investigación (~${input.targetPages} págs.), guía de exposición y PowerPoint (~${input.presentationSlides} diapositivas). Todo por correo.`,
      duration: 5400,
    };
  }

  if (input.advancedMode) {
    return {
      header: 'Investigación con IA',
      message: `${q} creada. Generaremos tu investigación (~${input.targetPages} páginas) y te la enviaremos por correo.`,
      duration: 4800,
    };
  }

  return {
    header: 'Investigación con IA',
    message: `${q} creada. Solo investigación con IA: el PDF estándar te llegará por correo cuando esté listo.`,
    duration: 4800,
  };
}

export function taskCompletedNotifyContent(title: string): TaskActionToast {
  const q = quoteTitle(title);
  return {
    header: 'Tarea realizada',
    message: `${q} marcada como hecha. Ya no recibirás recordatorios de esta entrega.`,
    duration: 3800,
  };
}

export function taskDeletedNotifyContent(title: string): TaskActionToast {
  const q = quoteTitle(title);
  return {
    header: 'Tarea eliminada',
    message: `${q} se quitó de tu lista.`,
    duration: 3200,
  };
}

export function taskSyncedNotifyContent(count: number): TaskActionToast {
  const n = count === 1 ? '1 tarea' : `${count} tareas`;
  return {
    header: 'Sincronizado',
    message: `${n} pendiente${count === 1 ? '' : 's'} se subió${count === 1 ? '' : 'ron'} al servidor. Si tenían IA, el procesamiento continúa por correo.`,
    duration: 4800,
  };
}
