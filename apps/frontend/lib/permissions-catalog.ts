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
    description: "Consulter la liste des utilisateurs de l'organisation."
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
    description: "Consulter les profils de permissions de l'organisation."
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
  },
  "cases.read": {
    code: "cases.read",
    label: "Voir les dossiers",
    description: "Consulter la liste et le détail des dossiers."
  },
  "cases.create": {
    code: "cases.create",
    label: "Créer des dossiers",
    description: "Créer de nouveaux dossiers."
  },
  "cases.update": {
    code: "cases.update",
    label: "Modifier les dossiers",
    description: "Mettre à jour les dossiers et compléter les tâches."
  },
  "cases.delete": {
    code: "cases.delete",
    label: "Supprimer des dossiers",
    description: "Supprimer définitivement des dossiers et leurs interventions."
  },
  "cases.assign": {
    code: "cases.assign",
    label: "Assigner des dossiers",
    description: "Assigner ou réassigner des dossiers à des utilisateurs."
  },
  "case_templates.read": {
    code: "case_templates.read",
    label: "Voir les modèles de dossier",
    description: "Consulter les modèles de dossier de l'organisation."
  },
  "case_templates.create": {
    code: "case_templates.create",
    label: "Créer des modèles de dossier",
    description: "Créer de nouveaux modèles de dossier avec étapes et tâches."
  },
  "case_templates.update": {
    code: "case_templates.update",
    label: "Modifier les modèles de dossier",
    description: "Mettre à jour les modèles de dossier existants."
  },
  "case_templates.delete": {
    code: "case_templates.delete",
    label: "Supprimer des modèles de dossier",
    description: "Supprimer des modèles de dossier."
  },
  "interventions.read": {
    code: "interventions.read",
    label: "Voir les interventions",
    description: "Consulter la liste et le détail des interventions."
  },
  "interventions.create": {
    code: "interventions.create",
    label: "Créer des interventions",
    description: "Planifier de nouvelles interventions pour les dossiers."
  },
  "interventions.update": {
    code: "interventions.update",
    label: "Modifier les interventions",
    description: "Mettre à jour les interventions (statut, planification, etc.)."
  },
  "interventions.delete": {
    code: "interventions.delete",
    label: "Supprimer des interventions",
    description: "Supprimer des interventions."
  }
};

export function getPermissionLabel(permissionCode: PermissionCode): string {
  return PERMISSION_METADATA[permissionCode]?.label ?? permissionCode;
}
