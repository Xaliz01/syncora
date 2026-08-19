"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as customersApi from "@/lib/customers.api";
import { CustomerEditForm } from "./CustomerEditForm";
import { useToast } from "@/components/ui/ToastProvider";
import { PlanwiseLoader } from "@/components/ui/PlanwiseLoader";
import { ResourceNotFoundPanel } from "@/components/ui/AppErrorAlert";
import {
  FormDialogCancelButton,
  FormDialogPrimaryButton,
  FormPage,
} from "@/components/ui/FormDialog";

const FORM_ID = "customer-edit-form";

export function CustomerEditPage({ customerId }: { customerId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [error, setError] = useState("");
  const detailHref = `/customers/${customerId}`;

  const {
    data: customer,
    isLoading,
    isError,
    error: loadError,
    refetch,
  } = useQuery({
    queryKey: ["customer", customerId],
    queryFn: () => customersApi.getCustomer(customerId),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: customersApi.UpdateCustomerPayload) =>
      customersApi.updateCustomer(customerId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["customer", customerId] });
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
      showToast("Client mis à jour.");
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

  if (isError || !customer) {
    return (
      <ResourceNotFoundPanel
        error={isError ? loadError : undefined}
        resourceLabel="Client"
        backHref="/customers"
        backLabel="Retour aux clients"
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <FormPage
      title="Modifier le client"
      description="Mettez à jour les informations du client."
      breadcrumb={{ href: detailHref, label: customer.displayName }}
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
      <CustomerEditForm
        customer={customer}
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
