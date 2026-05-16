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
} from "@syncora/shared";
import { ADDON_CODES } from "@syncora/shared";
import type { OrganizationSubscriptionDocument } from "../persistence/organization-subscription.schema";
import type { ProcessedStripeEventDocument } from "../persistence/processed-stripe-event.schema";

const DEFAULT_TRIAL_DAYS = 15;
const PLAN_LABEL = "9,99 € / mois, sans engagement";

const ADDON_PRICE_IDS: Record<AddonCode, string> = {
  team_suggestion:
    process.env.STRIPE_ADDON_TEAM_SUGGESTION_PRICE_ID ?? "price_addon_team_suggestion",
};

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

function isValidAddonCode(code: string): code is AddonCode {
  return (ADDON_CODES as readonly string[]).includes(code);
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
    const priceId = process.env.STRIPE_PRICE_ID ?? "price_1TJBxC159m6jcNWDEmpIfyrE";
    if (!priceId?.trim()) {
      throw new BadRequestException(
        "STRIPE_PRICE_ID is missing: create a recurring EUR price (9,99 €/month) in Stripe and set its ID.",
      );
    }

    const trialDays = Number(process.env.STRIPE_TRIAL_DAYS ?? DEFAULT_TRIAL_DAYS);
    if (!Number.isFinite(trialDays) || trialDays < 0) {
      throw new InternalServerErrorException("Invalid STRIPE_TRIAL_DAYS");
    }

    const stripe = getStripe();
    const stripeCustomerId = await this.resolveStripeCustomerIdForCheckout(
      stripe,
      params.organizationId,
      params.customerEmail,
    );

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
    successUrl: string;
    cancelUrl: string;
  }): Promise<CreateCheckoutSessionResponse> {
    if (!isValidAddonCode(params.addonCode)) {
      throw new BadRequestException(`Code addon invalide : ${params.addonCode}`);
    }

    const doc = await this.subscriptionModel.findOne({ organizationId: params.organizationId }).exec();
    if (!doc?.stripeCustomerId) {
      throw new BadRequestException(
        "Un abonnement principal actif est requis avant d'ajouter un addon. Finalisez d'abord votre abonnement.",
      );
    }

    if ((doc.activeAddons ?? []).includes(params.addonCode)) {
      throw new BadRequestException(`L'addon « ${params.addonCode} » est déjà actif.`);
    }

    const priceId = ADDON_PRICE_IDS[params.addonCode];
    if (!priceId?.trim()) {
      throw new InternalServerErrorException(
        `Prix Stripe non configuré pour l'addon ${params.addonCode}`,
      );
    }

    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
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

  async createBillingPortalSession(params: {
    organizationId: string;
    returnUrl: string;
  }): Promise<CreateBillingPortalResponse> {
    const doc = await this.subscriptionModel
      .findOne({ organizationId: params.organizationId })
      .exec();
    if (!doc?.stripeCustomerId) {
      throw new NotFoundException(
        "No Stripe customer for this organization; complete checkout first.",
      );
    }
    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: doc.stripeCustomerId,
      return_url: params.returnUrl,
    });
    return { url: session.url };
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
   * Priorité : 1) `stripeCustomerId` persisté pour l'org (validé chez Stripe), 2) client Stripe
   * avec `metadata.organizationId`, 3) client le plus récent sur l'e-mail (évite les doublons checkout).
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
          return stored;
        }
        dropStored = typeof c !== "string" && "deleted" in c && c.deleted === true;
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
    if (withOrgMeta) {
      return withOrgMeta.id;
    }
    return data[0]?.id;
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

    if (addonCode && isValidAddonCode(addonCode)) {
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

  private async deactivateAddon(
    organizationId: string,
    addonCode: AddonCode,
  ): Promise<void> {
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

  private async persistSubscription(
    organizationId: string,
    stripeCustomerId: string,
    sub: Stripe.Subscription,
  ): Promise<void> {
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
