// Zone D ships the static manifest on purpose: all four functions mutate, so
// there is no health endpoint to call (plan §0.2).
export const EDGE_FUNCTIONS = [
  'admin-create-user',
  'admin-delete-user',
  'auto-scheduler',
  'send-notification',
];
