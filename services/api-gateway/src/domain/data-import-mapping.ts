import {
  DATA_IMPORT_TARGET_FIELDS,
  type DataImportEntity,
  type DataImportSuggestMappingResponse,
} from "@planwise/shared";

export function normalizeImportHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

/** Alias courants (FR/EN) → champ Planwise. */
const FIELD_ALIASES: Record<string, string[]> = {
  externalId: [
    "externalid",
    "id",
    "idexterne",
    "code",
    "codecclient",
    "codeclient",
    "ref",
    "referenceexterne",
    "numero",
    "noclient",
    "idclient",
    "customerid",
    "clientid",
    "affaire",
    "nodossier",
    "caseid",
    "interventionid",
  ],
  kind: ["kind", "type", "typelient", "typeclient", "nature", "personnetype"],
  firstName: ["firstname", "prenom", "givenname"],
  lastName: ["lastname", "nom", "name", "familyname", "surname"],
  companyName: [
    "companyname",
    "raisonsociale",
    "societe",
    "entreprise",
    "company",
    "organisation",
    "organization",
  ],
  legalIdentifier: ["legalidentifier", "siret", "siren", "vat", "tva", "numerotva"],
  email: ["email", "mail", "courriel", "e-mail"],
  phone: ["phone", "tel", "telephone", "telephonefixe", "landline"],
  mobile: ["mobile", "portable", "cellphone", "gsm"],
  addressLine1: ["addressline1", "adresse", "adresse1", "address", "rue", "voie", "street"],
  addressLine2: ["addressline2", "adresse2", "complement", "batiment"],
  postalCode: ["postalcode", "codepostal", "zip", "zipcode", "cp"],
  city: ["city", "ville", "localite", "town"],
  country: ["country", "pays"],
  notes: ["notes", "note", "commentaire", "commentaires", "memo", "observation"],
  customerExternalId: [
    "customerexternalid",
    "clientexternalid",
    "idclient",
    "codeclient",
    "customerid",
    "clientid",
    "refclient",
  ],
  label: ["label", "libelle", "nom", "name", "site", "intitule"],
  isDefault: ["isdefault", "defaut", "pardefaut", "default"],
  name: ["name", "nom", "libelle", "designation", "label"],
  reference: ["reference", "ref", "sku", "codearticle", "code"],
  description: ["description", "desc", "detail", "details"],
  unit: ["unit", "unite", "uom"],
  defaultPrice: ["defaultprice", "prix", "prixht", "price", "tarif", "montantht"],
  initialStock: ["initialstock", "stock", "stockinitial", "qty", "quantite"],
  reorderPoint: ["reorderpoint", "seuil", "stockmin", "minstock"],
  targetStock: ["targetstock", "stockcible", "maxstock"],
  defaultTvaRate: ["defaulttvarate", "tva", "tauxvat", "vatrate", "taux"],
  title: ["title", "titre", "objet", "sujet", "intitule", "libelle"],
  status: ["status", "statut", "etat", "state"],
  priority: ["priority", "priorite", "urgence"],
  dueDate: ["duedate", "echeance", "deadline", "datedebut", "datefinprevue"],
  orderGiverExternalId: ["ordergiverexternalid", "donneurordre", "iddo", "codedo", "billtoid"],
  siteExternalId: ["siteexternalid", "idsite", "codesite", "siteid", "chantier"],
  tags: ["tags", "tag", "labels", "motscles"],
  caseExternalId: [
    "caseexternalid",
    "dossierexternalid",
    "iddossier",
    "codedossier",
    "caseid",
    "affaireid",
  ],
  scheduledStart: [
    "scheduledstart",
    "debut",
    "datedebut",
    "start",
    "startdate",
    "datedebutplanifie",
  ],
  scheduledEnd: ["scheduledend", "fin", "datefin", "end", "enddate", "datefinplanifie"],
  startedAt: ["startedat", "datedemarrage", "debutreel"],
  completedAt: ["completedat", "datefinreelle", "cloture", "terminele"],
  typeName: ["typename", "type", "typeintervention", "categorie"],
  typeColor: ["typecolor", "couleur", "color"],
  assigneeEmail: [
    "assigneeemail",
    "emailassigne",
    "technicien",
    "assignee",
    "assignedto",
    "useremail",
  ],
  teamName: ["teamname", "equipe", "team", "nomequipe"],
};

export function buildHeuristicMapping(
  entity: DataImportEntity,
  headers: string[],
): Record<string, string | null> {
  const targets = DATA_IMPORT_TARGET_FIELDS[entity];
  const mapping: Record<string, string | null> = {};
  const usedHeaders = new Set<string>();
  const normalizedHeaders = headers.map((h) => ({
    raw: h,
    norm: normalizeImportHeader(h),
  }));

  for (const field of targets) {
    mapping[field.key] = null;
    const aliases = new Set([
      normalizeImportHeader(field.key),
      ...(FIELD_ALIASES[field.key] ?? []),
    ]);

    // Match exact key first, then aliases
    let match = normalizedHeaders.find(
      (h) => !usedHeaders.has(h.raw) && h.norm === normalizeImportHeader(field.key),
    );
    if (!match) {
      match = normalizedHeaders.find((h) => !usedHeaders.has(h.raw) && aliases.has(h.norm));
    }
    if (match) {
      mapping[field.key] = match.raw;
      usedHeaders.add(match.raw);
    }
  }

  return mapping;
}

