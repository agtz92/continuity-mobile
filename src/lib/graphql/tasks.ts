import { gql } from "@apollo/client";
import { TASK_BLOCKER_FIELDS } from "./fragments";

export const CREATE_TASK = gql`
  mutation CreateTask($data: TaskInput!) {
    createTask(data: $data) {
      id
      title
      projectId
      dueDate
      done
      completedAt
      created
      effortHours
      position
      blockers {
        ${TASK_BLOCKER_FIELDS}
      }
    }
  }
`;


export const UPDATE_TASK = gql`
  mutation UpdateTask($id: ID!, $data: TaskInput!) {
    updateTask(id: $id, data: $data) {
      id
      title
      projectId
      dueDate
      done
      completedAt
      created
      effortHours
      position
      blockers {
        ${TASK_BLOCKER_FIELDS}
      }
    }
  }
`;


export const TOGGLE_TASK = gql`
  mutation ToggleTask($id: ID!) {
    toggleTask(id: $id) {
      id
      title
      projectId
      dueDate
      done
      completedAt
      created
      effortHours
      blockers {
        ${TASK_BLOCKER_FIELDS}
      }
    }
  }
`;


// Estado explícito (idempotente): lo usa la cola offline, donde un toggle
// reenviado dejaría la tarea al revés.
export const SET_TASK_DONE = gql`
  mutation SetTaskDone($id: ID!, $done: Boolean!) {
    setTaskDone(id: $id, done: $done) {
      id
      done
      completedAt
    }
  }
`;


export const ADD_TASK_BLOCKER = gql`
  mutation AddTaskBlocker($data: TaskBlockerInput!) {
    addTaskBlocker(data: $data) {
      ${TASK_BLOCKER_FIELDS}
    }
  }
`;


export const REMOVE_TASK_BLOCKER = gql`
  mutation RemoveTaskBlocker($id: ID!) {
    removeTaskBlocker(id: $id)
  }
`;


export const DELETE_TASK = gql`
  mutation DeleteTask($id: ID!) {
    deleteTask(id: $id)
  }
`;

// ===== Ideas =====


/** Orden manual de las tareas de un proyecto (drag & drop del detalle). */
export const REORDER_PROJECT_TASKS = gql`
  mutation ReorderProjectTasks($projectId: ID!, $orderedIds: [ID!]!) {
    reorderProjectTasks(projectId: $projectId, orderedIds: $orderedIds) {
      id
      position
    }
  }
`;
