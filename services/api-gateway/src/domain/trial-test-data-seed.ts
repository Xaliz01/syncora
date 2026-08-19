import type {
  CaseAssignee,
  CasePriority,
  CaseStatus,
  CreateAgenceBody,
  CreateArticleBody,
  CreateCaseBody,
  CreateCaseTemplateBody,
  CreateCustomerBody,
  CreateInterventionBody,
  CreateInterventionTypeBody,
  CreatePermissionProfileBody,
  CreateTeamBody,
  CreateTechnicianBody,
  CreateVehicleBody,
  CustomerKind,
} from "@planwise/shared";
import {
  DEFAULT_CASE_TEMPLATE_PRESETS,
  DEFAULT_INTERVENTION_TYPE_PRESETS,
  DEFAULT_PERMISSION_PROFILE_PRESETS,
} from "@planwise/shared";

/** Volumes cibles pour l’injection de démo (vs. jeu initial minimal). */
export const TRIAL_DEMO_COUNTS = {
  agences: 2,
  technicians: 6,
  teams: 2,
  vehicles: 2,
  permissionProfiles: 4,
  caseTemplates: 4,
  interventionTypes: 2,
  customers: 100,
  cases: 100,
  articles: 30,
  interventions: 40,
  /** Interventions sans créneau (colonne « Non planifiées » du planning). */
  unscheduledInterventions: 10,
  /** Dossiers assignés à l’utilisateur qui injecte (tableau de bord). */
  userAssignedCases: 24,
} as const;

export interface DemoCaseAssignee {
  userId: string;
  name: string;
}

const FIRST_NAMES = [
  "Lucas",
  "Emma",
  "Noah",
  "Léa",
  "Hugo",
  "Chloé",
  "Louis",
  "Manon",
  "Gabriel",
  "Camille",
  "Arthur",
  "Julie",
  "Raphaël",
  "Sarah",
  "Tom",
  "Inès",
];

const LAST_NAMES = [
  "Martin",
  "Bernard",
  "Petit",
  "Durand",
  "Leroy",
  "Moreau",
  "Simon",
  "Laurent",
  "Lefebvre",
  "Michel",
  "Garcia",
  "David",
  "Bertrand",
  "Roux",
  "Vincent",
  "Fournier",
];

const SPECIALITIES = [
  "Électricité",
  "Plomberie",
  "Chauffage",
  "Climatisation",
  "Couverture",
  "Menuiserie",
];

const COMPANY_PREFIXES = [
  "Bâtiments",
  "Habitat",
  "Rénovation",
  "Travaux",
  "Services",
  "Énergie",
  "Confort",
  "Pro",
];

const COMPANY_SUFFIXES = [
  "Dupont",
  "Martin",
  "Leroy",
  "Bernard",
  "Girard",
  "Roux",
  "Blanc",
  "Noir",
];

const ARTICLE_CATALOG: { name: string; unit: string; baseRef: string }[] = [
  { name: "Disjoncteur 20A", unit: "unité", baseRef: "DJ20" },
  { name: "Disjoncteur 32A", unit: "unité", baseRef: "DJ32" },
  { name: "Tube PER 16 mm", unit: "m", baseRef: "PER16" },
  { name: "Tube PER 20 mm", unit: "m", baseRef: "PER20" },
  { name: "Joint fibre 3/4", unit: "unité", baseRef: "JF34" },
  { name: "Robinet d'arrêt", unit: "unité", baseRef: "RA12" },
  { name: "Gaine ICTA 20 mm", unit: "m", baseRef: "ICTA20" },
  { name: "Câble 3G2,5", unit: "m", baseRef: "C325" },
  { name: "Wago 5 entrées", unit: "unité", baseRef: "W5" },
  { name: "Colle PVC 250 ml", unit: "unité", baseRef: "CPVC" },
];

const CASE_STATUSES: CaseStatus[] = [
  "open",
  "in_progress",
  "waiting",
  "completed",
  "draft",
  "open",
  "in_progress",
];

const CASE_PRIORITIES: CasePriority[] = ["medium", "high", "low", "urgent", "medium", "high"];

const TEAM_COLORS = ["#7C3AED", "#0EA5E9", "#059669", "#D97706"];

const DEMO_CASE_DESC_VERBS = [
  "Dépannage",
  "Installation",
  "Rénovation",
  "Maintenance",
  "Diagnostic",
  "Mise aux normes",
  "Contrôle",
  "Remplacement",
];

const DEMO_CASE_DESC_OBJECTS = [
  "chaudière",
  "tableau électrique",
  "fuite cuisine",
  "VMC",
  "radiateurs",
  "compteur",
  "réseau eau",
  "porte de garage",
  "climatisation",
  "toiture",
];

