import { requiredEnv } from "./env";

const invitationEnv = {
  CTF: "WORKSHOP_CTF_COMMUNITY_LINK",
  BCC: "WORKSHOP_BCC_COMMUNITY_LINK",
  CP: "WORKSHOP_CP_COMMUNITY_LINK",
} as const;

export function invitationUrlForPath(path: "CTF" | "BCC" | "CP"): string {
  return requiredEnv(invitationEnv[path]);
}
