import { gql } from "@apollo/client";

export const ADMIN_USERS_QUERY = gql`
  query AdminUsers(
    $page: Int
    $perPage: Int
    $emailContains: String
    $plan: String
    $adminsOnly: Boolean
  ) {
    adminUsers(
      page: $page
      perPage: $perPage
      emailContains: $emailContains
      plan: $plan
      adminsOnly: $adminsOnly
    ) {
      users {
        userId
        email
        plan
        isAdmin
        isBillingExempt
        createdAt
        lastSignInAt
        lastActivity
        counts {
          projects
          tasksOpen
          tasksDone
          ideas
          notes
        }
      }
      page
      perPage
      hasNext
    }
  }
`;


export const ADMIN_USER_QUERY = gql`
  query AdminUser($userId: ID!) {
    adminUser(userId: $userId) {
      userId
      email
      plan
      isAdmin
      isBillingExempt
      planRenewsAt
      stripeCustomerId
      stripeSubscriptionId
      createdAt
      lastSignInAt
      emailConfirmedAt
      bannedUntil
      lastActivity
      counts {
        projects
        tasksOpen
        tasksDone
        ideas
        notes
      }
      usageLast30d {
        date
        messagesSent
        tokensIn
        tokensOut
        costUsdCents
      }
      notifications {
        digestEnabled
        dailyDigestEnabled
        dueRemindersEnabled
        sleepingAlertsEnabled
        isAdmin
        links {
          channel
          verified
          created
        }
      }
    }
  }
`;


export const ADMIN_SET_USER_PLAN = gql`
  mutation AdminSetUserPlan($userId: ID!, $plan: String!) {
    adminSetUserPlan(userId: $userId, plan: $plan) {
      userId
      plan
      isAdmin
    }
  }
`;


export const ADMIN_SET_USER_IS_ADMIN = gql`
  mutation AdminSetUserIsAdmin($userId: ID!, $isAdmin: Boolean!) {
    adminSetUserIsAdmin(userId: $userId, isAdmin: $isAdmin) {
      userId
      isAdmin
    }
  }
`;


export const ADMIN_SET_USER_IS_BILLING_EXEMPT = gql`
  mutation AdminSetUserIsBillingExempt(
    $userId: ID!
    $isBillingExempt: Boolean!
  ) {
    adminSetUserIsBillingExempt(
      userId: $userId
      isBillingExempt: $isBillingExempt
    ) {
      userId
      isBillingExempt
    }
  }
`;

// ===== Billing / suscripción (Stripe) =====
// Checkout/portal abren URLs externas (regla 10: sin IAP en móvil, billing es
// read-only y se delega a Stripe vía Linking).


export const ADMIN_SYSTEM_STATS_QUERY = gql`
  query AdminSystemStats {
    adminSystemStats {
      totalUsers
      totalAccounts
      admins
      dau
      wau
      mau
      blogPostsPublished
      blogPostsDraft
      pagesPublished
      pendingJobs
      failedJobs
      tasksOpen
      tasksDone30d
      ideasTotal
      planCounts {
        plan
        count
      }
      jobStatusCounts {
        status
        count
      }
      signupsSeries {
        date
        value
      }
      activitySeries {
        date
        value
      }
      activityByKind {
        label
        count
      }
      projectStateCounts {
        label
        count
      }
      recentSignups {
        userId
        email
        createdAt
        plan
      }
    }
  }
`;


export const ADMIN_BILLING_OVERVIEW_QUERY = gql`
  query AdminBillingOverview {
    adminBillingOverview {
      currency
      isTestMode
      payingSubscribers
      mrrCents
      arrCents
      billingExemptCount
      pendingCancellations
      breakdown {
        plan
        period
        count
        monthlyCentsEach
        totalMonthlyCents
      }
      upcomingChurn {
        userId
        email
        plan
        period
        planRenewsAt
        monthlyCents
      }
    }
  }
`;


export const ADMIN_SUBSCRIBERS_QUERY = gql`
  query AdminSubscribers(
    $page: Int
    $perPage: Int
    $plan: String
    $period: String
    $emailContains: String
    $includeExempt: Boolean
  ) {
    adminSubscribers(
      page: $page
      perPage: $perPage
      plan: $plan
      period: $period
      emailContains: $emailContains
      includeExempt: $includeExempt
    ) {
      rows {
        userId
        email
        plan
        period
        monthlyCents
        planRenewsAt
        cancelAtPeriodEnd
        isBillingExempt
        stripeCustomerId
        stripeSubscriptionId
      }
      page
      perPage
      hasNext
      total
    }
  }
`;


export const ADMIN_AUDIT_LOG_QUERY = gql`
  query AdminAuditLog(
    $page: Int
    $perPage: Int
    $actorUserId: ID
    $actionContains: String
    $targetUserId: ID
  ) {
    adminAuditLog(
      page: $page
      perPage: $perPage
      actorUserId: $actorUserId
      actionContains: $actionContains
      targetUserId: $targetUserId
    ) {
      entries {
        id
        actorUserId
        action
        targetType
        targetId
        payload
        created
      }
      page
      perPage
      hasNext
    }
  }
`;

// ===== Dashboard / core =====

// Query "todo en uno" que hidrata la app al arrancar: proyectos, tareas, ideas,
// actividad, categorías, notas, rutinas y ocurrencias en una sola ida al backend.
