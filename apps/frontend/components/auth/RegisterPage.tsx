"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { SiretLookupResult } from "@syncora/shared";
import { useAuth } from "@/components/auth/AuthContext";
import { postAuthHomePath } from "@/lib/subscription-access";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { SiretLookupField } from "@/components/organization/SiretLookupField";
import { PostalAddressFields } from "@/components/address/PostalAddressFields";
import {
  EMPTY_ORG_ADDRESS,
  addressFromSiretLookup,
  isOrganizationAddressComplete,
  toCreateOrganizationAddress,
  type OrganizationAddressForm,
} from "@/lib/organization-address";

type RegisterStep = "account" | "organization";

export function RegisterPage() {
  const searchParams = useSearchParams();
  const initialStep: RegisterStep =
    searchParams.get("step") === "organization" ? "organization" : "account";

  const [step, setStep] = useState<RegisterStep>(initialStep);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminName, setAdminName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [organizationSiret, setOrganizationSiret] = useState("");
  const [organizationAddress, setOrganizationAddress] =
    useState<OrganizationAddressForm>(EMPTY_ORG_ADDRESS);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { registerAccount, completeOrganization, isOnboarding, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (initialStep === "organization" && isOnboarding) {
      setStep("organization");
    }
  }, [initialStep, isOnboarding]);

  const handleSiretSelect = (result: SiretLookupResult) => {
    if (result.nom && !organizationName.trim()) {
      setOrganizationName(result.nom);
    }
    setOrganizationAddress(addressFromSiretLookup(result));
  };

  const canSubmitAccount = adminEmail.trim().length > 0 && adminPassword.length >= 8;

  const canSubmitOrganization =
    organizationSiret.trim().length > 0 &&
    organizationName.trim().length > 0 &&
    isOrganizationAddressComplete(organizationAddress);

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmitAccount) return;
    setError(null);
    setLoading(true);
    try {
      await registerAccount({
        email: adminEmail,
        password: adminPassword,
        name: adminName.trim() || undefined,
      });
      setStep("organization");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création de compte impossible");
    } finally {
      setLoading(false);
    }
  };

  const handleOrganizationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmitOrganization) return;
    setError(null);
    setLoading(true);
    try {
      const user = await completeOrganization({
        name: organizationName.trim(),
        siret: organizationSiret.trim(),
        ...toCreateOrganizationAddress(organizationAddress),
      });
      router.replace(postAuthHomePath(user));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création de l'organisation impossible");
    } finally {
      setLoading(false);
    }
  };

  const headerTitle = step === "account" ? "Créer votre compte" : "Créer votre organisation";
  const headerSubtitle =
    step === "account"
      ? "Commencez par créer votre compte administrateur."
      : "Renseignez les informations de votre entreprise pour finaliser l'inscription.";

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white font-semibold">
              S
            </span>
            <div>
              <div className="font-semibold text-lg text-slate-900 dark:text-slate-100">
                Syncora
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                CRM des opérations terrain
              </div>
            </div>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center gap-2 text-xs font-medium">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full ${
                step === "account"
                  ? "bg-brand-600 text-white"
                  : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
              }`}
            >
              1
            </span>
            <span
              className={
                step === "account" ? "text-slate-900 dark:text-slate-100" : "text-slate-500"
              }
            >
              Compte
            </span>
            <span className="text-slate-300 dark:text-slate-600">—</span>
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full ${
                step === "organization"
                  ? "bg-brand-600 text-white"
                  : "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
              }`}
            >
              2
            </span>
            <span
              className={
                step === "organization" ? "text-slate-900 dark:text-slate-100" : "text-slate-500"
              }
            >
              Organisation
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
            {headerTitle}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 max-w-xl">
            {headerSubtitle}
          </p>

          {step === "account" ? (
            <form
              onSubmit={handleAccountSubmit}
              className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm dark:shadow-slate-950/20 space-y-4"
            >
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">
                  {error}
                </div>
              )}
              <div>
                <label
                  htmlFor="adminName"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
                >
                  Votre nom (optionnel)
                </label>
                <input
                  id="adminName"
                  type="text"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  placeholder="Jean Dupont"
                />
              </div>
              <div>
                <label
                  htmlFor="adminEmail"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
                >
                  Email administrateur
                </label>
                <input
                  id="adminEmail"
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  placeholder="admin@exemple.fr"
                />
              </div>
              <div>
                <label
                  htmlFor="adminPassword"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
                >
                  Mot de passe
                </label>
                <input
                  id="adminPassword"
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  minLength={8}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  placeholder="••••••••"
                />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Minimum 8 caractères
                </p>
              </div>
              <button
                type="submit"
                disabled={loading || !canSubmitAccount}
                className="w-full rounded-lg bg-brand-600 py-2.5 font-medium text-white hover:bg-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50 transition"
              >
                {loading ? "Création…" : "Continuer"}
              </button>
            </form>
          ) : (
            <form
              onSubmit={handleOrganizationSubmit}
              className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm dark:shadow-slate-950/20 space-y-4"
            >
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">
                  {error}
                </div>
              )}
              <div>
                <SiretLookupField
                  value={organizationSiret}
                  onChange={setOrganizationSiret}
                  onSelect={handleSiretSelect}
                  disabled={loading}
                  labelCls="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
                  inputCls="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Saisissez un SIRET, SIREN ou nom pour rechercher votre entreprise.
                </p>
              </div>
              <div>
                <label
                  htmlFor="organizationName"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
                >
                  Nom de l&apos;organisation
                </label>
                <input
                  id="organizationName"
                  type="text"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  placeholder="Mon entreprise"
                />
              </div>
              <PostalAddressFields
                legend="Adresse postale"
                line1={organizationAddress.addressLine1}
                line2={organizationAddress.addressLine2}
                postalCode={organizationAddress.postalCode}
                city={organizationAddress.city}
                country={organizationAddress.country}
                onLine1Change={(v) =>
                  setOrganizationAddress((prev) => ({ ...prev, addressLine1: v }))
                }
                onLine2Change={(v) =>
                  setOrganizationAddress((prev) => ({ ...prev, addressLine2: v }))
                }
                onPostalChange={(v) =>
                  setOrganizationAddress((prev) => ({ ...prev, postalCode: v }))
                }
                onCityChange={(v) => setOrganizationAddress((prev) => ({ ...prev, city: v }))}
                onCountryChange={(v) => setOrganizationAddress((prev) => ({ ...prev, country: v }))}
                labelCls="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
                inputCls="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 -mt-2">
                L&apos;adresse est préremplie lors de la sélection SIRET ; vous pouvez la corriger
                si besoin.
              </p>
              <button
                type="submit"
                disabled={loading || !canSubmitOrganization || !isOnboarding}
                className="w-full rounded-lg bg-brand-600 py-2.5 font-medium text-white hover:bg-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50 transition"
              >
                {loading ? "Création…" : "Créer l'organisation"}
              </button>
              {!isOnboarding && (
                <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
                  Session expirée.{" "}
                  <button
                    type="button"
                    onClick={() => setStep("account")}
                    className="underline font-medium"
                  >
                    Recommencer à l&apos;étape 1
                  </button>
                </p>
              )}
            </form>
          )}

          <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-300">
            Déjà un compte ?{" "}
            <Link
              href="/login"
              className="text-brand-600 dark:text-brand-400 hover:text-brand-500 hover:underline font-medium"
            >
              Se connecter
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
