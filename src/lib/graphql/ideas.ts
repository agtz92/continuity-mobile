import { gql } from "@apollo/client";

export const CREATE_IDEA = gql`
  mutation CreateIdea($data: IdeaInput!) {
    createIdea(data: $data) {
      id
      title
      description
      why
      created
    }
  }
`;


export const UPDATE_IDEA = gql`
  mutation UpdateIdea($id: ID!, $data: IdeaInput!) {
    updateIdea(id: $id, data: $data) {
      id
      title
      description
      why
      created
    }
  }
`;


export const DELETE_IDEA = gql`
  mutation DeleteIdea($id: ID!) {
    deleteIdea(id: $id)
  }
`;

// Convierte una idea en proyecto; devuelve campos del proyecto recién creado.

export const PROMOTE_IDEA = gql`
  mutation PromoteIdea($id: ID!) {
    promoteIdea(id: $id) {
      id
      name
      status
      created
      lastActivity
    }
  }
`;

// ===== Ideas / Notas — Quick Notes (cuaderno tipo Notion) =====

// Campos de una Quick Note incluyendo sus secciones plegables; reutilizado por la
// query y por create/update/reorder. NOTE: string de campos, no fragment gql.
