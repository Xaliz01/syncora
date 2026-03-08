import type { PermissionCode } from "@syncora/shared";

export interface PermissionMetadata {
  code: PermissionCode;
  label: string;
  description: string;
}

export const PERMISSION_METADATA: Record<PermissionCode, PermissionMetadata> = {
  "users.read": {
    code: "users.read",
    label: "Voir les utilisateurs",
    description: "Consulter la liste des utilisateurs de l’organisation."
  },
  "users.invite": {
    code: "users.invite",
    label: "Inviter des utilisateurs",
    description: "Créer et envoyer des invitations à des utilisateurs."
  },
  "users.assign_profile": {
    code: "users.assign_profile",
    label: "Affecter des profils",
    description: "Associer un profil de permissions à un utilisateur."
  },
  "users.manage_permissions": {
    code: "users.manage_permissions",
    label: "Gérer les permissions utilisateurs",
    description: "Ajouter/retirer des permissions spécifiques à un utilisateur."
  },
  "permission_profiles.read": {
    code: "permission_profiles.read",
    label: "Voir les profils",
    description: "Consulter les profils de permissions de l’organisation."
  },
  "permission_profiles.create": {
    code: "permission_profiles.create",
    label: "Créer des profils",
    description: "Créer de nouveaux profils de permissions."
  },
  "permission_profiles.update": {
    code: "permission_profiles.update",
    label: "Modifier les profils",
    description: "Mettre à jour les profils de permissions existants."
  },
  "permission_profiles.delete": {
    code: "permission_profiles.delete",
    label: "Supprimer des profils",
    description: "Supprimer des profils de permissions."
  }
};

export function getPermissionLabel(permissionCode: PermissionCode): string {
  return PERMISSION_METADATA[permissionCode]?.label ?? permissionCode;
}
