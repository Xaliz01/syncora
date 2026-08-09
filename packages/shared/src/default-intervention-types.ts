/** Preset de type d’intervention proposé à l’import. */
export interface DefaultInterventionTypePreset {
  id: string;
  name: string;
  description: string;
  /** Regroupement UI (ex. Terrain). */
  category: string;
  /** Couleur hex `#RRGGBB`. */
  color: string;
}

/**
 * Catalogue de types d’intervention prêts à l’emploi (Pose / SAV).
 */
export const DEFAULT_INTERVENTION_TYPE_PRESETS: readonly DefaultInterventionTypePreset[] = [
  {
    id: "pose",
    name: "Pose",
    description: "Installation ou pose initiale chez le client.",
    category: "Terrain",
    color: "#2563eb",
  },
  {
    id: "sav",
    name: "SAV",
    description: "Service après-vente, dépannage ou reprise.",
    category: "Terrain",
    color: "#ea580c",
  },
] as const;

export function getDefaultInterventionTypePreset(
  id: string,
): DefaultInterventionTypePreset | undefined {
  return DEFAULT_INTERVENTION_TYPE_PRESETS.find((p) => p.id === id);
}
