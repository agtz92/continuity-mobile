import { gql } from "@apollo/client";

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

// ===== Admin — anuncios =====
// Operaciones del portal admin (regla 10: el portal está excluido del móvil, pero
// estas ops conviven aquí como espejo del schema). Gateadas por `me.isAdmin`.


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

// ===== Admin — métricas, facturación y auditoría =====


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

// Inicia el enlace de un canal externo (p. ej. Telegram): devuelve token + deep link
// que el usuario abre para confirmar la vinculación.

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

// ===== Analítica =====

// Panel de analítica (cadencia, series, heatmap, backlog, embudo de ideas, esfuerzo)
// para un rango; alimenta la pantalla de estadísticas.

export const REGISTER_PUSH_TOKEN = gql`
  mutation RegisterPushToken($token: String!, $deviceId: String!) {
    registerPushToken(token: $token, deviceId: $deviceId)
  }
`;


export const UNREGISTER_PUSH_TOKEN = gql`
  mutation UnregisterPushToken($deviceId: String!) {
    unregisterPushToken(deviceId: $deviceId)
  }
`;

// ===== Cuenta y feedback =====

// Permanently deletes the user's account + all data (Apple requirement). After
// success the client must sign out. Does NOT cancel Stripe — warn the user.
