import { gql } from "@apollo/client";
import { ACTIVITY_FIELDS } from "./fragments";

export const ADD_NOTE = gql`
  mutation AddNote($projectId: ID!, $note: String!) {
    addNote(projectId: $projectId, note: $note) {
      ${ACTIVITY_FIELDS}
    }
  }
`;


export const UPDATE_NOTE = gql`
  mutation UpdateNote($id: ID!, $note: String!) {
    updateNote(id: $id, note: $note) {
      ${ACTIVITY_FIELDS}
    }
  }
`;


export const DELETE_NOTE = gql`
  mutation DeleteNote($id: ID!) {
    deleteNote(id: $id)
  }
`;

// Sella un "último respaldo" del lado del servidor (se refleja en `dashboard.lastBackup`).

export const MARK_BACKUP = gql`
  mutation MarkBackup {
    markBackup
  }
`;

// ===== Ajustes de notificación + preferencias de UI =====
// Además de digests/recordatorios, este nodo guarda tema/paleta/locale del usuario
// (fuente de verdad en servidor; ver nota de "tema persistente" en CLAUDE.md).
