"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OrderGiverCreateForm } from "./OrderGiverCreateForm";
import {
  FormDialogCancelButton,
  FormDialogPrimaryButton,
  FormPage,
} from "@/components/ui/FormDialog";

const FORM_ID = "order-giver-create-form";

export function OrderGiverCreatePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  return (
    <FormPage
      title="Nouveau donneur d'ordre"
      description="Ajoutez un tiers à facturer, distinct du client, pour le lier ensuite à vos dossiers."
      breadcrumb={{ href: "/order-givers", label: "Donneurs d'ordre" }}
      asForm={false}
      footer={
        <>
          <FormDialogCancelButton onClick={() => router.push("/order-givers")} disabled={saving} />
          <FormDialogPrimaryButton type="submit" form={FORM_ID} disabled={saving}>
            {saving ? "Création…" : "Créer le donneur d'ordre"}
          </FormDialogPrimaryButton>
        </>
      }
    >
      <OrderGiverCreateForm
        formId={FORM_ID}
        hideActions
        onPendingChange={setSaving}
        onSuccess={(og) => router.push(`/order-givers/${og.id}`)}
      />
    </FormPage>
  );
}
