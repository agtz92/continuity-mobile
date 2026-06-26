import { gql } from "@apollo/client";
import { PROJECT_CLOSURE_FIELDS } from "./fragments";

export const CREATE_PROJECT_NOTE = gql`
  mutation CreateProjectNote($data: ProjectNoteInput!) {
    createProjectNote(data: $data) {
      id
      projectId
      title
      body
      created
      updatedAt
    }
  }
`;


export const UPDATE_PROJECT_NOTE = gql`
  mutation UpdateProjectNote($id: ID!, $data: ProjectNoteInput!) {
    updateProjectNote(id: $id, data: $data) {
      id
      projectId
      title
      body
      created
      updatedAt
    }
  }
`;


export const DELETE_PROJECT_NOTE = gql`
  mutation DeleteProjectNote($id: ID!) {
    deleteProjectNote(id: $id)
  }
`;

// ===== Proyectos =====


export const CREATE_PROJECT = gql`
  mutation CreateProject($data: ProjectInput!) {
    createProject(data: $data) {
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
  }
`;


export const UPDATE_PROJECT = gql`
  mutation UpdateProject($id: ID!, $data: ProjectInput!) {
    updateProject(id: $id, data: $data) {
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
  }
`;

// Persiste el orden manual ("Mi orden") de proyectos; devuelve solo id+position.

export const REORDER_PROJECTS = gql`
  mutation ReorderProjects($orderedIds: [ID!]!) {
    reorderProjects(orderedIds: $orderedIds) {
      id
      position
    }
  }
`;

// Insight del "cementerio" (proyectos killed): reflexión IA agregada, cacheada en
// servidor (`isStale` indica si conviene recomputar).

export const GRAVEYARD_INSIGHT_QUERY = gql`
  query GraveyardInsight {
    graveyardInsight {
      body
      deathsCount
      computedAt
      isStale
    }
  }
`;

// ===== Categorías =====


export const CREATE_CATEGORY = gql`
  mutation CreateCategory($data: CategoryInput!) {
    createCategory(data: $data) {
      id
      name
      color
      created
    }
  }
`;


export const UPDATE_CATEGORY = gql`
  mutation UpdateCategory($id: ID!, $data: CategoryInput!) {
    updateCategory(id: $id, data: $data) {
      id
      name
      color
      created
    }
  }
`;


export const DELETE_CATEGORY = gql`
  mutation DeleteCategory($id: ID!) {
    deleteCategory(id: $id)
  }
`;


export const DELETE_PROJECT = gql`
  mutation DeleteProject($id: ID!) {
    deleteProject(id: $id)
  }
`;

// ===== Tareas =====
