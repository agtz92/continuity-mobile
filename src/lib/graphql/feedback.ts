import { gql } from "@apollo/client";

export const DELETE_ACCOUNT = gql`
  mutation DeleteAccount {
    deleteAccount
  }
`;

// Todo lo que guardamos del usuario, como JSON en un string (portabilidad).
// Backend `core/services/data_export.py`.
export const MY_DATA_EXPORT = gql`
  query MyDataExport {
    myDataExport
  }
`;

// Bug report / feedback (user → admin, one-way). Lands in the admin inbox; no
// reply channel. `platform` is "app" from mobile.

export const SUBMIT_BUG_REPORT = gql`
  mutation SubmitBugReport($data: BugReportInput!) {
    submitBugReport(data: $data)
  }
`;
