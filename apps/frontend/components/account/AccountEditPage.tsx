"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/AuthContext";
import { useToast } from "@/components/ui/ToastProvider";
import * as accountApi from "@/lib/account.api";
import type { SidebarPreference, ThemePreference } from "@planwise/shared";
import { useTheme } from "next-themes";
import { applyUserPreferences } from "@/lib/user-preferences";
import { PlanwiseLoader } from "@/components/ui/PlanwiseLoader";
import {
  FormDialogCancelButton,
  FormDialogPrimaryButton,
  FormDialogSection,
  FormPage,
  formFieldInputClassName,
  formFieldLabelClassName,
} from "@/components/ui/FormDialog";
import {
  SidebarRadioGroup,
  ThemeRadioGroup,
  VoiceFieldPreferenceToggle,
} from "@/components/account/AccountPreferenceFields";

const DETAIL_HREF = "/account";

export function AccountEditPage() {
  const router = useRouter();
  const { user, refreshSession } = useAuth();
  const { showToast } = useToast();
  const { setTheme } = useTheme();
  const queryClient = useQueryClient();

  const [name, setName] = useState(user?.name ?? "");
  const [themePreference, setThemePreference] = useState<ThemePreference>("light");
  const [sidebarPreference, setSidebarPreference] = useState<SidebarPreference>("expanded");
  const [voiceFieldEnabled, setVoiceFieldEnabled] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user?.name]);

  useEffect(() => {
    let cancelled = false;
    void accountApi
      .getPreferences()
      .then((res) => {
        if (cancelled) return;
        setThemePreference(res.preferences.theme);
        setSidebarPreference(res.preferences.sidebarCollapsed);
        setVoiceFieldEnabled(res.preferences.voiceFieldEnabled === true);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setPrefsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const nameChanged = name.trim() !== (user?.name ?? "");
      if (nameChanged) {
        await accountApi.updateName({ name: name.trim() });
        await refreshSession();
      }
      const res = await accountApi.updatePreferences({
        theme: themePreference,
        sidebarCollapsed: sidebarPreference,
        voiceFieldEnabled,
      });
      applyUserPreferences(res.preferences, setTheme);
      void queryClient.invalidateQueries({ queryKey: ["account-preferences"] });
      showToast("Compte mis à jour.");
      router.push(DETAIL_HREF);
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };

  const goBack = useCallback(() => router.push(DETAIL_HREF), [router]);

  if (!prefsLoaded) {
    return (
      <div className="flex justify-center py-16">
        <PlanwiseLoader size="md" label="Chargement…" />
      </div>
    );
  }

  return (
    <FormPage
      title="Modifier mon compte"
      description="Mettez à jour votre nom et vos préférences d’affichage."
      breadcrumb={{ href: DETAIL_HREF, label: "Mon compte" }}
      onSubmit={(e) => void handleSubmit(e)}
      footer={
        <>
          <FormDialogCancelButton onClick={goBack} disabled={saving} />
          <FormDialogPrimaryButton type="submit" disabled={saving || !name.trim()}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </FormDialogPrimaryButton>
        </>
      }
    >
      <FormDialogSection title="Identité">
        <div>
          <label htmlFor="account-edit-name" className={formFieldLabelClassName}>
            Nom complet
          </label>
          <input
            id="account-edit-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={formFieldInputClassName}
            autoComplete="name"
          />
        </div>
      </FormDialogSection>
      <FormDialogSection title="Préférences">
        <ThemeRadioGroup value={themePreference} onChange={setThemePreference} />
        <SidebarRadioGroup value={sidebarPreference} onChange={setSidebarPreference} />
        <VoiceFieldPreferenceToggle value={voiceFieldEnabled} onChange={setVoiceFieldEnabled} />
      </FormDialogSection>
    </FormPage>
  );
}
