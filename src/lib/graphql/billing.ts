import { gql } from "@apollo/client";

export const CREATE_CHECKOUT_SESSION = gql`
  mutation CreateCheckoutSession(
    $plan: PurchasablePlan!
    $period: BillingPeriod!
    $locale: String
  ) {
    createCheckoutSession(plan: $plan, period: $period, locale: $locale) {
      url
    }
  }
`;


export const CREATE_PORTAL_SESSION = gql`
  mutation CreatePortalSession($locale: String) {
    createPortalSession(locale: $locale) {
      url
    }
  }
`;


export const APPLY_RETENTION_OFFER = gql`
  mutation ApplyRetentionOffer(
    $reason: CancellationReason!
    $feedbackText: String
  ) {
    applyRetentionOffer(reason: $reason, feedbackText: $feedbackText) {
      applied
      couponId
      reason
    }
  }
`;


export const CANCEL_SUBSCRIPTION = gql`
  mutation CancelSubscription(
    $reason: CancellationReason!
    $feedbackText: String
  ) {
    cancelSubscription(reason: $reason, feedbackText: $feedbackText) {
      scheduled
      currentPeriodEnd
    }
  }
`;


export const REACTIVATE_SUBSCRIPTION = gql`
  mutation ReactivateSubscription {
    reactivateSubscription {
      success
    }
  }
`;


export const DOWNGRADE_TO_PLAN = gql`
  mutation DowngradeToPlan(
    $plan: PurchasablePlan!
    $period: BillingPeriod!
  ) {
    downgradeToPlan(plan: $plan, period: $period) {
      success
      fromPlan
      toPlan
    }
  }
`;

// ===== Admin — CMS (blog y páginas) =====

// Fragment con el detalle completo de un post del blog; reutilizado por todas las
// ops de blog admin (list/get/create/update/publish).
