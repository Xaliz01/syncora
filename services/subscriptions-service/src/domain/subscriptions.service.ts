import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import Stripe from "stripe";
import type {
  AddonCode,
  CreateBillingPortalResponse,
  CreateCheckoutSessionResponse,
  OrganizationSubscriptionResponse,
  OrganizationSubscriptionStatus,
  UpdateSubscriptionAddonsResponse,
} from "@syncora/shared";
import {
  ADDON_CATALOG,
  ADDON_CODES,
  addonAllowsStandaloneCheckout,
  BASE_SUBSCRIPTION_PLAN,
  BASE_SUBSCRIPTION_PLAN_LABEL,
  isValidAddonCode,
} from "@syncora/shared";
import type { OrganizationSubscriptionDocument } from "../persistence/organization-subscription.schema";
import type { ProcessedStripeEventDocument } from "../persistence/processed-stripe-event.schema";

const DEFAULT_TRIAL_DAYS = 15;
const PLAN_LABEL = BASE_SUBSCRIPTION_PLAN_LABEL;

/**
 * Résout le Stripe Price ID d'un addon depuis le catalogue partagé + env vars.
 * Convention : chaque addon définit son `stripePriceEnvVar` dans ADDON_CATALOG.
 */
function resolveAddonPriceId(code: AddonCode): string {
  const descriptor = ADDON_CATALOG[code];
  return process.env[descriptor.stripePriceEnvVar] ?? descriptor.stripePriceDefault;
}

function resolveBasePriceId(): string {
  const priceId = process.env.STRIPE_PRICE_ID ?? "price_1TJBxC159m6jcNWDEmpIfyrE";
  if (!priceId?.trim()) {
    throw new BadRequestException(
      "STRIPE_PRICE_ID is missing: create a recurring EUR price (9,99 €/month) in Stripe and set its ID.",
    );
  }
  return priceId;
}

function hasActiveBaseSubscription(doc: OrganizationSubscriptionDocument | null): boolean {
  if (!doc?.stripeSubscriptionId?.trim()) {
    return false;
  }
  const status = mapStripeStatus(doc.stripeStatus);
  if (status === "trialing" || status === "active" || status === "past_due") {
    return true;
  }
  if (
    status === "canceled" &&
    doc.currentPeriodEnd &&
    doc.currentPeriodEnd.getTime() > Date.now()
  ) {
    return true;
  }
  return false;
}

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new InternalServerErrorException("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(key, { typescript: true });
}

function mapStripeStatus(stripeStatus: string | undefined): OrganizationSubscriptionStatus {
  switch (stripeStatus) {
    case "trialing":
    case "active":
    case "past_due":
    case "canceled":
    case "unpaid":
    case "incomplete":
    case "incomplete_expired":
      return stripeStatus;
    default:
      return "none";
  }
}

