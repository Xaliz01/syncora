import type { TemplateStep, TodoDashboardRule } from "./case";

const DASHBOARD_ALL: TodoDashboardRule = {
  showOnDashboard: true,
  visibility: "all",
};

/** Preset de modèle de dossier proposé à l’import. */
export interface DefaultCaseTemplatePreset {
  id: string;
  name: string;
  description: string;
  /** Métier / famille (Plomberie, Électricité…). */
  category: string;
  steps: TemplateStep[];
}

function steps(defs: Omit<TemplateStep, "order">[]): TemplateStep[] {
  return defs.map((s, i) => ({ ...s, order: i }));
}

/**
 * Catalogue de modèles de dossier couvrant les usages terrain courants
 * (dépannage, installation, entretien, SAV, maintenance contractuelle).
 */
export const DEFAULT_CASE_TEMPLATE_PRESETS: readonly DefaultCaseTemplatePreset[] = [
  {
    id: "plumbing-repair",
    name: "Dépannage plomberie",
    description: "Fuite, bouchon, robinetterie — de la prise de contact à la clôture.",
    category: "Plomberie",
    steps: steps([
      {
        name: "Prise en charge",
        description: "Qualifier la demande et planifier.",
        todos: [
          {
            label: "Contacter le client / confirmer l’accès",
            dashboardRule: DASHBOARD_ALL,
          },
          { label: "Noter la nature de la panne (fuite, bouchon, etc.)" },
          { label: "Planifier le créneau d’intervention" },
        ],
      },
      {
        name: "Intervention",
        todos: [
          {
            label: "Diagnostiquer et réparer",
            dashboardRule: DASHBOARD_ALL,
          },
          { label: "Photos avant / après" },
          { label: "Noter les pièces consommées" },
        ],
      },
      {
        name: "Clôture",
        todos: [
          {
            label: "Faire signer le client / générer le rapport",
            dashboardRule: DASHBOARD_ALL,
          },
          { label: "Mettre à jour le statut de facturation" },
        ],
      },
    ]),
  },
  {
    id: "electrical-install",
    name: "Installation / mise aux normes électrique",
    description: "Tableau, extensions, mise en sécurité — suivi des étapes chantier.",
    category: "Électricité",
    steps: steps([
      {
        name: "Prise en charge",
        todos: [
          { label: "Recueillir les besoins et plans / photos", dashboardRule: DASHBOARD_ALL },
          { label: "Vérifier la conformité attendue (NFC 15-100)" },
          { label: "Planifier les passages (plusieurs créneaux si besoin)" },
        ],
      },
      {
        name: "Travaux",
        todos: [
          { label: "Réaliser l’installation / la mise aux normes", dashboardRule: DASHBOARD_ALL },
          { label: "Contrôles et essais" },
          { label: "Photos et schéma mis à jour" },
        ],
      },
      {
        name: "Clôture",
        todos: [
          { label: "Remise des documents / attestation", dashboardRule: DASHBOARD_ALL },
          { label: "Facturation / export compta" },
        ],
      },
    ]),
  },
  {
    id: "heating-service",
    name: "Entretien chauffage / chaudière",
    description: "Visite d’entretien annuel (gaz, fioul, pompe à chaleur).",
    category: "Chauffage",
    steps: steps([
      {
        name: "Préparation",
        todos: [
          { label: "Vérifier le contrat / l’historique client", dashboardRule: DASHBOARD_ALL },
          { label: "Confirmer le RDV et l’accès au local technique" },
        ],
      },
      {
        name: "Entretien",
        todos: [
          { label: "Contrôle, nettoyage et réglages", dashboardRule: DASHBOARD_ALL },
          { label: "Relevés (pression, combustion, etc.)" },
          { label: "Conseils client et anomalies éventuelles" },
        ],
      },
      {
        name: "Clôture",
        todos: [
          { label: "Attestation d’entretien / rapport", dashboardRule: DASHBOARD_ALL },
          { label: "Planifier la prochaine visite si contrat" },
        ],
      },
    ]),
  },
  {
    id: "hvac-sav",
    name: "SAV climatisation",
    description: "Diagnostic, recharge, panne split / gainable.",
    category: "Climatisation",
    steps: steps([
      {
        name: "Prise en charge",
        todos: [
          { label: "Qualifier les symptômes (froid, bruit, fuite)", dashboardRule: DASHBOARD_ALL },
          { label: "Vérifier la marque / le fluide" },
          { label: "Planifier l’intervention" },
        ],
      },
      {
        name: "Diagnostic & réparation",
        todos: [
          { label: "Diagnostiquer et intervenir", dashboardRule: DASHBOARD_ALL },
          { label: "Relevé fluide / étanchéité si applicable" },
          { label: "Photos et pièces utilisées" },
        ],
      },
      {
        name: "Clôture",
        todos: [
          { label: "Essais client et signature", dashboardRule: DASHBOARD_ALL },
          { label: "Facturation" },
        ],
      },
    ]),
  },
  {
    id: "locksmith",
    name: "Serrurerie / ouverture",
    description: "Ouverture de porte, changement de cylindre, sécurisation.",
    category: "Serrurerie",
    steps: steps([
      {
        name: "Urgence / prise de contact",
        todos: [
          { label: "Confirmer l’adresse et le type de porte", dashboardRule: DASHBOARD_ALL },
          { label: "Estimer le délai d’arrivée" },
        ],
      },
      {
        name: "Intervention",
        todos: [
          { label: "Ouvrir / remplacer / sécuriser", dashboardRule: DASHBOARD_ALL },
          { label: "Remettre les clés / expliquer le fonctionnement" },
          { label: "Photos si sinistre / assurance" },
        ],
      },
      {
        name: "Clôture",
        todos: [
          { label: "Signature et règlement / devis complémentaire", dashboardRule: DASHBOARD_ALL },
        ],
      },
    ]),
  },
  {
    id: "roofing",
    name: "Couverture / toiture",
    description: "Fuite, tuiles, zinc — diagnostic et réparation.",
    category: "Couverture",
    steps: steps([
      {
        name: "Prise en charge",
        todos: [
          { label: "Localiser la zone (photos client si possible)", dashboardRule: DASHBOARD_ALL },
          { label: "Vérifier l’accès / sécurité chantier" },
          { label: "Planifier le créneau météo" },
        ],
      },
      {
        name: "Intervention",
        todos: [
          { label: "Diagnostiquer et réparer", dashboardRule: DASHBOARD_ALL },
          { label: "Sécuriser la zone (bâche temporaire si besoin)" },
          { label: "Photos avant / après" },
        ],
      },
      {
        name: "Clôture",
        todos: [
          { label: "Compte-rendu et facturation", dashboardRule: DASHBOARD_ALL },
          { label: "Prévoir un suivi si travaux complémentaires" },
        ],
      },
    ]),
  },
  {
    id: "carpentry",
    name: "Menuiserie / pose",
    description: "Fenêtres, portes, stores — prise de cotes, pose, réglages.",
    category: "Menuiserie",
    steps: steps([
      {
        name: "Prise de cotes / devis",
        todos: [
          { label: "Relevé de cotes et contraintes", dashboardRule: DASHBOARD_ALL },
          { label: "Valider le devis avec le client" },
          { label: "Commander le matériel" },
        ],
      },
      {
        name: "Pose",
        todos: [
          { label: "Dépose ancienne menuiserie si besoin" },
          { label: "Pose et réglages", dashboardRule: DASHBOARD_ALL },
          { label: "Finitions et nettoyage" },
        ],
      },
      {
        name: "Clôture",
        todos: [
          { label: "Réception client / signature", dashboardRule: DASHBOARD_ALL },
          { label: "Facturation du solde" },
        ],
      },
    ]),
  },
  {
    id: "maintenance-contract-visit",
    name: "Visite contrat de maintenance",
    description: "Passage récurrent issu d’un contrat (contrôle, entretien, rapport).",
    category: "Maintenance",
    steps: steps([
      {
        name: "Préparation",
        todos: [
          { label: "Vérifier le contrat et le site", dashboardRule: DASHBOARD_ALL },
          { label: "Préparer la checklist d’entretien" },
          { label: "Confirmer le créneau au client" },
        ],
      },
      {
        name: "Visite",
        todos: [
          { label: "Réaliser les contrôles prévus", dashboardRule: DASHBOARD_ALL },
          { label: "Noter les anomalies / devis complémentaires" },
          { label: "Photos si nécessaire" },
        ],
      },
      {
        name: "Clôture",
        todos: [
          { label: "Rapport de visite / signature", dashboardRule: DASHBOARD_ALL },
          { label: "Mettre à jour le contrat (prochaine échéance)" },
        ],
      },
    ]),
  },
  {
    id: "onsite-quote",
    name: "Diagnostic / devis sur site",
    description: "Visite commerciale ou technique avant travaux — sans exécution.",
    category: "Commercial",
    steps: steps([
      {
        name: "Préparation",
        todos: [
          { label: "Qualifier le besoin client", dashboardRule: DASHBOARD_ALL },
          { label: "Planifier la visite" },
        ],
      },
      {
        name: "Sur site",
        todos: [
          { label: "Diagnostiquer / prendre les cotes", dashboardRule: DASHBOARD_ALL },
          { label: "Photos et notes techniques" },
        ],
      },
      {
        name: "Suite",
        todos: [
          { label: "Rédiger et envoyer le devis", dashboardRule: DASHBOARD_ALL },
          { label: "Relancer si besoin" },
        ],
      },
    ]),
  },
  {
    id: "general-repair",
    name: "Intervention multi-métiers",
    description: "Modèle générique pour petits travaux et dépannages divers.",
    category: "Général",
    steps: steps([
      {
        name: "Prise en charge",
        todos: [
          { label: "Comprendre la demande", dashboardRule: DASHBOARD_ALL },
          { label: "Planifier l’intervention" },
        ],
      },
      {
        name: "Réalisation",
        todos: [
          { label: "Exécuter les travaux", dashboardRule: DASHBOARD_ALL },
          { label: "Photos et consommables" },
        ],
      },
      {
        name: "Clôture",
        todos: [
          { label: "Validation client", dashboardRule: DASHBOARD_ALL },
          { label: "Facturation" },
        ],
      },
    ]),
  },
];

export function getDefaultCaseTemplatePreset(id: string): DefaultCaseTemplatePreset | undefined {
  return DEFAULT_CASE_TEMPLATE_PRESETS.find((p) => p.id === id);
}
