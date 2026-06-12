import { getAppUrl } from "@/lib/env";
import { maskBrazilianPhone } from "@/lib/phone";

export function buildCustomerQueuePath(token: string) {
  return `/queue/customer/${token}`;
}

export function buildCustomerQueueLink(token: string, baseUrl = getAppUrl()) {
  return `${baseUrl.replace(/\/$/, "")}${buildCustomerQueuePath(token)}`;
}

export function maskPhone(phone: string | null | undefined) {
  return maskBrazilianPhone(phone);
}
