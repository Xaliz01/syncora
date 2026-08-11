import {
  isVoiceFieldAffirmUtterance,
  isVoiceFieldCancelUtterance,
  parseVoiceFieldChoiceIndex,
  parseVoiceFieldTranscript,
  parseVoiceFieldWake,
  resolveVoiceFieldTarget,
  voiceFieldTitlesMatch,
  type VoiceFieldInterventionRef,
} from "../voice-field";

describe("parseVoiceFieldWake", () => {
  it("détecte Planwise seul", () => {
    expect(parseVoiceFieldWake("Planwise")).toEqual({
      woken: true,
      rest: "",
      wakeOnly: true,
    });
  });

  it("détecte Plan seul", () => {
    expect(parseVoiceFieldWake("Plan")).toEqual({
      woken: true,
      rest: "",
      wakeOnly: true,
    });
    expect(parseVoiceFieldWake("Plan démarre")).toEqual({
      woken: true,
      rest: "démarre",
      wakeOnly: false,
    });
    expect(parseVoiceFieldWake("ok plan prochaine").woken).toBe(true);
    // Ne pas activer sur « planifier »
    expect(parseVoiceFieldWake("planifier").woken).toBe(false);
  });

  it("détecte Planwise + commande", () => {
    expect(parseVoiceFieldWake("Planwise démarre")).toEqual({
      woken: true,
      rest: "démarre",
      wakeOnly: false,
    });
  });

  it("accepte ok planwise", () => {
    const r = parseVoiceFieldWake("ok planwise prochaine");
    expect(r.woken).toBe(true);
    if (r.woken) expect(r.rest).toBe("prochaine");
  });

  it("détecte des approximations STT", () => {
    expect(parseVoiceFieldWake("plan ouise").woken).toBe(true);
    expect(parseVoiceFieldWake("plein wise").woken).toBe(true);
    expect(parseVoiceFieldWake("plainwise").woken).toBe(true);
    expect(parseVoiceFieldWake("plan Louise")).toEqual({
      woken: true,
      rest: "",
      wakeOnly: true,
    });
    const r = parseVoiceFieldWake("planoise démarre");
    expect(r.woken).toBe(true);
    if (r.woken) {
      expect(r.wakeOnly).toBe(false);
      expect(r.rest).toMatch(/d[eé]marre/);
    }
  });
});

describe("parseVoiceFieldTranscript", () => {
  it("détecte démarrer", () => {
    expect(parseVoiceFieldTranscript("démarre").kind).toBe("start");
    expect(parseVoiceFieldTranscript("Démarre l'intervention").kind).toBe("start");
    expect(parseVoiceFieldTranscript("je commence").kind).toBe("start");
    expect(parseVoiceFieldTranscript("Planwise démarre").kind).toBe("start");
  });

  it("détecte terminer", () => {
    expect(parseVoiceFieldTranscript("termine").kind).toBe("complete");
    expect(parseVoiceFieldTranscript("termine l'intervention").kind).toBe("complete");
    expect(parseVoiceFieldTranscript("c'est fini").kind).toBe("complete");
  });

  it("détecte commentaire avec texte", () => {
    const r = parseVoiceFieldTranscript("note que le client est absent");
    expect(r.kind).toBe("comment");
    expect(r.commentText).toBe("le client est absent");

    const r2 = parseVoiceFieldTranscript("ajoute un commentaire porte fermée");
    expect(r2.kind).toBe("comment");
    expect(r2.commentText).toBe("porte fermée");

    const r3 = parseVoiceFieldTranscript("Ajouter un commentaire client absent");
    expect(r3.kind).toBe("comment");
    expect(r3.commentText).toBe("client absent");
  });

  it("détecte une cible ordinale ou par nom", () => {
    const complete = parseVoiceFieldTranscript("termine la première intervention");
    expect(complete.kind).toBe("complete");
    expect(complete.targetHint?.ordinalIndex).toBe(0);

    const start = parseVoiceFieldTranscript("démarre la deuxième");
    expect(start.kind).toBe("start");
    expect(start.targetHint?.ordinalIndex).toBe(1);

    const byName = parseVoiceFieldTranscript("termine Intervention démo #34");
    expect(byName.kind).toBe("complete");
    expect(byName.targetHint?.titleQuery).toMatch(/intervention demo 34|demo 34/i);

    const open = parseVoiceFieldTranscript("ouvre le dossier de la troisième");
    expect(open.kind).toBe("open_case");
    expect(open.targetHint?.ordinalIndex).toBe(2);

    const comment = parseVoiceFieldTranscript(
      "ajoute un commentaire à la première intervention porte fermée",
    );
    expect(comment.kind).toBe("comment");
    expect(comment.targetHint?.ordinalIndex).toBe(0);
    expect(comment.commentText).toBe("porte fermee");

    const note = parseVoiceFieldTranscript(
      "note que le client est absent sur la deuxième intervention",
    );
    expect(note.kind).toBe("comment");
    expect(note.targetHint?.ordinalIndex).toBe(1);
    expect(note.commentText).toBe("le client est absent");
  });

  it("ne force pas de cible pour « termine l'intervention » seul", () => {
    const r = parseVoiceFieldTranscript("termine l'intervention");
    expect(r.kind).toBe("complete");
    expect(r.targetHint).toBeUndefined();
  });

  it("détecte commentaire sans texte (suite vocale attendue)", () => {
    const r = parseVoiceFieldTranscript("Ajoute un commentaire");
    expect(r.kind).toBe("comment");
    expect(r.commentText).toBeUndefined();

    const r2 = parseVoiceFieldTranscript("Ajouter un commentaire");
    expect(r2.kind).toBe("comment");
    expect(r2.commentText).toBeUndefined();
  });

  it("détecte prochaine", () => {
    expect(parseVoiceFieldTranscript("prochaine").kind).toBe("next");
    expect(parseVoiceFieldTranscript("quelle est la prochaine").kind).toBe("next");
  });

  it("détecte ouvrir le dossier", () => {
    expect(parseVoiceFieldTranscript("ouvre le dossier").kind).toBe("open_case");
    expect(parseVoiceFieldTranscript("ouvrir le dossier").kind).toBe("open_case");
  });

  it("renvoie unknown si ambigu", () => {
    expect(parseVoiceFieldTranscript("bonjour").kind).toBe("unknown");
    expect(parseVoiceFieldTranscript("").kind).toBe("unknown");
  });
});

