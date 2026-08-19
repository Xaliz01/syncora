"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CustomerCreateForm } from "./CustomerCreateForm";
import {
  FormDialogCancelButton,
  FormDialogPrimaryButton,
  FormPage,
} from "@/components/ui/FormDialog";

const FORM_ID = "customer-create-form";

export function CustomerCreatePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  return (
    <FormPage
      title="Nouveau client"
      description="Ajoutez une personne physique ou morale pour la lier ensuite à vos dossiers."
      breadcrumb={{ href: "/customers", label: "Clients" }}
      asForm={false}
      footer={
        <>
          <FormDialogCancelButton onClick={() => router.push("/customers")} disabled={saving} />
          <FormDialogPrimaryButton type="submit" form={FORM_ID} disabled={saving}>
            {saving ? "Création…" : "Créer le client"}
          </FormDialogPrimaryButton>
        </>
      }
    >
      <CustomerCreateForm
        formId={FORM_ID}
        hideActions
        onPendingChange={setSaving}
        onSuccess={(c) => router.push(`/customers/${c.id}`)}
      />
    </FormPage>
  );
}
