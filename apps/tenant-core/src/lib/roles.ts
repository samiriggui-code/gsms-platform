/** Capacités portail client selon le rôle d’organisation. */
import i18n from "@/i18n/config";

export type RoleKey = "owner" | "admin" | "member" | "viewer" | string;

export function roleLabel(role: RoleKey): string {
  switch (role.toLowerCase()) {
    case "owner":
      return i18n.t("roles.owner");
    case "admin":
      return i18n.t("roles.admin");
    case "member":
      return i18n.t("roles.member");
    case "viewer":
      return i18n.t("roles.viewer");
    default:
      return role;
  }
}

export type PermissionRow = {
  id: string;
  label: string;
  granted: boolean;
};

export function permissionsForRole(role: RoleKey): PermissionRow[] {
  const r = role.toLowerCase();
  const isOwner = r === "owner";
  const isAdmin = isOwner || r === "admin";
  const canWrite = isAdmin || r === "member";

  return [
    { id: "view", label: i18n.t("permissions.view"), granted: true },
    { id: "upload", label: i18n.t("permissions.upload"), granted: canWrite },
    {
      id: "finance",
      label: i18n.t("permissions.finance"),
      granted: canWrite || r === "viewer",
    },
    { id: "sign", label: i18n.t("permissions.sign"), granted: isAdmin },
    { id: "invite", label: i18n.t("permissions.invite"), granted: isAdmin },
    { id: "sites", label: i18n.t("permissions.sites"), granted: isOwner },
    { id: "billing", label: i18n.t("permissions.billing"), granted: isOwner },
  ];
}
