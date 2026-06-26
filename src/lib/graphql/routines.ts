import { gql } from "@apollo/client";
import { ROUTINE_FIELDS, ROUTINE_OCCURRENCE_FIELDS } from "./fragments";

export const CREATE_ROUTINE = gql`
  mutation CreateRoutine($data: RoutineInput!) {
    createRoutine(data: $data) {
      ${ROUTINE_FIELDS}
    }
  }
`;


export const UPDATE_ROUTINE = gql`
  mutation UpdateRoutine($id: ID!, $data: RoutineInput!) {
    updateRoutine(id: $id, data: $data) {
      ${ROUTINE_FIELDS}
    }
  }
`;


export const ARCHIVE_ROUTINE = gql`
  mutation ArchiveRoutine($id: ID!, $archived: Boolean!) {
    archiveRoutine(id: $id, archived: $archived) {
      ${ROUTINE_FIELDS}
    }
  }
`;


export const DELETE_ROUTINE = gql`
  mutation DeleteRoutine($id: ID!) {
    deleteRoutine(id: $id)
  }
`;


export const COMPLETE_ROUTINE_OCCURRENCE = gql`
  mutation CompleteRoutineOccurrence(
    $routineId: ID!
    $scheduledDate: Date!
    $note: String
  ) {
    completeRoutineOccurrence(
      routineId: $routineId
      scheduledDate: $scheduledDate
      note: $note
    ) {
      ${ROUTINE_OCCURRENCE_FIELDS}
    }
  }
`;


export const UNCOMPLETE_ROUTINE_OCCURRENCE = gql`
  mutation UncompleteRoutineOccurrence($id: ID!) {
    uncompleteRoutineOccurrence(id: $id)
  }
`;

// ===== Notas de proyecto =====
// Notas ligadas a un proyecto (distintas de las Quick Notes de más abajo).
