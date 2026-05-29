import { gql } from "@apollo/client";

export const ME_QUERY = gql`
  query Me {
    me {
      userId
      isAdmin
    }
  }
`;

export const NOTIFICATIONS_QUERY = gql`
  query InAppNotifications {
    notifications {
      id
      kind
      severity
      title
      body
      ctaLabel
      ctaUrl
      dismissible
      i18nKind
      i18nVarsJson
    }
  }
`;

export const ADMIN_ANNOUNCEMENTS_QUERY = gql`
  query AdminAnnouncements($status: String) {
    adminAnnouncements(status: $status) {
      id
      title
      body
      severity
      status
      audiencePlans
      audienceUserIds
      startsAt
      endsAt
      dismissible
      ctaLabel
      ctaUrl
      createdBy
      createdAt
      updatedAt
    }
  }
`;

export const ADMIN_ANNOUNCEMENT_QUERY = gql`
  query AdminAnnouncement($id: ID!) {
    adminAnnouncement(id: $id) {
      id
      title
      body
      severity
      status
      audiencePlans
      audienceUserIds
      startsAt
      endsAt
      dismissible
      ctaLabel
      ctaUrl
      createdBy
      createdAt
      updatedAt
    }
  }
`;

export const ADMIN_ANNOUNCEMENT_CREATE = gql`
  mutation AdminAnnouncementCreate($data: AnnouncementInput!) {
    adminAnnouncementCreate(data: $data) {
      id
      title
      status
      severity
    }
  }
`;

export const ADMIN_ANNOUNCEMENT_UPDATE = gql`
  mutation AdminAnnouncementUpdate($id: ID!, $data: AnnouncementInput!) {
    adminAnnouncementUpdate(id: $id, data: $data) {
      id
      title
      status
      severity
    }
  }
`;

export const ADMIN_ANNOUNCEMENT_SET_STATUS = gql`
  mutation AdminAnnouncementSetStatus($id: ID!, $status: String!) {
    adminAnnouncementSetStatus(id: $id, status: $status) {
      id
      status
    }
  }
`;

export const ADMIN_ANNOUNCEMENT_DELETE = gql`
  mutation AdminAnnouncementDelete($id: ID!) {
    adminAnnouncementDelete(id: $id)
  }
`;

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

const BLOG_POST_FRAGMENT = gql`
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

const PAGE_FRAGMENT = gql`
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

export const ADMIN_BLOG_POSTS_QUERY = gql`
  ${BLOG_POST_FRAGMENT}
  query AdminBlogPosts(
    $page: Int
    $perPage: Int
    $status: String
    $search: String
  ) {
    adminBlogPosts(
      page: $page
      perPage: $perPage
      status: $status
      search: $search
    ) {
      posts {
        ...AdminBlogPostFields
      }
      page
      perPage
      hasNext
    }
  }
`;

export const ADMIN_BLOG_POST_QUERY = gql`
  ${BLOG_POST_FRAGMENT}
  query AdminBlogPost($id: ID!) {
    adminBlogPost(id: $id) {
      ...AdminBlogPostFields
    }
  }
`;

export const ADMIN_BLOG_POST_CREATE = gql`
  ${BLOG_POST_FRAGMENT}
  mutation AdminBlogPostCreate($data: BlogPostInput!) {
    adminBlogPostCreate(data: $data) {
      ...AdminBlogPostFields
    }
  }
`;

export const ADMIN_BLOG_POST_UPDATE = gql`
  ${BLOG_POST_FRAGMENT}
  mutation AdminBlogPostUpdate($id: ID!, $data: BlogPostInput!) {
    adminBlogPostUpdate(id: $id, data: $data) {
      ...AdminBlogPostFields
    }
  }
`;

export const ADMIN_BLOG_POST_PUBLISH = gql`
  ${BLOG_POST_FRAGMENT}
  mutation AdminBlogPostPublish($id: ID!, $published: Boolean!) {
    adminBlogPostPublish(id: $id, published: $published) {
      ...AdminBlogPostFields
    }
  }
`;