type DemoProfileSeed = {
  name: string;
  description: string;
  permissions: CreatePermissionProfileBody["permissions"];
};

/** Profils démo : sous-ensemble du catalogue produit, préfixés « Démo — ». */
const DEMO_PERMISSION_PROFILES: DemoProfileSeed[] = DEFAULT_PERMISSION_PROFILE_PRESETS.filter((p) =>
  ["technician-field", "team-lead", "stock-manager", "secretariat"].includes(p.id),
).map((p) => ({
  name: `Démo — ${p.name}`,
  description: p.description,
  permissions: [...p.permissions],
}));

/** Modèles démo : 4 métiers du catalogue, préfixés « Démo — ». */
const DEMO_CASE_TEMPLATE_IDS = [
  "plumbing-repair",
  "electrical-install",
  "heating-service",
  "hvac-sav",
] as const;

const DEMO_CASE_TEMPLATES = DEMO_CASE_TEMPLATE_IDS.map((id) => {
  const preset = DEFAULT_CASE_TEMPLATE_PRESETS.find((t) => t.id === id)!;
  return {
    name: `Démo — ${preset.name}`,
    description: preset.description,
    steps: preset.steps,
  };
});

/** Types démo = catalogue par défaut (Pose / SAV), noms et couleurs identiques. */
const DEMO_INTERVENTION_TYPES = DEFAULT_INTERVENTION_TYPE_PRESETS.map((p) => ({
  name: p.name,
  description: p.description,
  color: p.color,
}));

function padIndex(index: number, width = 3): string {
  return String(index).padStart(width, "0");
}

function pick<T>(items: readonly T[], index: number): T {
  return items[index % items.length]!;
}

/** Libellé d’affichage aligné sur le mapper clients (création démo). */
export function demoCustomerDisplayName(body: CreateCustomerBody): string {
  if (body.kind === "company") {
    return body.companyName?.trim() || "Société";
  }
  const parts = [body.firstName, body.lastName].filter((p) => p?.trim()).map((p) => p!.trim());
  return parts.length > 0 ? parts.join(" ") : "Client";
}

export type DemoCaseCustomerRef = {
  id: string;
  displayName: string;
};

export function buildDemoAgences(organizationId: string): CreateAgenceBody[] {
  return [
    {
      organizationId,
      name: "Agence démo Lyon",
      address: "12 rue de la République",
      city: "Lyon",
      postalCode: "69002",
      phone: "04 00 00 00 01",
      isTestData: true,
    },
    {
      organizationId,
      name: "Agence démo Marseille",
      address: "5 quai du Port",
      city: "Marseille",
      postalCode: "13002",
      phone: "04 00 00 00 02",
      isTestData: true,
    },
  ];
}

export function buildDemoTechnicians(organizationId: string): CreateTechnicianBody[] {
  return Array.from({ length: TRIAL_DEMO_COUNTS.technicians }, (_, i) => ({
    organizationId,
    firstName: pick(FIRST_NAMES, i),
    lastName: pick(LAST_NAMES, i + 3),
    speciality: pick(SPECIALITIES, i),
    phone: `06 00 00 ${padIndex(i, 2)}`,
    isTestData: true,
  }));
}

export function buildDemoTeams(
  organizationId: string,
  agenceIds: string[],
  technicianIds: string[],
): CreateTeamBody[] {
  const half = Math.ceil(technicianIds.length / TRIAL_DEMO_COUNTS.teams);
  return Array.from({ length: TRIAL_DEMO_COUNTS.teams }, (_, i) => ({
    organizationId,
    name: `Équipe démo ${i + 1}`,
    agenceId: pick(agenceIds, i),
    technicianIds: technicianIds.slice(i * half, (i + 1) * half),
    calendarColor: pick(TEAM_COLORS, i),
    isTestData: true,
  }));
}

export function buildDemoVehicles(organizationId: string, orgSuffix: string): CreateVehicleBody[] {
  return Array.from({ length: TRIAL_DEMO_COUNTS.vehicles }, (_, i) => ({
    organizationId,
    type: i === 0 ? "camionnette" : "utilitaire",
    registrationNumber: `DEMO-${orgSuffix}-${padIndex(i + 1, 2)}`,
    brand: i === 0 ? "Renault" : "Peugeot",
    model: i === 0 ? "Kangoo" : "Partner",
    status: "actif",
    isTestData: true,
  }));
}

export function buildDemoPermissionProfiles(organizationId: string): CreatePermissionProfileBody[] {
  return DEMO_PERMISSION_PROFILES.map((p) => ({
    organizationId,
    ...p,
    isTestData: true,
  }));
}

