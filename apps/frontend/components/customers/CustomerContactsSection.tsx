"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CustomerContactResponse, CustomerResponse } from "@planwise/shared";
import * as customersApi from "@/lib/customers.api";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import { usePermissions } from "@/lib/hooks/usePermissions";

interface ContactFormData {
  name: string;
  role: string;
  phone: string;
  mobile: string;
  email: string;
  notes: string;
}

const emptyContactForm: ContactFormData = {
  name: "",
  role: "",
  phone: "",
  mobile: "",
  email: "",
  notes: "",
};

function ContactForm({
  initial,
  isPending,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  initial: ContactFormData;
  isPending: boolean;
  onSubmit: (data: ContactFormData) => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  const [form, setForm] = useState<ContactFormData>(initial);
  const canSubmit = form.name.trim().length > 0;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) onSubmit(form);
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Nom *
          </label>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Jean Dupont"
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white dark:bg-slate-950"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Rôle / fonction
          </label>
          <input
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            placeholder="Responsable travaux, Gardien…"
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white dark:bg-slate-950"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Téléphone
          </label>
          <input
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="01 02 03 04 05"
            type="tel"
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white dark:bg-slate-950"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Mobile
          </label>
          <input
            value={form.mobile}
            onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
            placeholder="06 01 02 03 04"
            type="tel"
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white dark:bg-slate-950"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
            E-mail
          </label>
          <input
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="contact@exemple.fr"
            type="email"
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white dark:bg-slate-950"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
          Notes (optionnel)
        </label>
        <input
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          placeholder="Disponible le matin uniquement…"
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white dark:bg-slate-950"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!canSubmit || isPending}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
        >
          {isPending ? "…" : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}

export function CustomerContactsSection({ customer }: { customer: CustomerResponse }) {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const confirm = useConfirm();
  const { showToast } = useToast();
  const canUpdate = can("customers.update");

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const contacts = customer.contacts ?? [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["customer", customer.id] });
    queryClient.invalidateQueries({ queryKey: ["customers"] });
  };

  const createMutation = useMutation({
    mutationFn: (payload: customersApi.CreateCustomerContactPayload) =>
      customersApi.createCustomerContact(customer.id, payload),
    onSuccess: () => {
      invalidate();
      setShowAddForm(false);
      setError("");
      showToast("Contact ajouté.");
    },
    onError: (err: Error) => setError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      contactId,
      payload,
    }: {
      contactId: string;
      payload: customersApi.UpdateCustomerContactPayload;
    }) => customersApi.updateCustomerContact(customer.id, contactId, payload),
    onSuccess: () => {
      invalidate();
      setEditingContactId(null);
      setError("");
      showToast("Contact mis à jour.");
    },
    onError: (err: Error) => setError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (contactId: string) => customersApi.deleteCustomerContact(customer.id, contactId),
    onSuccess: () => {
      invalidate();
      setError("");
      showToast("Contact supprimé.");
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleDelete = async (contact: CustomerContactResponse) => {
    const ok = await confirm({
      title: "Supprimer ce contact ?",
      description: `Le contact « ${contact.name} » sera supprimé de ce client.`,
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!ok) return;
    setError("");
    deleteMutation.mutate(contact.id);
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm dark:shadow-slate-950/20">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Contacts</h2>
        {canUpdate && !showAddForm && (
          <button
            type="button"
            onClick={() => {
              setShowAddForm(true);
              setEditingContactId(null);
              setError("");
            }}
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-700"
          >
            Ajouter un contact
          </button>
        )}
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {showAddForm && (
        <div className="mb-4 rounded-lg border border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-800/50">
          <h3 className="mb-3 text-sm font-medium text-slate-800 dark:text-slate-100">
            Nouveau contact
          </h3>
          <ContactForm
            initial={emptyContactForm}
            isPending={createMutation.isPending}
            submitLabel="Ajouter"
            onCancel={() => {
              setShowAddForm(false);
              setError("");
            }}
            onSubmit={(data) => {
              setError("");
              createMutation.mutate({
                name: data.name.trim(),
                role: data.role.trim() || undefined,
                phone: data.phone.trim() || undefined,
                mobile: data.mobile.trim() || undefined,
                email: data.email.trim() || undefined,
                notes: data.notes.trim() || undefined,
              });
            }}
          />
        </div>
      )}

      {contacts.length === 0 && !showAddForm && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Aucun contact. Ajoutez des interlocuteurs pour ce client (responsable chantier,
          secrétariat…).
        </p>
      )}

      {contacts.length > 0 && (
        <div className="space-y-3">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="rounded-lg border border-slate-200 dark:border-slate-700 p-3"
            >
              {editingContactId === contact.id ? (
                <ContactForm
                  initial={{
                    name: contact.name,
                    role: contact.role ?? "",
                    phone: contact.phone ?? "",
                    mobile: contact.mobile ?? "",
                    email: contact.email ?? "",
                    notes: contact.notes ?? "",
                  }}
                  isPending={updateMutation.isPending}
                  submitLabel="Enregistrer"
                  onCancel={() => {
                    setEditingContactId(null);
                    setError("");
                  }}
                  onSubmit={(data) => {
                    setError("");
                    updateMutation.mutate({
                      contactId: contact.id,
                      payload: {
                        name: data.name.trim(),
                        role: data.role.trim() || null,
                        phone: data.phone.trim() || null,
                        mobile: data.mobile.trim() || null,
                        email: data.email.trim() || null,
                        notes: data.notes.trim() || null,
                      },
                    });
                  }}
                />
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                        {contact.name}
                      </span>
                      {contact.role && (
                        <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300">
                          {contact.role}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-600 dark:text-slate-300">
                      {contact.phone && (
                        <a href={`tel:${contact.phone}`} className="hover:text-brand-600">
                          {contact.phone}
                        </a>
                      )}
                      {contact.mobile && (
                        <a href={`tel:${contact.mobile}`} className="hover:text-brand-600">
                          {contact.mobile}
                        </a>
                      )}
                      {contact.email && (
                        <a href={`mailto:${contact.email}`} className="hover:text-brand-600">
                          {contact.email}
                        </a>
                      )}
                    </div>
                    {contact.notes && (
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {contact.notes}
                      </p>
                    )}
                  </div>
                  {canUpdate && (
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingContactId(contact.id);
                          setShowAddForm(false);
                          setError("");
                        }}
                        className="rounded px-2 py-1 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(contact)}
                        disabled={deleteMutation.isPending}
                        className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50"
                      >
                        Supprimer
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