function computeHasAccess(
  status: OrganizationSubscriptionStatus,
  currentPeriodEnd?: Date,
): boolean {
  const now = Date.now();
  if (status === "trialing" || status === "active" || status === "past_due") {
    return true;
  }
  if (status === "canceled" && currentPeriodEnd && currentPeriodEnd.getTime() > now) {
    return true;
  }
  return false;
}

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectModel("OrganizationSubscription")
    private readonly subscriptionModel: Model<OrganizationSubscriptionDocument>,
    @InjectModel("ProcessedStripeEvent")
    private readonly processedEventModel: Model<ProcessedStripeEventDocument>,
  ) {}

  private toResponse(doc: OrganizationSubscriptionDocument): OrganizationSubscriptionResponse {
    const status = mapStripeStatus(doc.stripeStatus);
    const trialEndsAt = doc.trialEndsAt ?? null;
    const currentPeriodEnd = doc.currentPeriodEnd ?? null;
    const activeAddons = (doc.activeAddons ?? []).filter(isValidAddonCode);
    return {
      organizationId: doc.organizationId,
      status,
      hasAccess: computeHasAccess(status, doc.currentPeriodEnd),
      trialEndsAt: trialEndsAt ? trialEndsAt.toISOString() : null,
      currentPeriodEnd: currentPeriodEnd ? currentPeriodEnd.toISOString() : null,
      cancelAtPeriodEnd: doc.cancelAtPeriodEnd ?? false,
      planName: BASE_SUBSCRIPTION_PLAN.name,
      planLabel: PLAN_LABEL,
      activeAddons,
    };
  }

  async getByOrganization(organizationId: string): Promise<OrganizationSubscriptionResponse> {
    const doc = await this.subscriptionModel.findOne({ organizationId }).exec();
    if (!doc) {
      return {
        organizationId,
        status: "none",
        hasAccess: false,
        trialEndsAt: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        planName: BASE_SUBSCRIPTION_PLAN.name,
        planLabel: PLAN_LABEL,
        activeAddons: [],
      };
    }
    return this.toResponse(doc);
  }

  async createCheckoutSession(params: {
    organizationId: string;
    customerEmail?: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<CreateCheckoutSessionResponse> {
    const priceId = resolveBasePriceId();

    const trialDays = Number(process.env.STRIPE_TRIAL_DAYS ?? DEFAULT_TRIAL_DAYS);
    if (!Number.isFinite(trialDays) || trialDays < 0) {
      throw new InternalServerErrorException("Invalid STRIPE_TRIAL_DAYS");
    }

    const stripe = getStripe();
    let stripeCustomerId = await this.resolveStripeCustomerIdForCheckout(
      stripe,
      params.organizationId,
      params.customerEmail,
    );
    if (!stripeCustomerId && params.customerEmail?.trim()) {
      const created = await stripe.customers.create({
        email: params.customerEmail.trim(),
        metadata: { organizationId: params.organizationId },
      });
      stripeCustomerId = created.id;
      await this.subscriptionModel
        .findOneAndUpdate(
          { organizationId: params.organizationId },
          { stripeCustomerId },
          { upsert: true },
        )
        .exec();
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      client_reference_id: params.organizationId,
      metadata: { organizationId: params.organizationId },
      subscription_data: {
        trial_period_days: trialDays,
        metadata: { organizationId: params.organizationId },
      },
      allow_promotion_codes: true,
    };

    if (stripeCustomerId) {
      sessionParams.customer = stripeCustomerId;
    } else if (params.customerEmail?.trim()) {
      sessionParams.customer_email = params.customerEmail.trim();
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    if (!session.url) {
      throw new InternalServerErrorException("Stripe Checkout session has no URL");
    }
    return { url: session.url };
  }

  async createAddonCheckoutSession(params: {
    organizationId: string;
    addonCode: AddonCode;
    customerEmail?: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<CreateCheckoutSessionResponse> {
    if (!isValidAddonCode(params.addonCode)) {
      throw new BadRequestException(`Code addon invalide : ${params.addonCode}`);
    }

    const addonPriceId = resolveAddonPriceId(params.addonCode);
    if (!addonPriceId?.trim()) {
      throw new InternalServerErrorException(
        `Prix Stripe non configuré pour l'addon ${params.addonCode}. ` +
          `Définissez la variable d'environnement ${ADDON_CATALOG[params.addonCode].stripePriceEnvVar}.`,
      );
    }

    const doc = await this.subscriptionModel
      .findOne({ organizationId: params.organizationId })
      .exec();

    if ((doc?.activeAddons ?? []).includes(params.addonCode)) {
      throw new BadRequestException(
        `L'addon « ${ADDON_CATALOG[params.addonCode].label} » est déjà actif.`,
      );
    }

    const stripe = getStripe();

    if (!addonAllowsStandaloneCheckout(params.addonCode)) {
      return this.createBundledAddonCheckoutSession(stripe, params, doc, addonPriceId);
    }

    if (!doc?.stripeCustomerId) {
      throw new BadRequestException(
        "Un abonnement principal actif est requis avant d'ajouter un addon. Finalisez d'abord votre abonnement.",
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: addonPriceId, quantity: 1 }],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      customer: doc.stripeCustomerId,
      client_reference_id: params.organizationId,
      metadata: {
        organizationId: params.organizationId,
        addonCode: params.addonCode,
      },
      subscription_data: {
        metadata: {
          organizationId: params.organizationId,
          addonCode: params.addonCode,
        },
      },
    });

    if (!session.url) {
      throw new InternalServerErrorException("Stripe Checkout session has no URL");
    }
    return { url: session.url };
  }

  /**
   * Paywall Stripe : Essentiel + addon sur une seule souscription, ou ajout de l'addon
   * sur l'abonnement socle existant (facture hébergée).
   */
  private async createBundledAddonCheckoutSession(
    stripe: Stripe,
    params: {
      organizationId: string;
      addonCode: AddonCode;
      customerEmail?: string;
      successUrl: string;
      cancelUrl: string;
    },
    doc: OrganizationSubscriptionDocument | null,
    addonPriceId: string,
  ): Promise<CreateCheckoutSessionResponse> {
    if (!hasActiveBaseSubscription(doc)) {
      return this.createBasePlusAddonCheckoutSession(stripe, params, doc, addonPriceId);
    }

    const subscriptionId = doc!.stripeSubscriptionId!.trim();
    const sub = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["items.data.price"],
    });

    const addonAlreadyOnSubscription = sub.items.data.some((item) => {
      const priceId = typeof item.price === "string" ? item.price : item.price?.id;
      return priceId === addonPriceId;
    });
    if (addonAlreadyOnSubscription) {
      throw new BadRequestException(
        `L'addon « ${ADDON_CATALOG[params.addonCode].label} » est déjà actif.`,
      );
    }

    const existingItems = sub.items.data.map((item) => ({
      id: item.id,
      quantity: item.quantity ?? 1,
    }));

    const updated = await stripe.subscriptions.update(subscriptionId, {
      items: [...existingItems, { price: addonPriceId, quantity: 1 }],
      proration_behavior: "always_invoice",
      payment_behavior: "pending_if_incomplete",
      expand: ["latest_invoice"],
    });

    const paywallUrl = await this.resolveAddonPaywallUrl(
      stripe,
      updated.latest_invoice,
      params.successUrl,
    );
    if (paywallUrl) {
      return { url: paywallUrl };
    }

    throw new InternalServerErrorException(
      "Impossible d'ouvrir le paiement Stripe pour cet addon. Réessayez ou contactez le support.",
    );
  }

  /**
   * URL de paiement Stripe (facture hébergée ouverte) — l'addon n'est activé qu'après règlement (webhook).
   * En période d'essai, la facture de prorata est souvent à 0 € et déjà « payée » : on renvoie alors
   * vers l'app (évite la page reçu « Facture payée 0,00 € »).
   */
  private async resolveAddonPaywallUrl(
    stripe: Stripe,
    latestInvoice: Stripe.Subscription["latest_invoice"],
    successUrl: string,
  ): Promise<string | null> {
    if (!latestInvoice || typeof latestInvoice === "string") {
      return null;
    }

    let invoice = latestInvoice;
    if (invoice.status === "draft") {
      invoice = await stripe.invoices.finalizeInvoice(invoice.id);
    }

    if (invoice.status === "open" && (invoice.amount_due ?? 0) > 0 && invoice.hosted_invoice_url) {
      return invoice.hosted_invoice_url;
    }

    if (invoice.status === "paid" || (invoice.amount_due ?? 0) === 0) {
      return successUrl;
    }

    if (invoice.hosted_invoice_url && invoice.status === "open") {
      return invoice.hosted_invoice_url;
    }

    return null;
  }

  /** Checkout : abonnement socle Essentiel + addon sur une même souscription Stripe. */
  private async createBasePlusAddonCheckoutSession(
    stripe: Stripe,
    params: {
      organizationId: string;
      addonCode: AddonCode;
      customerEmail?: string;
      successUrl: string;
      cancelUrl: string;
    },
    doc: OrganizationSubscriptionDocument | null,
    addonPriceId: string,
  ): Promise<CreateCheckoutSessionResponse> {
    const basePriceId = resolveBasePriceId();
    const trialDays = Number(process.env.STRIPE_TRIAL_DAYS ?? DEFAULT_TRIAL_DAYS);
    if (!Number.isFinite(trialDays) || trialDays < 0) {
      throw new InternalServerErrorException("Invalid STRIPE_TRIAL_DAYS");
    }

    let stripeCustomerId = doc?.stripeCustomerId?.trim();
    if (!stripeCustomerId) {
      stripeCustomerId = await this.resolveStripeCustomerIdForCheckout(
        stripe,
        params.organizationId,
        params.customerEmail,
      );
    }
    if (!stripeCustomerId && params.customerEmail?.trim()) {
      const created = await stripe.customers.create({
        email: params.customerEmail.trim(),
        metadata: { organizationId: params.organizationId },
      });
      stripeCustomerId = created.id;
      await this.subscriptionModel
        .findOneAndUpdate(
          { organizationId: params.organizationId },
          { stripeCustomerId },
          { upsert: true },
        )
        .exec();
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      line_items: [
        { price: basePriceId, quantity: 1 },
        { price: addonPriceId, quantity: 1 },
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      client_reference_id: params.organizationId,
      metadata: {
        organizationId: params.organizationId,
        addonCode: params.addonCode,
        checkoutKind: "base_plus_addon",
      },
      subscription_data: {
        trial_period_days: trialDays,
        metadata: { organizationId: params.organizationId },
      },
      allow_promotion_codes: true,
    };

    if (stripeCustomerId) {
      sessionParams.customer = stripeCustomerId;
    } else if (params.customerEmail?.trim()) {
      sessionParams.customer_email = params.customerEmail.trim();
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    if (!session.url) {
      throw new InternalServerErrorException("Stripe Checkout session has no URL");
    }
    return { url: session.url };
  }

  async createBillingPortalSession(params: {
    organizationId: string;
    returnUrl: string;
    flow?: "default" | "subscription_update";
  }): Promise<CreateBillingPortalResponse> {
    const doc = await this.subscriptionModel
      .findOne({ organizationId: params.organizationId })
      .exec();
    if (!doc?.stripeCustomerId && !doc?.stripeSubscriptionId) {
      throw new NotFoundException(
        "No Stripe customer for this organization; complete checkout first.",
      );
    }

    const stripe = getStripe();
    const billing = await this.resolveBillingPortalContext(stripe, params.organizationId, doc);

    if (billing.stripeCustomerId !== doc.stripeCustomerId) {
      await this.subscriptionModel
        .updateOne(
          { organizationId: params.organizationId },
          { stripeCustomerId: billing.stripeCustomerId },
        )
        .exec();
    }

    const portalConfigurationId = process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID?.trim();
    const sessionParams: Stripe.BillingPortal.SessionCreateParams = {
      customer: billing.stripeCustomerId,
      return_url: params.returnUrl,
      ...(portalConfigurationId ? { configuration: portalConfigurationId } : {}),
    };

    if (params.flow === "subscription_update") {
      if (!billing.stripeSubscriptionId) {
        throw new BadRequestException(
          "Aucun abonnement Essentiel actif : finalisez d'abord votre abonnement socle.",
        );
      }
      sessionParams.flow_data = {
        type: "subscription_update",
        subscription_update: {
          subscription: billing.stripeSubscriptionId,
        },
        after_completion: {
          type: "redirect",
          redirect: { return_url: params.returnUrl },
        },
      };
    }

    const session = await stripe.billingPortal.sessions.create(sessionParams);
    return { url: session.url };
  }

  /**
   * Applique l'ensemble d'options souhaité sur l'abonnement socle (ajouts et retraits).
   * Retourne une URL de paiement Stripe si nécessaire, sinon null (changements déjà actifs).
   */
  async updateSubscriptionAddons(params: {
    organizationId: string;
    addonCodes: AddonCode[];
    successUrl: string;
  }): Promise<UpdateSubscriptionAddonsResponse> {
    const desired = [
      ...new Set(
        params.addonCodes.filter(
          (code): code is AddonCode =>
            isValidAddonCode(code) && ADDON_CATALOG[code].requiresBaseSubscription,
        ),
      ),
    ];

    const doc = await this.subscriptionModel
      .findOne({ organizationId: params.organizationId })
      .exec();
    if (!hasActiveBaseSubscription(doc)) {
      throw new BadRequestException(
        "Aucun abonnement Essentiel actif : activez d'abord votre abonnement socle.",
      );
    }

    const subscriptionId = doc!.stripeSubscriptionId!.trim();
    const stripe = getStripe();
    const sub = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["items.data.price"],
    });

    const subOrgId = sub.metadata?.organizationId;
    if (subOrgId && subOrgId !== params.organizationId) {
      throw new BadRequestException("L'abonnement Stripe ne correspond pas à cette organisation.");
    }

    const currentCrossSell = this.addonsFromSubscriptionItems(sub);
    const toAdd = desired.filter((code) => !currentCrossSell.includes(code));
    const toRemove = currentCrossSell.filter((code) => !desired.includes(code));

    if (toAdd.length === 0 && toRemove.length === 0) {
      throw new BadRequestException("Aucune modification à appliquer.");
    }

    const toRemovePriceIds = new Set(toRemove.map((code) => resolveAddonPriceId(code)));
    const items: Stripe.SubscriptionUpdateParams.Item[] = [];

    for (const item of sub.items.data) {
      const priceId = typeof item.price === "string" ? item.price : (item.price?.id ?? undefined);
      if (priceId && toRemovePriceIds.has(priceId)) {
        items.push({ id: item.id, deleted: true });
        continue;
      }
      items.push({ id: item.id, quantity: item.quantity ?? 1 });
    }

    for (const code of toAdd) {
      items.push({ price: resolveAddonPriceId(code), quantity: 1 });
    }

    const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
    const updated = await stripe.subscriptions.update(subscriptionId, {
      items,
      proration_behavior: "always_invoice",
      payment_behavior: "pending_if_incomplete",
      expand: ["latest_invoice"],
    });

    const paywallUrl = await this.resolveAddonPaywallUrl(
      stripe,
      updated.latest_invoice,
      params.successUrl,
    );
    if (paywallUrl) {
      return { url: paywallUrl };
    }

    await this.persistSubscription(params.organizationId, customerId, updated);
    return { url: null };
  }

  async handleStripeWebhook(
    rawBody: Buffer,
    signature: string | undefined,
  ): Promise<{ received: boolean }> {
    const webhookSecret =
      process.env.STRIPE_WEBHOOK_SECRET?.trim() || process.env.WEBHOOK_SECRET?.trim();
    if (!webhookSecret) {
      throw new InternalServerErrorException(
        "STRIPE_WEBHOOK_SECRET is not configured (valeur fournie par `stripe listen`, ex. whsec_…)",
      );
    }
    if (!signature) {
      throw new BadRequestException("Missing Stripe-Signature header");
    }

    const stripe = getStripe();
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid payload";
      throw new BadRequestException(`Webhook signature verification failed: ${msg}`);
    }

    const already = await this.processedEventModel.findOne({ eventId: event.id }).exec();
    if (already) {
      return { received: true };
    }

    try {
      switch (event.type) {
        case "checkout.session.completed":
          await this.onCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
          break;
        case "customer.subscription.created":
        case "customer.subscription.updated":
          await this.onSubscriptionUpsert(event.data.object as Stripe.Subscription);
          break;
        case "customer.subscription.deleted":
          await this.onSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
        default:
          break;
      }
      try {
        await this.processedEventModel.create({ eventId: event.id });
      } catch (createErr: unknown) {
        if ((createErr as { code?: number })?.code !== 11000) {
          throw createErr;
        }
      }
    } catch (err: unknown) {
      throw new InternalServerErrorException(
        err instanceof Error ? err.message : "Webhook handler error",
      );
    }

    return { received: true };
  }

  /**
   * Contexte Stripe pour le portail de facturation : client + abonnement principal de l'org.
   * L'abonnement principal est utilisé pour un deep link `subscription_update` (vente croisée addons).
   */
  private async resolveBillingPortalContext(
    stripe: Stripe,
    organizationId: string,
    doc: OrganizationSubscriptionDocument,
  ): Promise<{ stripeCustomerId: string; stripeSubscriptionId?: string }> {
    const subscriptionId = doc.stripeSubscriptionId?.trim();
    if (subscriptionId) {
      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      const subOrgId = sub.metadata?.organizationId;
      if (subOrgId && subOrgId !== organizationId) {
        throw new BadRequestException(
          "L'abonnement Stripe ne correspond pas à cette organisation.",
        );
      }
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      return { stripeCustomerId: customerId, stripeSubscriptionId: sub.id };
    }

    const stored = doc.stripeCustomerId?.trim();
    if (!stored) {
      throw new NotFoundException(
        "No Stripe customer for this organization; complete checkout first.",
      );
    }

    const customer = await stripe.customers.retrieve(stored);
    if (typeof customer === "string" || ("deleted" in customer && customer.deleted)) {
      throw new NotFoundException(
        "No Stripe customer for this organization; complete checkout first.",
      );
    }

    const customerOrgId = customer.metadata?.organizationId;
    if (customerOrgId && customerOrgId !== organizationId) {
      throw new BadRequestException(
        "Le client Stripe enregistré ne correspond pas à cette organisation.",
      );
    }

    return { stripeCustomerId: stored };
  }

  /**
   * Priorité : 1) `stripeCustomerId` persisté pour l'org (validé chez Stripe + metadata),
   * 2) client Stripe avec `metadata.organizationId` sur le même e-mail.
   * Ne réutilise jamais un client Stripe d'une autre organisation (même e-mail).
   */
  private async resolveStripeCustomerIdForCheckout(
    stripe: Stripe,
    organizationId: string,
    customerEmail: string | undefined,
  ): Promise<string | undefined> {
    const doc = await this.subscriptionModel
      .findOne({ organizationId })
      .select("stripeCustomerId")
      .lean()
      .exec();
    const stored = doc?.stripeCustomerId?.trim();
    if (stored) {
      let dropStored = false;
      try {
        const c = await stripe.customers.retrieve(stored);
        if (typeof c !== "string" && !("deleted" in c && c.deleted)) {
          const metaOrg = c.metadata?.organizationId;
          if (!metaOrg || metaOrg === organizationId) {
            return stored;
          }
          dropStored = true;
        } else {
          dropStored = typeof c !== "string" && "deleted" in c && c.deleted === true;
        }
      } catch (err: unknown) {
        if (this.isStripeCustomerMissingError(err)) {
          dropStored = true;
        }
      }
      if (dropStored) {
        await this.subscriptionModel
          .updateOne({ organizationId }, { $unset: { stripeCustomerId: "" } })
          .exec();
      }
    }

    const email = customerEmail?.trim();
    if (!email) {
      return undefined;
    }
    const { data } = await stripe.customers.list({ email, limit: 25 });
    const withOrgMeta = data.find((c) => c.metadata?.organizationId === organizationId);
    return withOrgMeta?.id;
  }

  private isStripeCustomerMissingError(err: unknown): boolean {
    return (
      err instanceof Stripe.errors.StripeInvalidRequestError && err.code === "resource_missing"
    );
  }

  private async onCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const organizationId =
      session.metadata?.organizationId ?? session.client_reference_id ?? undefined;
    if (!organizationId || session.mode !== "subscription") {
      return;
    }

    const addonCode = session.metadata?.addonCode;

    const customerId =
      typeof session.customer === "string" ? session.customer : session.customer?.id;
    const subscriptionId =
      typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
    if (!customerId || !subscriptionId) {
      return;
    }

    const checkoutKind = session.metadata?.checkoutKind;
    if (addonCode && isValidAddonCode(addonCode) && checkoutKind !== "base_plus_addon") {
      await this.activateAddon(organizationId, customerId, addonCode, subscriptionId);
      return;
    }

    const stripe = getStripe();
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    await this.persistSubscription(organizationId, customerId, sub);
  }

  private async onSubscriptionUpsert(sub: Stripe.Subscription): Promise<void> {
    const organizationId = sub.metadata?.organizationId;
    if (!organizationId) {
      return;
    }

    const addonCode = sub.metadata?.addonCode;
    if (addonCode && isValidAddonCode(addonCode)) {
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      if (sub.status === "active" || sub.status === "trialing") {
        await this.activateAddon(organizationId, customerId, addonCode, sub.id);
      } else if (sub.status === "canceled" || sub.status === "unpaid") {
        await this.deactivateAddon(organizationId, addonCode);
      }
      return;
    }

    const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
    await this.persistSubscription(organizationId, customerId, sub);
  }

  private async onSubscriptionDeleted(sub: Stripe.Subscription): Promise<void> {
    const organizationId = sub.metadata?.organizationId;
    if (!organizationId) {
      return;
    }

    const addonCode = sub.metadata?.addonCode;
    if (addonCode && isValidAddonCode(addonCode)) {
      await this.deactivateAddon(organizationId, addonCode);
      return;
    }

    await this.subscriptionModel
      .findOneAndUpdate(
        { organizationId },
        {
          stripeStatus: "canceled",
          stripeSubscriptionId: sub.id,
          trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : undefined,
          currentPeriodEnd: sub.current_period_end
            ? new Date(sub.current_period_end * 1000)
            : undefined,
          cancelAtPeriodEnd: false,
        },
        { upsert: true, new: true },
      )
      .exec();
  }

  private async activateAddon(
    organizationId: string,
    stripeCustomerId: string,
    addonCode: AddonCode,
    stripeSubscriptionId: string,
  ): Promise<void> {
    await this.subscriptionModel
      .findOneAndUpdate(
        { organizationId },
        {
          $addToSet: { activeAddons: addonCode },
          $set: {
            [`addonStripeSubscriptionIds.${addonCode}`]: stripeSubscriptionId,
            stripeCustomerId,
          },
        },
        { upsert: true, new: true },
      )
      .exec();
  }

  private async deactivateAddon(organizationId: string, addonCode: AddonCode): Promise<void> {
    await this.subscriptionModel
      .findOneAndUpdate(
        { organizationId },
        {
          $pull: { activeAddons: addonCode },
          $unset: { [`addonStripeSubscriptionIds.${addonCode}`]: "" },
        },
      )
      .exec();
  }

  /** Addons présents comme ligne sur l'abonnement socle (vente croisée Stripe). */
  private addonsFromSubscriptionItems(sub: Stripe.Subscription): AddonCode[] {
    const priceIds = new Set(
      sub.items.data
        .map((item) => {
          const price = item.price;
          return typeof price === "string" ? price : price?.id;
        })
        .filter((id): id is string => Boolean(id)),
    );

    return ADDON_CODES.filter(
      (code) =>
        ADDON_CATALOG[code].requiresBaseSubscription && priceIds.has(resolveAddonPriceId(code)),
    );
  }

  private mergeActiveAddons(
    existing: string[] | undefined,
    crossSellFromMainSub: AddonCode[],
  ): AddonCode[] {
    const legacyStandalone = (existing ?? []).filter(
      (code): code is AddonCode => isValidAddonCode(code) && addonAllowsStandaloneCheckout(code),
    );
    return [...new Set([...legacyStandalone, ...crossSellFromMainSub])];
  }

  private async persistSubscription(
    organizationId: string,
    stripeCustomerId: string,
    sub: Stripe.Subscription,
  ): Promise<void> {
    const existing = await this.subscriptionModel.findOne({ organizationId }).lean().exec();
    const crossSellAddons = this.addonsFromSubscriptionItems(sub);
    const activeAddons = this.mergeActiveAddons(existing?.activeAddons, crossSellAddons);

    await this.subscriptionModel
      .findOneAndUpdate(
        { organizationId },
        {
          organizationId,
          stripeCustomerId,
          stripeSubscriptionId: sub.id,
          stripeStatus: sub.status,
          trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : undefined,
          currentPeriodEnd: sub.current_period_end
            ? new Date(sub.current_period_end * 1000)
            : undefined,
          cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
          activeAddons,
        },
        { upsert: true, new: true },
      )
      .exec();

    const stripe = getStripe();
    try {
      const c = await stripe.customers.retrieve(stripeCustomerId);
      if (typeof c === "string" || ("deleted" in c && c.deleted)) {
        return;
      }
      if (c.metadata?.organizationId === organizationId) {
        return;
      }
      await stripe.customers.update(stripeCustomerId, {
        metadata: { ...(c.metadata ?? {}), organizationId },
      });
    } catch {
      /* best-effort : ne pas faire échouer le webhook */
    }
  }
}