export function sanitizeMapping(
  entity: DataImportEntity,
  headers: string[],
  raw: Record<string, unknown> | null | undefined,
): Record<string, string | null> {
  const allowed = new Set(DATA_IMPORT_TARGET_FIELDS[entity].map((f) => f.key));
  const headerSet = new Set(headers);
  const usedSources = new Set<string>();
  const out: Record<string, string | null> = {};

  for (const key of allowed) {
    out[key] = null;
  }

  if (!raw || typeof raw !== "object") return out;

  for (const [key, value] of Object.entries(raw)) {
    if (!allowed.has(key)) continue;
    if (value === null || value === undefined || value === "") {
      out[key] = null;
      continue;
    }
    if (typeof value !== "string") continue;
    const source = value.trim();
    if (!headerSet.has(source) || usedSources.has(source)) {
      out[key] = null;
      continue;
    }
    out[key] = source;
    usedSources.add(source);
  }

  return out;
}

export function mappingConfidence(
  entity: DataImportEntity,
  mapping: Record<string, string | null>,
): "high" | "medium" | "low" {
  const targets = DATA_IMPORT_TARGET_FIELDS[entity];
  const required = targets.filter((t) => t.required);
  const requiredMapped = required.filter((t) => mapping[t.key]).length;
  const optionalTargets = targets.filter((t) => !t.required);
  const optionalMapped = optionalTargets.filter((t) => mapping[t.key]).length;

  if (requiredMapped < required.length) return "low";
  if (optionalTargets.length === 0) return "high";
  const ratio = optionalMapped / optionalTargets.length;
  if (ratio >= 0.5) return "high";
  if (ratio >= 0.2) return "medium";
  return "medium";
}

export function buildMappingSystemPrompt(entity: DataImportEntity): string {
  const fields = DATA_IMPORT_TARGET_FIELDS[entity]
    .map((f) => `- ${f.key}${f.required ? " (requis)" : ""} : ${f.label}`)
    .join("\n");
  return `Tu aides à convertir un export CRM vers le format d'import Planwise.
Entité cible : ${entity}
Champs Planwise possibles :
${fields}

Réponds UNIQUEMENT avec un JSON :
{
  "mapping": { "<champPlanwise>": "<en-tête exact du CSV source ou null>" },
  "confidence": "high" | "medium" | "low",
  "notes": "conseil court en français (optionnel)"
}
Règles :
- Utilise uniquement les en-têtes fournis (orthographe exacte).
- Un en-tête source ne peut mapper qu'un seul champ Planwise.
- Si aucun match fiable : null.
- Ne invente pas de colonnes.`;
}

export function buildMappingUserPrompt(input: {
  headers: string[];
  sampleRows: Record<string, string>[];
}): string {
  return JSON.stringify(
    {
      headers: input.headers,
      sampleRows: input.sampleRows.slice(0, 8).map((row) => {
        const clipped: Record<string, string> = {};
        for (const [k, v] of Object.entries(row)) {
          clipped[k] = String(v ?? "").slice(0, 120);
        }
        return clipped;
      }),
    },
    null,
    2,
  );
}

export function parseLlmMappingPayload(content: string): {
  mapping?: Record<string, unknown>;
  confidence?: string;
  notes?: string;
} | null {
  try {
    const parsed = JSON.parse(content) as {
      mapping?: Record<string, unknown>;
      confidence?: string;
      notes?: string;
    };
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    // tente d'extraire un bloc JSON
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    try {
      return JSON.parse(content.slice(start, end + 1)) as {
        mapping?: Record<string, unknown>;
        confidence?: string;
        notes?: string;
      };
    } catch {
      return null;
    }
  }
}

export function heuristicSuggestMapping(
  entity: DataImportEntity,
  headers: string[],
): DataImportSuggestMappingResponse {
  const mapping = buildHeuristicMapping(entity, headers);
  return {
    mapping,
    confidence: mappingConfidence(entity, mapping),
    notes:
      "Proposition automatique (sans IA). Vérifiez surtout externalId et les colonnes de liaison.",
    usedLlm: false,
  };
}

/** Complète les trous du mapping IA avec l’heuristique, sans écraser les choix existants. */
export function fillMappingGaps(
  entity: DataImportEntity,
  headers: string[],
  mapping: Record<string, string | null>,
): Record<string, string | null> {
  const heuristic = buildHeuristicMapping(entity, headers);
  const used = new Set(Object.values(mapping).filter((v): v is string => Boolean(v)));
  const out: Record<string, string | null> = { ...mapping };
  for (const [key, source] of Object.entries(heuristic)) {
    if (out[key]) continue;
    if (!source || used.has(source)) continue;
    out[key] = source;
    used.add(source);
  }
  return out;
}