export function buildDemoCaseTemplates(organizationId: string): CreateCaseTemplateBody[] {
  return DEMO_CASE_TEMPLATES.map((t) => ({
    organizationId,
    ...t,
    isTestData: true,
  }));
}

export function buildDemoInterventionTypes(organizationId: string): CreateInterventionTypeBody[] {
  return DEMO_INTERVENTION_TYPES.map((t) => ({
    organizationId,
    ...t,
    isTestData: true,
  }));
}

export function buildDemoCustomers(organizationId: string): CreateCustomerBody[] {
  return Array.from({ length: TRIAL_DEMO_COUNTS.customers }, (_, i) => {
    const kind: CustomerKind = i % 3 === 0 ? "company" : "individual";
    if (kind === "company") {
      return {
        organizationId,
        kind,
        companyName: `${pick(COMPANY_PREFIXES, i)} ${pick(COMPANY_SUFFIXES, i)} ${i + 1}`,
        email: `client-demo-${padIndex(i + 1)}@example.test`,
        phone: `01 ${padIndex(10 + (i % 90), 2)} 00 00 ${padIndex(i % 100, 2)}`,
        isTestData: true,
      };
    }
    return {
      organizationId,
      kind,
      firstName: pick(FIRST_NAMES, i),
      lastName: pick(LAST_NAMES, i + 5),
      mobile: `06 ${padIndex(10 + (i % 90), 2)} 00 00 ${padIndex(i % 100, 2)}`,
      isTestData: true,
    };
  });
}

export function buildDemoArticles(organizationId: string, orgSuffix: string): CreateArticleBody[] {
  return Array.from({ length: TRIAL_DEMO_COUNTS.articles }, (_, i) => {
    const base = pick(ARTICLE_CATALOG, i);
    return {
      organizationId,
      name: `${base.name} (démo)`,
      reference: `DEMO-${orgSuffix}-${base.baseRef}-${padIndex(i + 1)}`,
      unit: base.unit,
      initialStock: 10 + (i % 40),
      reorderPoint: 5 + (i % 10),
      isTestData: true,
    };
  });
}

export interface DemoCaseSeed {
  create: CreateCaseBody;
  status: CaseStatus;
}

function buildCaseBase(
  organizationId: string,
  i: number,
  customers: DemoCaseCustomerRef[],
  templateIds: string[],
  assignees?: CaseAssignee[],
): Omit<CreateCaseBody, "organizationId"> & { organizationId: string } {
  const customer = pick(customers, i);
  const verb = pick(DEMO_CASE_DESC_VERBS, i);
  const object = pick(DEMO_CASE_DESC_OBJECTS, i + 2);
  const templateId = i % 4 === 0 && templateIds.length > 0 ? pick(templateIds, i / 4) : undefined;
  return {
    organizationId,
    customerId: customer.id,
    customerDisplayName: customer.displayName,
    description: `Dossier généré pour la démonstration Planwise (${verb} ${object}).`,
    priority: pick(CASE_PRIORITIES, i),
    ...(templateId ? { templateId } : {}),
    ...(assignees?.length ? { assignees } : {}),
    isTestData: true,
  };
}

/** Dossiers assignés à l’utilisateur courant, avec statuts variés pour le tableau de bord. */
function buildUserAssignedCaseSeed(
  organizationId: string,
  i: number,
  customers: DemoCaseCustomerRef[],
  templateIds: string[],
  assignee: DemoCaseAssignee,
): DemoCaseSeed {
  const now = Date.now();
  const assignees: CaseAssignee[] = [{ userId: assignee.userId, name: assignee.name }];
  const base = buildCaseBase(organizationId, i, customers, templateIds, assignees);
  const templateId =
    templateIds.length > 0 && i < 20 ? pick(templateIds, i % templateIds.length) : undefined;
  const create = { ...base, ...(templateId ? { templateId } : {}) };

  if (i < 8) {
    const dueDate = new Date(now + ((i % 7) + 2) * 24 * 60 * 60 * 1000);
    return {
      status: "in_progress",
      create: { ...create, dueDate: dueDate.toISOString() },
    };
  }
  if (i < 12) {
    const dueDate = new Date(now + ((i % 5) + 3) * 24 * 60 * 60 * 1000);
    return {
      status: "open",
      create: { ...create, dueDate: dueDate.toISOString() },
    };
  }
  if (i < 16) {
    const dueDate = new Date(now + ((i % 4) + 5) * 24 * 60 * 60 * 1000);
    return {
      status: "waiting",
      create: { ...create, dueDate: dueDate.toISOString() },
    };
  }
  if (i < 20) {
    const dueDate = new Date(now - ((i % 4) + 1) * 24 * 60 * 60 * 1000);
    return {
      status: "in_progress",
      create: { ...create, dueDate: dueDate.toISOString() },
    };
  }
  const dueDate = new Date(now - 2 * 24 * 60 * 60 * 1000);
  return {
    status: "completed",
    create: { ...create, dueDate: dueDate.toISOString() },
  };
}

