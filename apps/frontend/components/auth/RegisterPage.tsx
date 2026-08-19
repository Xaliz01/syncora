"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BASE_SUBSCRIPTION_PLAN,
  isPasswordPolicyValid,
  PASSWORD_POLICY_HINT,
  type SiretLookupResult,
} from "@planwise/shared";
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
import { LegalConsentCheckbox } from "@/components/legal/LegalConsentCheckbox";
import { ProductScreenshotsRegister } from "@/components/landing/ProductScreenshots";
import { LANDING_TAGLINE } from "@/lib/landing-copy";
import { PLANWISE_LOGO_SRC } from "@/lib/brand-assets";
import { reportGoogleAdsSignupConversion } from "@/components/analytics/GoogleAdsTag";

type RegisterStep = "account" | "verify-email" | "organization";

function stepBadgeClass(active: boolean, done: boolean): string {
  if (active) return "bg-brand-600 text-white";
  if (done) return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300";
  return "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
}

export function RegisterPage() {
  const searchParams = useSearchParams();
  const initialStep: RegisterStep =
    searchParams.get("step") === "organization" ? "organization" : "account";

  const [step, setStep] = useState<RegisterStep>(initialStep);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminName, setAdminName] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [debugVerificationCode, setDebugVerificationCode] = useState<string | undefined>();
  const [organizationName, setOrganizationName] = useState("");
  const [organizationSiret, setOrganizationSiret] = useState("");
  const [organizationEmail, setOrganizationEmail] = useState("");
  const organizationEmailSeeded = useRef(false);
  const [organizationAddress, setOrganizationAddress] =
    useState<OrganizationAddressForm>(EMPTY_ORG_ADDRESS);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [legalConsent, setLegalConsent] = useState(false);
  const {
    registerAccount,
    verifyEmail,
    resendEmailVerification,
    completeOrganization,
    isOnboarding,
    isAuthenticated,
    user,
    onboardingUser,
  } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated && user) {
      router.replace(postAuthHomePath(user));
    }
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    if (initialStep === "organization" && isOnboarding) {
      setStep("organization");
    }
  }, [initialStep, isOnboarding]);

  useEffect(() => {
    if (step !== "organization" || organizationEmailSeeded.current) return;
    const fallback = adminEmail.trim() || onboardingUser?.email?.trim() || "";
    if (!fallback) return;
    setOrganizationEmail(fallback);
    organizationEmailSeeded.current = true;
  }, [step, adminEmail, onboardingUser?.email]);

  const handleSiretSelect = (result: SiretLookupResult) => {
    if (result.nom) {
      setOrganizationName(result.nom);
    }
    setOrganizationAddress(addressFromSiretLookup(result));
  };

  const canSubmitAccount =
    adminEmail.trim().length > 0 && isPasswordPolicyValid(adminPassword) && legalConsent;

  const canSubmitVerification = verificationCode.trim().length === 6;

  const canSubmitOrganization =
    organizationSiret.trim().length > 0 &&
    organizationName.trim().length > 0 &&
    organizationEmail.trim().includes("@") &&
    isOrganizationAddressComplete(organizationAddress);

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmitAccount) return;
    setError(null);
    setLoading(true);
    try {
      const result = await registerAccount({
        email: adminEmail,
        password: adminPassword,
        name: adminName.trim() || undefined,
      });
      setAdminEmail(result.email);
      setDebugVerificationCode(result.debugVerificationCode);
      setVerificationCode(result.debugVerificationCode ?? "");
      setStep("verify-email");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création de compte impossible");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmitVerification) return;
    setError(null);
    setLoading(true);
    try {
      await verifyEmail({
        email: adminEmail,
        code: verificationCode.trim(),
      });
      setOrganizationEmail((prev) => prev.trim() || adminEmail.trim());
      organizationEmailSeeded.current = true;
      setStep("organization");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Vérification impossible");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await resendEmailVerification({ email: adminEmail });
      if (result.debugVerificationCode) {
        setDebugVerificationCode(result.debugVerificationCode);
        setVerificationCode(result.debugVerificationCode);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Renvoi du code impossible");
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
        email: organizationEmail.trim(),
        ...toCreateOrganizationAddress(organizationAddress),
      });
      await reportGoogleAdsSignupConversion({
        transactionId: user.organizationId || user.id,
      });
      // Navigation pleine page : le JWT vient d’être posé ; un soft replace peut rester
      // sur /register (effet isAuthenticated + Suspense) avant que RequireAuth prenne le relais.
      window.location.assign(postAuthHomePath(user));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création de l'organisation impossible");
      setLoading(false);
    }
  };

  const headerTitle =
    step === "account"
      ? "Créer votre compte"
      : step === "verify-email"
        ? "Vérifiez votre e-mail"
        : "Créer votre organisation";
  const headerSubtitle =
    step === "account"
      ? "Commencez par créer votre compte administrateur."
      : step === "verify-email"
        ? `Saisissez le code à 6 chiffres envoyé à ${adminEmail}.`
        : "Renseignez les informations de votre entreprise pour finaliser l'inscription.";

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2" aria-label="Planwise">
            <Image
              src={PLANWISE_LOGO_SRC}
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 shrink-0"
            />
            <div>
              <div className="font-semibold text-lg text-slate-900 dark:text-slate-100">
                Planwise
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{LANDING_TAGLINE}</div>
            </div>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="relative flex-1 flex items-start justify-center px-4 py-10 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-600/10 via-transparent to-violet-600/5 dark:from-brand-600/20 dark:to-violet-950/30"
          aria-hidden
        />
        <div className="relative w-full max-w-6xl">
          <div className="mb-6 flex flex-wrap items-center gap-2 text-xs font-medium">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full ${stepBadgeClass(step === "account", step !== "account")}`}
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
              className={`flex h-6 w-6 items-center justify-center rounded-full ${stepBadgeClass(step === "verify-email", step === "organization")}`}
            >
              2
            </span>
            <span
              className={
                step === "verify-email" ? "text-slate-900 dark:text-slate-100" : "text-slate-500"
              }
            >
              E-mail
            </span>
            <span className="text-slate-300 dark:text-slate-600">—</span>
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full ${stepBadgeClass(step === "organization", false)}`}
            >
              3
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
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 max-w-2xl">
            {headerSubtitle}
          </p>

          {step === "account" ? (
            <div className="grid gap-6 md:grid-cols-2 md:items-stretch">
              <aside className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 p-8 shadow-sm dark:shadow-slate-950/20">
                <div className="mb-4">
                  <span className="inline-flex items-center rounded-full border border-brand-200 dark:border-brand-500/40 bg-brand-50 dark:bg-brand-950/40 px-3 py-1 text-xs font-semibold text-brand-700 dark:text-brand-300">
                    {BASE_SUBSCRIPTION_PLAN.trialDays} jours d&apos;essai · sans carte bancaire
                  </span>
                </div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-3">
                  Démarrez Planwise en quelques minutes
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-5 leading-relaxed">
                  Créez votre compte administrateur, vérifiez votre e-mail, puis renseignez votre
                  entreprise (SIRET). Vous pourrez ensuite explorer avec des données de démo.
                </p>
                <ul className="space-y-2.5 text-sm text-slate-600 dark:text-slate-300">
                  {[
                    "CRM terrain pour indépendants, artisans et TPE",
                    "Planning, interventions, contrats et devis",
                    "Sans engagement · résiliable à tout moment",
                  ].map((item) => (
                    <li key={item} className="flex gap-2.5 leading-snug">
                      <span
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600"
                        aria-hidden
                      />
                      {item}
                    </li>
                  ))}
                </ul>
                <ProductScreenshotsRegister />
              </aside>
              <form
                onSubmit={handleAccountSubmit}
                className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 shadow-sm dark:shadow-slate-950/20 space-y-5 flex flex-col justify-center"
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
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
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
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
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
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    placeholder="••••••••"
                  />
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {PASSWORD_POLICY_HINT}
                  </p>
                </div>
                <LegalConsentCheckbox checked={legalConsent} onChange={setLegalConsent} />
                <button
                  type="submit"
                  disabled={loading || !canSubmitAccount}
                  className="w-full rounded-lg bg-brand-600 py-3 font-medium text-white hover:bg-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50 transition"
                >
                  {loading ? "Création…" : "Continuer"}
                </button>
              </form>
            </div>
          ) : step === "verify-email" ? (
            <div className="grid gap-6 md:grid-cols-2 md:items-stretch">
              <aside className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 p-8 shadow-sm dark:shadow-slate-950/20">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-3">
                  Vérification de votre e-mail
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
                  Un code à 6 chiffres a été envoyé à{" "}
                  <span className="font-medium text-slate-800 dark:text-slate-100">
                    {adminEmail}
                  </span>
                  . Il expire rapidement : saisissez-le pour continuer.
                </p>
                <ul className="space-y-2.5 text-sm text-slate-600 dark:text-slate-300">
                  {[
                    "Vérifiez aussi vos spams / courrier indésirable",
                    "Vous pourrez renvoyer un code si besoin",
                    "Ensuite : création de votre organisation",
                  ].map((item) => (
                    <li key={item} className="flex gap-2.5 leading-snug">
                      <span
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600"
                        aria-hidden
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </aside>
              <form
                onSubmit={handleVerifySubmit}
                className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 shadow-sm dark:shadow-slate-950/20 space-y-5 flex flex-col justify-center"
              >
                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">
                    {error}
                  </div>
                )}
                {debugVerificationCode && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm p-3">
                    Mode développement : code{" "}
                    <span className="font-mono font-semibold">{debugVerificationCode}</span>
                  </div>
                )}
                <div>
                  <label
                    htmlFor="verificationCode"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
                  >
                    Code de vérification
                  </label>
                  <input
                    id="verificationCode"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) =>
                      setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    required
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-3 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 tracking-widest text-center text-xl font-mono"
                    placeholder="000000"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !canSubmitVerification}
                  className="w-full rounded-lg bg-brand-600 py-3 font-medium text-white hover:bg-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50 transition"
                >
                  {loading ? "Vérification…" : "Vérifier mon e-mail"}
                </button>
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                  Vous n&apos;avez pas reçu le code ?{" "}
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={loading}
                    className="text-brand-600 dark:text-brand-400 underline font-medium disabled:opacity-50"
                  >
                    Renvoyer
                  </button>
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("account");
                      setVerificationCode("");
                      setDebugVerificationCode(undefined);
                      setError(null);
                    }}
                    className="underline font-medium"
                  >
                    Modifier l&apos;adresse e-mail
                  </button>
                </p>
              </form>
            </div>
          ) : (
            <form
              onSubmit={handleOrganizationSubmit}
              className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm dark:shadow-slate-950/20"
            >
              <div className="space-y-5 px-8 py-8">
                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">
                    {error}
                  </div>
                )}
                <div className="grid gap-6 md:grid-cols-2 md:items-start">
                  <div className="flex flex-col gap-4">
                    <div>
                      <SiretLookupField
                        value={organizationSiret}
                        onChange={setOrganizationSiret}
                        onSelect={handleSiretSelect}
                        disabled={loading}
                        autoFocus
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
                    <div>
                      <label
                        htmlFor="organizationEmail"
                        className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
                      >
                        E-mail de facturation
                      </label>
                      <input
                        id="organizationEmail"
                        type="email"
                        value={organizationEmail}
                        onChange={(e) => setOrganizationEmail(e.target.value)}
                        required
                        autoComplete="organization"
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        placeholder="facturation@exemple.fr"
                      />
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Obligatoire pour la facturation. Aucun prélèvement pendant l&apos;essai.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
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
                      onCountryChange={(v) =>
                        setOrganizationAddress((prev) => ({ ...prev, country: v }))
                      }
                      labelCls="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
                      inputCls="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      L&apos;adresse est préremplie lors de la sélection SIRET ; vous pouvez la
                      corriger si besoin.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 rounded-b-2xl border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/40 px-8 py-3">
                {!isOnboarding && !isAuthenticated ? (
                  <p className="mr-auto text-xs text-amber-600 dark:text-amber-400">
                    Session expirée.{" "}
                    <button
                      type="button"
                      onClick={() => setStep("account")}
                      className="underline font-medium"
                    >
                      Recommencer à l&apos;étape 1
                    </button>
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={loading || !canSubmitOrganization || !isOnboarding}
                  className="inline-flex w-full sm:w-auto justify-center rounded-lg bg-brand-600 px-6 py-2.5 font-medium text-white hover:bg-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50 transition"
                >
                  {loading ? "Création…" : "Créer l'organisation"}
                </button>
              </div>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-300">
            Déjà un compte ?{" "}
            <Link
              href="/login?open=1"
              className="text-brand-600 dark:text-brand-400 hover:text-brand-500 hover:underline font-medium"
              onClick={(e) => {
                // Navigation complète : évite une soft-nav App Router parfois
                // désynchronisée (URL ≠ UI) constatée en E2E.
                e.preventDefault();
                window.location.assign("/login?open=1");
              }}
            >
              Se connecter
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