describe("isVoiceFieldCancelUtterance", () => {
  it("détecte annuler / retour", () => {
    expect(isVoiceFieldCancelUtterance("annuler")).toBe(true);
    expect(isVoiceFieldCancelUtterance("retour")).toBe(true);
    expect(isVoiceFieldCancelUtterance("Planwise annuler")).toBe(true);
    expect(isVoiceFieldCancelUtterance("démarre")).toBe(false);
  });
});

describe("isVoiceFieldAffirmUtterance", () => {
  it("détecte oui / confirmer / terminer", () => {
    expect(isVoiceFieldAffirmUtterance("oui")).toBe(true);
    expect(isVoiceFieldAffirmUtterance("confirmer")).toBe(true);
    expect(isVoiceFieldAffirmUtterance("terminer")).toBe(true);
    expect(isVoiceFieldAffirmUtterance("Planwise oui")).toBe(true);
    expect(isVoiceFieldAffirmUtterance("ok")).toBe(true);
    expect(isVoiceFieldAffirmUtterance("non")).toBe(false);
    expect(isVoiceFieldAffirmUtterance("démarre")).toBe(false);
  });
});

describe("parseVoiceFieldChoiceIndex", () => {
  it("reconnaît les ordinaux jusqu’à 5+", () => {
    expect(parseVoiceFieldChoiceIndex("la première", 5)).toBe(0);
    expect(parseVoiceFieldChoiceIndex("la deuxième", 5)).toBe(1);
    expect(parseVoiceFieldChoiceIndex("la troisième", 5)).toBe(2);
    expect(parseVoiceFieldChoiceIndex("la quatrième", 5)).toBe(3);
    expect(parseVoiceFieldChoiceIndex("la cinquième", 5)).toBe(4);
    expect(parseVoiceFieldChoiceIndex("troisieme", 4)).toBe(2);
    expect(parseVoiceFieldChoiceIndex("numéro 3", 5)).toBe(2);
    expect(parseVoiceFieldChoiceIndex("3", 5)).toBe(2);
    expect(parseVoiceFieldChoiceIndex("la 3e", 5)).toBe(2);
  });

  it("ignore un index hors liste", () => {
    expect(parseVoiceFieldChoiceIndex("la quatrième", 3)).toBeNull();
    expect(parseVoiceFieldChoiceIndex("bonjour", 3)).toBeNull();
  });
});