export function buildDemoCases(
  organizationId: string,
  customers: DemoCaseCustomerRef[],
  templateIds: string[],
  currentUser?: DemoCaseAssignee,
): DemoCaseSeed[] {
  const now = Date.now();
  const userAssignedCount = currentUser
    ? Math.min(TRIAL_DEMO_COUNTS.userAssignedCases, TRIAL_DEMO_COUNTS.cases)
    : 0;

  if (customers.length === 0) {
    return [];
  }

  return Array.from({ length: TRIAL_DEMO_COUNTS.cases }, (_, i) => {
    if (currentUser && i < userAssignedCount) {
      return buildUserAssignedCaseSeed(organizationId, i, customers, templateIds, currentUser);
    }
    const customer = pick(customers, i);
    const verb = pick(DEMO_CASE_DESC_VERBS, i);
    const object = pick(DEMO_CASE_DESC_OBJECTS, i + 2);
    const dueDate = new Date(now + ((i % 14) + 1) * 24 * 60 * 60 * 1000);
    const templateId = i % 4 === 0 && templateIds.length > 0 ? pick(templateIds, i / 4) : undefined;
    return {
      status: pick(CASE_STATUSES, i),
      create: {
        organizationId,
        customerId: customer.id,
        customerDisplayName: customer.displayName,
        description: `Dossier généré pour la démonstration Planwise (${verb} ${object}).`,
        priority: pick(CASE_PRIORITIES, i),
        dueDate: dueDate.toISOString(),
        ...(templateId ? { templateId } : {}),
        isTestData: true,
      },
    };
  });
}

/** Répartit les interventions sans créneau (priorité aux dossiers de l’utilisateur). */
function buildUnscheduledInterventionIndices(
  total: number,
  userCaseCount: number,
  target: number,
): Set<number> {
  const indices = new Set<number>();
  for (let i = 1; i < userCaseCount && indices.size < target; i += 3) {
    indices.add(i);
  }
  for (let i = userCaseCount; i < total && indices.size < target; i++) {
    if ((i - userCaseCount) % 4 === 3) {
      indices.add(i);
    }
  }
  for (let i = 0; i < total && indices.size < target; i++) {
    if (!indices.has(i)) {
      indices.add(i);
    }
  }
  return indices;
}

export function buildDemoInterventions(
  organizationId: string,
  caseIds: string[],
  teamIds: string[],
  options?: {
    assigneeTechnicianId?: string;
    userCaseCount?: number;
    interventionTypeIds?: string[];
  },
): CreateInterventionBody[] {
  const base = new Date();
  const userCaseCount = options?.userCaseCount ?? 0;
  const typeIds = options?.interventionTypeIds ?? [];
  const total = Math.min(TRIAL_DEMO_COUNTS.interventions, caseIds.length);
  const unscheduledIndices = buildUnscheduledInterventionIndices(
    total,
    userCaseCount,
    Math.min(TRIAL_DEMO_COUNTS.unscheduledInterventions, total),
  );
  return Array.from({ length: total }, (_, i) => {
    const onUserCase = i < userCaseCount;
    const unscheduled = unscheduledIndices.has(i);
    const start = new Date(base);
    start.setDate(start.getDate() + (i % 15));
    start.setHours(8 + (i % 6), 0, 0, 0);
    const end = new Date(start);
    end.setHours(start.getHours() + 2 + (i % 3));
    return {
      organizationId,
      caseId: caseIds[i]!,
      title: unscheduled
        ? `Intervention démo (à planifier) #${i + 1}`
        : `Intervention démo #${i + 1}`,
      ...(typeIds.length > 0 ? { typeId: pick(typeIds, i) } : {}),
      // Assigner un technicien (pas un userId brut) pour que la selectbox flotte le retrouve.
      ...(onUserCase && options?.assigneeTechnicianId
        ? { assigneeId: options.assigneeTechnicianId }
        : teamIds.length > 0
          ? { assignedTeamId: pick(teamIds, i) }
          : {}),
      ...(unscheduled
        ? {}
        : {
            scheduledStart: start.toISOString(),
            scheduledEnd: end.toISOString(),
          }),
      isTestData: true,
    };
  });
}

export async function runInBatches<T, R>(
  items: readonly T[],
  batchSize: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const slice = items.slice(i, i + batchSize);
    const batch = await Promise.all(slice.map((item, j) => fn(item, i + j)));
    results.push(...batch);
  }
  return results;
}
