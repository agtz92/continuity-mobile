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
