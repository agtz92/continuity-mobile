import { gql } from "@apollo/client";

// ===== Conector de Claude (MCP remoto) =====
// Clientes OAuth (Claude) que el usuario autorizó contra el conector MCP.
export const MCP_CONNECTIONS_QUERY = gql`
  query McpConnections {
    mcpConnections {
      clientId
      clientName
      connectedAt
    }
  }
`;


export const REVOKE_MCP_CONNECTION = gql`
  mutation RevokeMcpConnection($clientId: ID!) {
    revokeMcpConnection(clientId: $clientId)
  }
`;

// ===== Notificaciones / push =====
// --- Push notifications (Fase 8) ----------------------------------------------
// These documents target backend mutations that DO NOT EXIST YET in
// agtz92/continuity_backend. They are kept here so the client is ready to wire,
// but execution is gated behind PUSH_BACKEND_READY in src/lib/notifications.ts.
// When implementing the backend, match these signatures (scalar Boolean return):
//   registerPushToken(token: String!, deviceId: String!): Boolean
//   unregisterPushToken(deviceId: String!): Boolean