export const ADMIN_BLOG_POST_DELETE = gql`
  mutation AdminBlogPostDelete($id: ID!) {
    adminBlogPostDelete(id: $id)
  }
`;

export const ADMIN_PAGES_QUERY = gql`
  ${PAGE_FRAGMENT}
  query AdminPages($page: Int, $perPage: Int, $status: String) {
    adminPages(page: $page, perPage: $perPage, status: $status) {
      ...AdminPageFields
    }
  }
`;

export const ADMIN_PAGE_QUERY = gql`
  ${PAGE_FRAGMENT}
  query AdminPage($id: ID!) {
    adminPage(id: $id) {
      ...AdminPageFields
    }
  }
`;

export const ADMIN_PAGE_CREATE = gql`
  ${PAGE_FRAGMENT}
  mutation AdminPageCreate($data: PageInput!) {
    adminPageCreate(data: $data) {
      ...AdminPageFields
    }
  }
`;

export const ADMIN_PAGE_UPDATE = gql`
  ${PAGE_FRAGMENT}
  mutation AdminPageUpdate($id: ID!, $data: PageInput!) {
    adminPageUpdate(id: $id, data: $data) {
      ...AdminPageFields
    }
  }
`;

export const ADMIN_PAGE_PUBLISH = gql`
  ${PAGE_FRAGMENT}
  mutation AdminPagePublish($id: ID!, $published: Boolean!) {
    adminPagePublish(id: $id, published: $published) {
      ...AdminPageFields
    }
  }
`;

export const ADMIN_PAGE_DELETE = gql`
  mutation AdminPageDelete($id: ID!) {
    adminPageDelete(id: $id)
  }
`;

export const ADMIN_MEDIA_ASSETS_QUERY = gql`
  query AdminMediaAssets($page: Int, $perPage: Int) {
    adminMediaAssets(page: $page, perPage: $perPage) {
      assets {
        id
        storagePath
        publicUrl
        originalFilename
        mimeType
        sizeBytes
        width
        height
        createdAt
      }
      page
      perPage
      hasNext
    }
  }
`;

export const ADMIN_MEDIA_REGISTER = gql`
  mutation AdminMediaRegister($data: MediaRegisterInput!) {
    adminMediaRegister(data: $data) {
      id
      storagePath
      publicUrl
      originalFilename
      mimeType
      sizeBytes
      width
      height
      createdAt
    }
  }
`;

export const ADMIN_MEDIA_DELETE = gql`
  mutation AdminMediaDelete($id: ID!) {
    adminMediaDelete(id: $id)
  }
`;

const ADMIN_HELP_CATEGORY_FIELDS = `
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

const ADMIN_HELP_RESOURCE_FIELDS = `
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

export const ADMIN_HELP_CATEGORIES_QUERY = gql`
  query AdminHelpCategories($locale: String) {
    adminHelpCategories(locale: $locale) {
      ${ADMIN_HELP_CATEGORY_FIELDS}
    }
  }
`;

export const ADMIN_HELP_CATEGORY_CREATE = gql`
  mutation AdminHelpCategoryCreate($data: HelpCategoryInput!) {
    adminHelpCategoryCreate(data: $data) {
      ${ADMIN_HELP_CATEGORY_FIELDS}
    }
  }
`;

export const ADMIN_HELP_CATEGORY_UPDATE = gql`
  mutation AdminHelpCategoryUpdate($id: ID!, $data: HelpCategoryInput!) {
    adminHelpCategoryUpdate(id: $id, data: $data) {
      ${ADMIN_HELP_CATEGORY_FIELDS}
    }
  }
`;

export const ADMIN_HELP_CATEGORY_DELETE = gql`
  mutation AdminHelpCategoryDelete($id: ID!) {
    adminHelpCategoryDelete(id: $id)
  }
`;

