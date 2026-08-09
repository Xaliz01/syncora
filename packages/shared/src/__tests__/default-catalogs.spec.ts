import {
  DEFAULT_CASE_TEMPLATE_PRESETS,
  DEFAULT_INTERVENTION_TYPE_PRESETS,
  DEFAULT_PERMISSION_PROFILE_PRESETS,
} from "../index";

describe("catalogues d’import par défaut", () => {
  it("propose plusieurs profils couvrant terrain, bureau, stock et revenus", () => {
    expect(DEFAULT_PERMISSION_PROFILE_PRESETS.length).toBeGreaterThanOrEqual(6);
    const categories = new Set(DEFAULT_PERMISSION_PROFILE_PRESETS.map((p) => p.category));
    expect(categories.has("Terrain")).toBe(true);
    expect(categories.has("Bureau")).toBe(true);
    expect(categories.has("Stock")).toBe(true);
    for (const preset of DEFAULT_PERMISSION_PROFILE_PRESETS) {
      expect(preset.permissions.length).toBeGreaterThan(0);
      expect(preset.id).toBeTruthy();
      expect(preset.name).toBeTruthy();
    }
  });

  it("propose des modèles de dossier multi-métiers avec étapes et tâches", () => {
    expect(DEFAULT_CASE_TEMPLATE_PRESETS.length).toBeGreaterThanOrEqual(8);
    const categories = new Set(DEFAULT_CASE_TEMPLATE_PRESETS.map((t) => t.category));
    expect(categories.has("Plomberie")).toBe(true);
    expect(categories.has("Électricité")).toBe(true);
    expect(categories.has("Maintenance")).toBe(true);
    for (const preset of DEFAULT_CASE_TEMPLATE_PRESETS) {
      expect(preset.steps.length).toBeGreaterThanOrEqual(2);
      const todos = preset.steps.reduce((n, s) => n + s.todos.length, 0);
      expect(todos).toBeGreaterThanOrEqual(3);
      preset.steps.forEach((s, i) => expect(s.order).toBe(i));
    }
  });

  it("propose Pose et SAV comme types d’intervention importables", () => {
    expect(DEFAULT_INTERVENTION_TYPE_PRESETS).toHaveLength(2);
    const ids = DEFAULT_INTERVENTION_TYPE_PRESETS.map((t) => t.id);
    expect(ids).toEqual(expect.arrayContaining(["pose", "sav"]));
    for (const preset of DEFAULT_INTERVENTION_TYPE_PRESETS) {
      expect(preset.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(preset.category).toBe("Terrain");
    }
  });
});