describe("resolveVoiceFieldTarget", () => {
  const list: VoiceFieldInterventionRef[] = [
    {
      id: "a",
      caseId: "c1",
      title: "Pose A",
      status: "planned",
      scheduledStart: "2026-08-11T10:00:00.000Z",
    },
    {
      id: "b",
      caseId: "c2",
      title: "SAV B",
      status: "planned",
      scheduledStart: "2026-08-11T08:00:00.000Z",
    },
    {
      id: "c",
      caseId: "c3",
      title: "En cours",
      status: "in_progress",
    },
  ];

  it("utilise le focus si compatible", () => {
    const r = resolveVoiceFieldTarget(list, {
      focusedId: "a",
      preferStatus: "planned",
    });
    expect(r.ok && r.intervention.id).toBe("a");
  });

  it("pour next/planned prend la plus tôt si onAmbiguous earliest", () => {
    const r = resolveVoiceFieldTarget(list, {
      preferStatus: "planned",
      onAmbiguous: "earliest",
    });
    expect(r.ok && r.intervention.id).toBe("b");
  });

  it("signale ambiguïté pour start avec plusieurs planned", () => {
    const r = resolveVoiceFieldTarget(list, { preferStatus: "planned" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe("ambiguous");
      expect(r.candidates.length).toBeGreaterThan(1);
    }
  });

  it("signale ambiguïté pour todo avec plusieurs planned + in_progress", () => {
    const r = resolveVoiceFieldTarget(list, { preferStatus: "todo" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("ambiguous");
  });

  it("cible l’unique in_progress pour complete", () => {
    const r = resolveVoiceFieldTarget(list, { preferStatus: "in_progress" });
    expect(r.ok && r.intervention.id).toBe("c");
  });

  it("honore un ordinal inline pour complete", () => {
    const multi: VoiceFieldInterventionRef[] = [
      ...list,
      {
        id: "d",
        caseId: "c4",
        title: "Autre en cours",
        status: "in_progress",
      },
    ];
    const r = resolveVoiceFieldTarget(multi, {
      preferStatus: "in_progress",
      targetHint: { ordinalIndex: 1 },
    });
    expect(r.ok && r.intervention.id).toBe("d");
  });

  it("honore un titre inline pour complete", () => {
    const r = resolveVoiceFieldTarget(list, {
      preferStatus: "in_progress",
      targetHint: { titleQuery: "en cours" },
    });
    expect(r.ok && r.intervention.id).toBe("c");
  });

  it("ignore # et espaces pour matcher un titre (démo #33 ≈ demo 33)", () => {
    const withHash: VoiceFieldInterventionRef[] = [
      {
        id: "demo",
        caseId: "c",
        title: "Intervention démo #33",
        status: "in_progress",
      },
    ];
    expect(voiceFieldTitlesMatch("Intervention démo #33", "Intervention démo 33")).toBe(true);
    expect(voiceFieldTitlesMatch("Intervention démo #33", "demo 33")).toBe(true);
    const r = resolveVoiceFieldTarget(withHash, {
      preferStatus: "in_progress",
      targetHint: { titleQuery: "Intervention démo 33" },
    });
    expect(r.ok && r.intervention.id).toBe("demo");
  });

  it("signale ambiguïté pour complete avec plusieurs in_progress", () => {
    const multi: VoiceFieldInterventionRef[] = [
      ...list,
      {
        id: "d",
        caseId: "c4",
        title: "Autre en cours",
        status: "in_progress",
      },
    ];
    const r = resolveVoiceFieldTarget(multi, {
      preferStatus: "in_progress",
      lastStartedId: "c",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe("ambiguous");
      expect(r.candidates.map((c) => c.id).sort()).toEqual(["c", "d"]);
    }
  });

  it("n’utilise pas le focus pour complete si plusieurs in_progress", () => {
    const multi: VoiceFieldInterventionRef[] = [
      ...list,
      {
        id: "d",
        caseId: "c4",
        title: "Autre en cours",
        status: "in_progress",
      },
    ];
    const r = resolveVoiceFieldTarget(multi, {
      preferStatus: "in_progress",
      focusedId: "c",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe("ambiguous");
      expect(r.candidates.map((c) => c.id).sort()).toEqual(["c", "d"]);
    }
  });

  it("none si aucune cible", () => {
    const r = resolveVoiceFieldTarget(
      [{ id: "x", caseId: "c", title: "Done", status: "completed" }],
      { preferStatus: "planned" },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("none");
  });
});
