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

export const DASHBOARD_QUERY = gql`
  query Dashboard {
    dashboard {
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
    }
  }
`;

// ===== Rutinas =====

// Campos de una rutina (recurrencia + metadatos); reutilizado por create/update/
// archive de rutinas. NOTE: string de campos, no fragment gql — candidato a fragment.
