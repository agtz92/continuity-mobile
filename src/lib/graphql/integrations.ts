import { gql } from "@apollo/client";

export const GOOGLE_TASKS_CONNECTION_QUERY = gql`
  query GoogleTasksConnection {
    googleTasksConnection {
      connected
      email
      connectedAt
    }
  }
`;


export const GOOGLE_TASKS_AUTH_URL = gql`
  mutation GoogleTasksAuthUrl($returnTo: String!) {
    googleTasksAuthUrl(returnTo: $returnTo)
  }
`;


export const GOOGLE_TASK_LISTS_QUERY = gql`
  query GoogleTaskLists {
    googleTaskLists {
      id
      title
    }
  }
`;


export const IMPORT_GOOGLE_TASKS = gql`
  mutation ImportGoogleTasks($mappings: [GoogleTasksImportMapping!]!) {
    importGoogleTasks(mappings: $mappings) {
      imported
      skipped
      createdProjects
    }
  }
`;


export const DISCONNECT_GOOGLE_TASKS = gql`
  mutation DisconnectGoogleTasks {
    disconnectGoogleTasks
  }
`;

// ===== Notificaciones / push =====
// --- Push notifications (Fase 8) ----------------------------------------------
// These documents target backend mutations that DO NOT EXIST YET in
// agtz92/continuity_backend. They are kept here so the client is ready to wire,
// but execution is gated behind PUSH_BACKEND_READY in src/lib/notifications.ts.
// When implementing the backend, match these signatures (scalar Boolean return):
//   registerPushToken(token: String!, deviceId: String!): Boolean
//   unregisterPushToken(deviceId: String!): Boolean
