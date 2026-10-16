import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { AuthUser } from "@planwise/shared";
import type {
  CreateAddonCheckoutSessionGatewayBody,
  CreateBillingPortalGatewayBody,
  CreateBillingPortalResponse,
  CreateCheckoutSessionGatewayBody,
  CreateCheckoutSessionResponse,
  OrganizationSubscriptionResponse,
  StartTrialResponse,
  ExtendTrialResponse,
  UpdateSubscriptionAddonsGatewayBody,
  UpdateSubscriptionAddonsResponse,
} from "@planwise/shared";
import {
  BASE_SUBSCRIPTION_STORAGE_BYTES,
  computeOrganizationStorageQuotaBytes,
  isStorageQuotaWarning,
} from "@planwise/shared";
import { AbstractSubscriptionsGatewayService } from "./ports/subscriptions.service.port";
import { SubscriptionsService } from "./subscriptions/subscriptions.service";
import { AbstractDocumentsService } from "./documents/ports/documents.service.port";
import { AbstractOrganizationsService } from "./organizations/ports/organizations.service.port";

@Injectable()
export class SubscriptionsGatewayService extends AbstractSubscriptionsGatewayService {
  constructor(
    private readonly subscriptions: SubscriptionsService,
    private readonly documents: AbstractDocumentsService,
    private readonly organizations: AbstractOrganizationsService,
  ) {
    super();
  }

  async getCurrentSubscription(user: AuthUser): Promise<OrganizationSubscriptionResponse> {
    const sub = await this.subscriptions.getByOrganization(user.organizationId);
    const storageQuotaBytes = computeOrganizationStorageQuotaBytes(sub.addonQuantities);
    let storageUsedBytes = sub.storageUsedBytes ?? 0;
    try {
      const usage = await this.documents.getOrganizationStorageUsage(user.organizationId);
      storageUsedBytes = usage.usedBytes;
    } catch {
      /* usage indisponible : conserver la valeur déjà portée par l'abonnement */
    }

    return {
      ...sub,
      storageQuotaBytes,
      storageUsedBytes,
      storageWarning: isStorageQuotaWarning(storageUsedBytes, storageQuotaBytes),
      includedStorageBytes: BASE_SUBSCRIPTION_STORAGE_BYTES,
    };
  }

  async createCheckoutSession(
    user: AuthUser,
    body: CreateCheckoutSessionGatewayBody,
  ): Promise<CreateCheckoutSessionResponse> {
    const customerEmail = await this.resolveOrganizationBillingEmail(user.organizationId);
    return this.subscriptions.createCheckoutSession({
      organizationId: user.organizationId,
      customerEmail,
      successUrl: body.successUrl,
      cancelUrl: body.cancelUrl,
    });
  }

  async startTrial(user: AuthUser): Promise<StartTrialResponse> {
    return this.subscriptions.startTrial(user.organizationId);
  }

  async extendTrial(user: AuthUser): Promise<ExtendTrialResponse> {
    return this.subscriptions.extendTrial(user.organizationId);
  }

  async staffExtendTrial(organizationId: string): Promise<ExtendTrialResponse> {
    return this.subscriptions.staffExtendTrial(organizationId);
  }

  async createAddonCheckoutSession(
    user: AuthUser,
    body: CreateAddonCheckoutSessionGatewayBody,
  ): Promise<CreateCheckoutSessionResponse> {
    const customerEmail = await this.resolveOrganizationBillingEmail(user.organizationId);
    return this.subscriptions.createAddonCheckoutSession({
      organizationId: user.organizationId,
      addonCode: body.addonCode,
      customerEmail,
      successUrl: body.successUrl,
      cancelUrl: body.cancelUrl,
    });
  }

  async createBillingPortalSession(
    user: AuthUser,
    body: CreateBillingPortalGatewayBody,
  ): Promise<CreateBillingPortalResponse> {
    return this.subscriptions.createBillingPortalSession({
      organizationId: user.organizationId,
      returnUrl: body.returnUrl,
      flow: body.flow,
    });
  }

  async updateSubscriptionAddons(
    user: AuthUser,
    body: UpdateSubscriptionAddonsGatewayBody,
  ): Promise<UpdateSubscriptionAddonsResponse> {
    return this.subscriptions.updateSubscriptionAddons({
      organizationId: user.organizationId,
      addonCodes: body.addonCodes,
      addonQuantities: body.addonQuantities,
      successUrl: body.successUrl,
    });
  }

  private async resolveOrganizationBillingEmail(organizationId: string): Promise<string> {
    const organization = await this.organizations.findById(organizationId);
    if (!organization) {
      throw new NotFoundException("Organisation introuvable.");
    }
    const email = organization.email?.trim() ?? "";
    if (!email || !email.includes("@")) {
      throw new BadRequestException(
        "E-mail de facturation de l’organisation requis. Renseignez-le dans Organisation avant de vous abonner.",
      );
    }
    return email;
  }
}