export const ADMIN_HELP_RESOURCES_QUERY = gql`
  query AdminHelpResources(
    $page: Int
    $perPage: Int
    $status: String
    $locale: String
    $categoryId: ID
    $search: String
  ) {
    adminHelpResources(
      page: $page
      perPage: $perPage
      status: $status
      locale: $locale
      categoryId: $categoryId
      search: $search
    ) {
      resources {
        ${ADMIN_HELP_RESOURCE_FIELDS}
      }
      page
      perPage
      hasNext
    }
  }
`;

export const ADMIN_HELP_RESOURCE_QUERY = gql`
  query AdminHelpResource($id: ID!) {
    adminHelpResource(id: $id) {
      ${ADMIN_HELP_RESOURCE_FIELDS}
    }
  }
`;

export const ADMIN_HELP_RESOURCE_CREATE = gql`
  mutation AdminHelpResourceCreate($data: HelpResourceInput!) {
    adminHelpResourceCreate(data: $data) {
      ${ADMIN_HELP_RESOURCE_FIELDS}
    }
  }
`;

export const ADMIN_HELP_RESOURCE_UPDATE = gql`
  mutation AdminHelpResourceUpdate($id: ID!, $data: HelpResourceInput!) {
    adminHelpResourceUpdate(id: $id, data: $data) {
      ${ADMIN_HELP_RESOURCE_FIELDS}
    }
  }
`;

export const ADMIN_HELP_RESOURCE_PUBLISH = gql`
  mutation AdminHelpResourcePublish($id: ID!, $published: Boolean!) {
    adminHelpResourcePublish(id: $id, published: $published) {
      ${ADMIN_HELP_RESOURCE_FIELDS}
    }
  }
`;

export const ADMIN_HELP_RESOURCE_DELETE = gql`
  mutation AdminHelpResourceDelete($id: ID!) {
    adminHelpResourceDelete(id: $id)
  }
`;

export const ADMIN_NOTIFICATION_JOBS_QUERY = gql`
  query AdminNotificationJobs(
    $page: Int
    $perPage: Int
    $status: String
    $channel: String
    $kind: String
    $userId: ID
  ) {
    adminNotificationJobs(
      page: $page
      perPage: $perPage
      status: $status
      channel: $channel
      kind: $kind
      userId: $userId
    ) {
      jobs {
        id
        userId
        channel
        kind
        dedupeKey
        body
        scheduledFor
        status
        attempts
        externalMessageId
        error
        created
        sentAt
      }
      page
      perPage
      hasNext
    }
  }
`;

export const ADMIN_NOTIFICATION_JOB_RETRY = gql`
  mutation AdminNotificationJobRetry($id: ID!) {
    adminNotificationJobRetry(id: $id) {
      id
      status
      error
    }
  }
`;

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

export const DASHBOARD_QUERY = gql`
  query Dashboard {
    dashboard {
      projects {
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
      }
      tasks {
        id
        title
        projectId
        dueDate
        done
        completedAt
        created
        effortHours
        blockers {
          id
          blockedTaskId
          blockingTaskId
          externalDescription
          created
        }
      }
      ideas {
        id
        title
        description
        why
        created
      }
      activities {
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
      categories {
        id
        name
        color
        created
      }
      projectNotes {
        id
        projectId
        title
        body
        created
        updatedAt
      }
      routines {
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
      }
      routineOccurrences {
        id
        routineId
        scheduledDate
        completedAt
        note
        created
      }
      lastBackup
    }
  }
`;

const ROUTINE_FIELDS = `
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

const TASK_BLOCKER_FIELDS = `
  id
  blockedTaskId
  blockingTaskId
  externalDescription
  created
`;

const ROUTINE_OCCURRENCE_FIELDS = `
  id
  routineId
  scheduledDate
  completedAt
  note
  created
`;

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
    }
  }
`;

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

