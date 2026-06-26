import { gql } from "@apollo/client";

export const DELETE_ACCOUNT = gql`
  mutation DeleteAccount {
    deleteAccount
  }
`;

// Bug report / feedback (user → admin, one-way). Lands in the admin inbox; no
// reply channel. `platform` is "app" from mobile.

export const SUBMIT_BUG_REPORT = gql`
  mutation SubmitBugReport($data: BugReportInput!) {
    submitBugReport(data: $data)
  }
`;
