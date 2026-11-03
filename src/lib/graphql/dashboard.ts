import { gql } from "@apollo/client";
import { PROJECT_CLOSURE_FIELDS } from "./fragments";

export const ME_QUERY = gql`
  query Me {
    me {
      userId
      isAdmin
    }
  }
`;

// ===== Notificaciones in-app =====

// Avisos in-app (banners) que el usuario ve; `i18nKind`/`i18nVarsJson` permiten
// traducir el texto en cliente en lugar de mostrar el `body` del servidor.

// `activityDays` recorta las actividades a los últimos 60 días (todas las notas
// se quedan). Va fijo en el documento y no como variable: así la clave de caché
// es la misma en cada `refetchQueries`, `updateQuery` de la outbox y lectura.
// El Log trae su historial con `ACTIVITY_QUERY`. Requiere el backend con el
// argumento desplegado; contra uno viejo la query falla por validación.
export const DASHBOARD_ACTIVITY_DAYS = 60;

export const DASHBOARD_QUERY = gql`
  query Dashboard {
    dashboard(activityDays: ${DASHBOARD_ACTIVITY_DAYS}) {
      projects {
        id
        name
        description
        why
        nextStep
        status
        priority
        categoryId
        lastActivity
        created
        dueDate
        ${PROJECT_CLOSURE_FIELDS}
      }
      tasks {
        id
        title
        projectId
        dueDate
        done
        completedAt
        created
        effortHours
        dueTime
        durationMinutes
        blockedSince
        blockedReason
        position
        blockers {
          id
          blockedTaskId
          blockingTaskId
          externalDescription
          created
        }
      }
      ideas {
        id
        title
        description
        why
        created
      }
      activities {
        id
        kind
        entityId
        entityTitle
        projectId
        targetProjectId
        note
        previousValue
        newValue
        created
      }
      categories {
        id
        name
        color
        created
      }
      projectNotes {
        id
        projectId
        title
        body
        created
        updatedAt
      }
      routines {
        id
        title
        description
        recurrenceType
        startDate
        endDate
        weekdays
        intervalN
        intervalUnit
        monthlyDay
        effortHours
        archived
        created
        projectId
        timeOfDay
        durationMinutes
      }
      routineOccurrences {
        id
        routineId
        scheduledDate
        completedAt
        note
        created
      }
      lastBackup
      quota {
        plan
        blockingKinds
        caps {
          kind
          cap
        }
      }
    }
  }
`;

// ===== Rutinas =====

// Campos de una rutina (recurrencia + metadatos); reutilizado por create/update/
// archive de rutinas. NOTE: string de campos, no fragment gql — candidato a fragment.
