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

// Selección de proyecto y de activity del dashboard. `DASHBOARD_DELTA_QUERY` usa
// las mismas: lo que trae se escribe en la lista cacheada del dashboard y un
// campo de menos dejaría la query incompleta (pantalla vacía).
const DASHBOARD_PROJECT_FIELDS = `
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
`;

const DASHBOARD_ACTIVITY_FIELDS = `
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
`;

export const DASHBOARD_QUERY = gql`
  query Dashboard {
    dashboard(activityDays: ${DASHBOARD_ACTIVITY_DAYS}) {
      projects {
        ${DASHBOARD_PROJECT_FIELDS}
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
        ${DASHBOARD_ACTIVITY_FIELDS}
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

/**
 * Reconciliación barata tras escribir (ver `lib/dashboardDelta.ts`): todos los
 * proyectos con sus derivados y las activities desde `since`. Requiere el
 * backend con `dashboardDelta`; contra uno viejo falla por validación y el
 * cliente vuelve al refetch completo.
 */
export const DASHBOARD_DELTA_QUERY = gql`
  query DashboardDelta($since: DateTime!) {
    dashboardDelta(since: $since) {
      projects {
        ${DASHBOARD_PROJECT_FIELDS}
      }
      activities {
        ${DASHBOARD_ACTIVITY_FIELDS}
      }
    }
  }
`;

// ===== Rutinas =====

// Campos de una rutina (recurrencia + metadatos); reutilizado por create/update/
// archive de rutinas. NOTE: string de campos, no fragment gql — candidato a fragment.
