import { gql } from "@apollo/client";
import { ONBOARDING_STATE_FIELDS, TODAY_LAYOUT_FIELDS } from "./fragments";

export const PROFILE_QUERY = gql`
  query Profile {
    profile {
      avatar
      firstName
    }
  }
`;

// Estado del flujo de onboarding (paso actual, tour, plan); reutilizado por la query
// y por las mutations que avanzan/completan onboarding. NOTE: string, no fragment gql.

export const ONBOARDING_STATE_QUERY = gql`
  query OnboardingState {
    onboardingState {
      ${ONBOARDING_STATE_FIELDS}
    }
  }
`;


export const SET_ONBOARDING_STEP = gql`
  mutation SetOnboardingStep($step: Int!) {
    setOnboardingStep(step: $step) {
      ${ONBOARDING_STATE_FIELDS}
    }
  }
`;


export const COMPLETE_ONBOARDING = gql`
  mutation CompleteOnboarding($mode: String) {
    completeOnboarding(mode: $mode) {
      ${ONBOARDING_STATE_FIELDS}
    }
  }
`;


export const MARK_TOUR = gql`
  mutation MarkTour($seen: Boolean!) {
    markTour(seen: $seen) {
      ${ONBOARDING_STATE_FIELDS}
    }
  }
`;

// Orden/visibilidad de las secciones del Today (persistidos por usuario); reutilizado
// por la query y por update/reset del layout. NOTE: string de campos, no fragment gql.

export const TODAY_LAYOUT_QUERY = gql`
  query TodayLayout {
    todayLayout {
      ${TODAY_LAYOUT_FIELDS}
    }
  }
`;


export const UPDATE_TODAY_LAYOUT = gql`
  mutation UpdateTodayLayout($order: [String!], $hidden: [String!]) {
    updateTodayLayout(order: $order, hidden: $hidden) {
      ${TODAY_LAYOUT_FIELDS}
    }
  }
`;


export const RESET_TODAY_LAYOUT = gql`
  mutation ResetTodayLayout {
    resetTodayLayout {
      ${TODAY_LAYOUT_FIELDS}
    }
  }
`;

// Feed de actividad paginado/filtrable (por proyecto, rango, tipos); distinto del
// dashboard que trae solo un corte reciente.

export const ACTIVITY_QUERY = gql`
  query ActivityFeed(
    $limit: Int
    $since: DateTime
    $until: DateTime
    $projectId: ID
    $kinds: [String!]
  ) {
    activity(
      limit: $limit
      since: $since
      until: $until
      projectId: $projectId
      kinds: $kinds
    ) {
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
  }
`;


export const UPDATE_PROFILE = gql`
  mutation UpdateProfile($avatar: String, $firstName: String) {
    updateProfile(avatar: $avatar, firstName: $firstName) {
      avatar
      firstName
    }
  }
`;

// ===== Integración Google Tasks (import) =====
// Flujo OAuth + importación de listas de Google Tasks a proyectos/tareas.
