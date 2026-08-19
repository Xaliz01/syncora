"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as orderGiversApi from "@/lib/order-givers.api";
import { OrderGiverEditForm } from "./OrderGiverEditForm";
import { useToast } from "@/components/ui/ToastProvider";
import { PlanwiseLoader } from "@/components/ui/PlanwiseLoader";
import { ResourceNotFoundPanel } from "@/components/ui/AppErrorAlert";
import {
  FormDialogCancelButton,
  FormDialogPrimaryButton,
  FormPage,
} from "@/components/ui/FormDialog";

const FORM_ID = "order-giver-edit-form";

export function OrderGiverEditPage({ orderGiverId }: { orderGiverId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [error, setError] = useState("");
  const detailHref = `/order-givers/${orderGiverId}`;

  const {
    data: orderGiver,
    isLoading,
    isError,
    error: loadError,
    refetch,
  } = useQuery({
    queryKey: ["order-giver", orderGiverId],
    queryFn: () => orderGiversApi.getOrderGiver(orderGiverId),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: orderGiversApi.UpdateOrderGiverPayload) =>
      orderGiversApi.updateOrderGiver(orderGiverId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["order-giver", orderGiverId] });
      void queryClient.invalidateQueries({ queryKey: ["order-givers"] });
      showToast("Donneur d'ordre mis à jour.");
      router.push(detailHref);
    },
    onError: (err: Error) => setError(err.message),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <PlanwiseLoader size="md" label="Chargement…" />
      </div>
    );
  }

  if (isError || !orderGiver) {
    return (
      <ResourceNotFoundPanel
        error={isError ? loadError : undefined}
        resourceLabel="Donneur d'ordre"
        backHref="/order-givers"
        backLabel="Retour aux donneurs d'ordre"
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <FormPage
      title="Modifier le donneur d'ordre"
      description="Mettez à jour les informations du donneur d'ordre."
      breadcrumb={{ href: detailHref, label: orderGiver.displayName }}
      asForm={false}
      error={error || undefined}
      footer={
        <>
          <FormDialogCancelButton
            onClick={() => router.push(detailHref)}
            disabled={updateMutation.isPending}
          />
          <FormDialogPrimaryButton type="submit" form={FORM_ID} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Enregistrement…" : "Enregistrer"}
          </FormDialogPrimaryButton>
        </>
      }
    >
      <OrderGiverEditForm
        orderGiver={orderGiver}
        formId={FORM_ID}
        hideActions
        isPending={updateMutation.isPending}
        error={error}
        onCancel={() => router.push(detailHref)}
        onSubmit={(payload) => {
          setError("");
          updateMutation.mutate(payload);
        }}
      />
    </FormPage>
  );
}
