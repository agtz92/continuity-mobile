import { gql } from "@apollo/client";

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

// ===== Admin — usuarios y planes =====