const ACTIVITY_FIELDS = `
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

export const MARK_BACKUP = gql`
  mutation MarkBackup {
    markBackup
  }
`;

export const NOTIFICATION_SETTINGS_QUERY = gql`
  query NotificationSettings {
    notificationSettings {
      locale
      theme
      palette
      timezone
      digestEnabled
      digestDayOfWeek
      digestHour
      dailyDigestEnabled
      dailyDigestHour
      sleepingAlertsEnabled
      dueRemindersEnabled
      dueReminderHour
      manualEnabled
      isAdmin
      links {
        channel
        connected
        verifiedAt
      }
    }
  }
`;

export const UPDATE_NOTIFICATION_SETTINGS = gql`
  mutation UpdateNotificationSettings($data: NotificationSettingsInput!) {
    updateNotificationSettings(data: $data) {
      locale
      theme
      palette
      timezone
      digestEnabled
      digestDayOfWeek
      digestHour
      dailyDigestEnabled
      dailyDigestHour
      sleepingAlertsEnabled
      dueRemindersEnabled
      dueReminderHour
      manualEnabled
      isAdmin
      links {
        channel
        connected
        verifiedAt
      }
    }
  }
`;

export const REQUEST_CHANNEL_LINK = gql`
  mutation RequestChannelLink($channel: NotificationChannel!) {
    requestChannelLink(channel: $channel) {
      token
      deepLink
      expiresAt
    }
  }
`;

export const DISCONNECT_CHANNEL = gql`
  mutation DisconnectChannel($channel: NotificationChannel!) {
    disconnectChannel(channel: $channel)
  }
`;

export const ANALYTICS_QUERY = gql`
  query Analytics($range: AnalyticsRange!) {
    analytics(range: $range) {
      range
      rangeStart
      rangeEnd
      cadence {
        currentStreak
        longestStreak
        activeDaysInRange
        totalActivityEvents
      }
      activitySeries {
        day
        updates
        completedTasks
        totalEvents
      }
      weekdayHeatmap {
        weekday
        count
      }
      topProjects {
        projectId
        name
        status
        interactions
        deltaVsPrev
      }
      statusCounts {
        status
        count
      }
      categoryBreakdown {
        categoryId
        name
        color
        projectCount
        interactions
      }
      backlog {
        overdueTasks
        dueSoonTasks
        openTasks
        quickWins
        almostThere
      }
      sleepingProjects {
        projectId
        name
        daysIdle
        bucket
      }
      staleIdeas {
        ideaId
        title
        daysOld
      }
      ideaFunnel {
        ideasCreated
        ideasPromoted
        promotionRate
      }
      effort {
        effortHoursTotal
        tasksWithEffortPct
        effortHoursByProject {
          projectId
          name
          hours
        }
      }
    }
  }
`;

export const PROFILE_QUERY = gql`
  query Profile {
    profile {
      avatar
      firstName
    }
  }
`;

const ONBOARDING_STATE_FIELDS = `
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

export const GOOGLE_TASKS_CONNECTION_QUERY = gql`
  query GoogleTasksConnection {
    googleTasksConnection {
      connected
      email
      connectedAt
    }
  }
`;

export const GOOGLE_TASKS_AUTH_URL = gql`
  mutation GoogleTasksAuthUrl($returnTo: String!) {
    googleTasksAuthUrl(returnTo: $returnTo)
  }
`;

export const GOOGLE_TASK_LISTS_QUERY = gql`
  query GoogleTaskLists {
    googleTaskLists {
      id
      title
    }
  }
`;

export const IMPORT_GOOGLE_TASKS = gql`
  mutation ImportGoogleTasks($mappings: [GoogleTasksImportMapping!]!) {
    importGoogleTasks(mappings: $mappings) {
      imported
      skipped
      createdProjects
    }
  }
`;

export const DISCONNECT_GOOGLE_TASKS = gql`
  mutation DisconnectGoogleTasks {
    disconnectGoogleTasks
  }
`;
