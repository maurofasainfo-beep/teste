import "server-only";

import { ConfiguredNotificationProvider } from "./configured-notification-provider";

export function getNotificationProvider() {
  return new ConfiguredNotificationProvider();
}

