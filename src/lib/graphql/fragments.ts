import { gql } from "@apollo/client";

// Campos de cierre/estado de proyecto (pausa, kill, stalled, posición) agrupados
// para que cada selección de proyecto los devuelva igual y "round-trip"; se
// reutiliza en DASHBOARD_QUERY, CREATE_PROJECT y UPDATE_PROJECT.
export const PROJECT_CLOSURE_FIELDS = `
  pausedContext
  pausedNextAction
  pausedBlocker
  pausedAt
  killedReason
  killedLearnings
  killedWouldRestart
  killedAt
  killedAiReflection
  stalledAt
  position
`;

// Identidad mínima del usuario; `isAdmin` gatea el acceso a las pantallas/ops admin.

export const BLOG_POST_FRAGMENT = gql`
  fragment AdminBlogPostFields on AdminBlogPost {
    id
    slug
    title
    excerpt
    contentJson
    contentHtml
    coverImageUrl
    status
    publishedAt
    tags
    seoTitle
    seoDescription
    locale
    createdAt
    updatedAt
  }
`;

// Fragment con el detalle de una página estática del CMS; reutilizado por todas
// las ops de páginas admin (list/get/create/update/publish).

export const PAGE_FRAGMENT = gql`
  fragment AdminPageFields on AdminPage {
    id
    path
    title
    excerpt
    contentJson
    contentHtml
    coverImageUrl
    status
    publishedAt
    showInNav
    navOrder
    seoTitle
    seoDescription
    locale
    createdAt
    updatedAt
  }
`;


export const ADMIN_HELP_CATEGORY_FIELDS = `
  id
  slug
  name
  description
  icon
  order
  locale
  createdAt
  updatedAt
  resourceCount
`;

// Campos de un recurso/artículo de ayuda; reutilizado por las ops de recursos.
// NOTE: string de campos, no fragment gql — candidato a convertir en fragment.

export const ADMIN_HELP_RESOURCE_FIELDS = `
  id
  slug
  title
  excerpt
  contentJson
  contentHtml
  coverImageUrl
  categoryId
  categorySlug
  categoryName
  status
  publishedAt
  tags
  seoTitle
  seoDescription
  locale
  order
  createdAt
  updatedAt
`;


export const ROUTINE_FIELDS = `
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
`;

// Campos de un bloqueador de tarea; reutilizado por las ops de tareas (create/
// update/toggle) y addTaskBlocker. NOTE: string de campos, no fragment gql.

export const TASK_BLOCKER_FIELDS = `
  id
  blockedTaskId
  blockingTaskId
  externalDescription
  created
`;

// Campos de una ocurrencia (instancia diaria) de rutina; reutilizado al completar
// ocurrencias. NOTE: string de campos, no fragment gql — candidato a fragment.

export const ROUTINE_OCCURRENCE_FIELDS = `
  id
  routineId
  scheduledDate
  completedAt
  note
  created
`;


export const QUICK_NOTE_FIELDS = `
  id
  title
  categoryId
  projectId
  pinned
  created
  updatedAt
  sections {
    id
    noteId
    heading
    body
    position
    collapsed
    created
    updatedAt
  }
`;


export const ACTIVITY_FIELDS = `
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


export const ONBOARDING_STATE_FIELDS = `
  status
  currentStep
  tourStatus
  completedAt
  completedVia
  firstName
  avatar
  plan
  isBillingExempt
`;


export const TODAY_LAYOUT_FIELDS = `
  order
  hidden
`;
