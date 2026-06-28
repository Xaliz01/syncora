"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/AuthContext";
import * as notificationsApi from "@/lib/notifications.api";
import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_CHANNEL_LABELS,
  NOTIFICATION_EVENT_TYPES,
  NOTIFICATION_EVENT_TYPE_LABELS,
  REMINDER_LEAD_TIMES,
  REMINDER_LEAD_TIME_LABELS,
  buildDefaultNotificationPreferences,
  type NotificationChannel,
  type NotificationEventType,
  type NotificationPreferencesData,
  type ReminderLeadTime,
} from "@planwise/shared";

function PushNotificationSection() {
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setPushSupported(supported);
    if (supported) {
      setPushPermission(Notification.permission);
      checkExistingSubscription();
    }
  }, []);

  async function checkExistingSubscription() {
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      setSubscribed(!!sub);
    } catch {
      setSubscribed(false);
    }
  }

  async function handleSubscribe() {
    setLoading(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      if (permission !== "granted") {
        setError("Permission de notification refusée par le navigateur.");
        setLoading(false);
        return;
      }

      const vapidResponse = await notificationsApi.getVapidPublicKey();
      if (!vapidResponse.publicKey) {
        setError(
          "Les notifications push ne sont pas encore configurées sur le serveur (clé VAPID manquante).",
        );
        setLoading(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidResponse.publicKey),
      });

      const json = subscription.toJSON();
      await notificationsApi.registerPushSubscription({
        organizationId: "",
        endpoint: json.endpoint!,
        keys: {
          p256dh: json.keys!.p256dh!,
          auth: json.keys!.auth!,
        },
      });

      setSubscribed(true);
    } catch (err) {
      setError((err as Error).message || "Erreur lors de l'activation des notifications push.");
    } finally {
      setLoading(false);
    }
  }

  async function handleUnsubscribe() {
    setLoading(true);
    setError(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await notificationsApi.unregisterPushSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setSubscribed(false);
    } catch (err) {
      setError((err as Error).message || "Erreur lors de la désactivation.");
    } finally {
      setLoading(false);
    }
  }

  if (!pushSupported) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 p-5">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
          Notifications push (mobile)
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Les notifications push ne sont pas supportées par ce navigateur. Utilisez un navigateur
          récent (Chrome, Firefox, Edge) ou installez l&apos;application via le bouton « Installer
          ».
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 p-5">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
        Notifications push (mobile)
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        Recevez des notifications directement sur votre appareil, même lorsque l&apos;application
        est fermée. Idéal pour les rappels d&apos;interventions.
      </p>

      {pushPermission === "denied" && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 mb-3">
          <p className="text-sm text-red-700 dark:text-red-300">
            Les notifications sont bloquées par votre navigateur. Modifiez les paramètres du site
            dans votre navigateur pour les autoriser.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 mb-3">
          <p className="text-sm text-amber-700 dark:text-amber-300">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-3">
        {subscribed ? (
          <>
            <span className="inline-flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400 font-medium">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Activées
            </span>
            <button
              type="button"
              onClick={handleUnsubscribe}
              disabled={loading}
              className="rounded-lg border border-slate-200 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50"
            >
              {loading ? "Désactivation…" : "Désactiver"}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={handleSubscribe}
            disabled={loading || pushPermission === "denied"}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition disabled:opacity-50"
          >
            {loading ? "Activation…" : "Activer les notifications push"}
          </button>
        )}
      </div>
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function NotificationPreferencesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: () => notificationsApi.getPreferences(),
    enabled: !!user,
  });

  const [localPrefs, setLocalPrefs] = useState<NotificationPreferencesData | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (data?.preferences) {
      setLocalPrefs(data.preferences);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (prefs: NotificationPreferencesData) => notificationsApi.updatePreferences(prefs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
      setDirty(false);
    },
  });

  const preferences = localPrefs ?? buildDefaultNotificationPreferences();

  const handleToggleChannel = useCallback(
    (eventType: NotificationEventType, channel: NotificationChannel, enabled: boolean) => {
      setLocalPrefs((prev) => {
        const current = prev ?? buildDefaultNotificationPreferences();
        const updated = {
          ...current,
          events: {
            ...current.events,
            [eventType]: {
              ...current.events[eventType],
              channels: {
                ...current.events[eventType].channels,
                [channel]: { enabled },
              },
            },
          },
        };
        return updated;
      });
      setDirty(true);
    },
    [],
  );

  const handleReminderLeadTimeChange = useCallback((leadTime: ReminderLeadTime) => {
    setLocalPrefs((prev) => {
      const current = prev ?? buildDefaultNotificationPreferences();
      return { ...current, reminderLeadTime: leadTime };
    });
    setDirty(true);
  }, []);

  const handleSave = useCallback(() => {
    if (localPrefs) {
      saveMutation.mutate(localPrefs);
    }
  }, [localPrefs, saveMutation]);

  if (isLoading) {
    return (
      <div className="py-12 text-center text-sm text-slate-400">Chargement des préférences…</div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Préférences de notification
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Configurez comment et quand vous souhaitez être notifié pour chaque type d&apos;événement.
        </p>
      </div>

      <PushNotificationSection />

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 p-5">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
          Rappel avant intervention
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
          Recevez un rappel avant chaque intervention planifiée dont vous êtes l&apos;intervenant.
        </p>
        <select
          value={preferences.reminderLeadTime}
          onChange={(e) => handleReminderLeadTimeChange(Number(e.target.value) as ReminderLeadTime)}
          className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          {REMINDER_LEAD_TIMES.map((lt) => (
            <option key={lt} value={lt}>
              {REMINDER_LEAD_TIME_LABELS[lt]}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Canaux par type d&apos;événement
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Activez ou désactivez chaque canal de notification pour les événements qui vous
            intéressent.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
                <th className="text-left px-5 py-3 font-medium text-slate-600 dark:text-slate-300">
                  Événement
                </th>
                {NOTIFICATION_CHANNELS.map((ch) => (
                  <th
                    key={ch}
                    className="px-4 py-3 text-center font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap"
                  >
                    {NOTIFICATION_CHANNEL_LABELS[ch]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {NOTIFICATION_EVENT_TYPES.map((eventType) => (
                <tr
                  key={eventType}
                  className="border-b border-slate-50 dark:border-slate-800/50 last:border-b-0"
                >
                  <td className="px-5 py-3 text-slate-700 dark:text-slate-300">
                    {NOTIFICATION_EVENT_TYPE_LABELS[eventType]}
                  </td>
                  {NOTIFICATION_CHANNELS.map((channel) => {
                    const enabled =
                      preferences.events[eventType]?.channels[channel]?.enabled ?? false;
                    const isSms = channel === "sms";
                    return (
                      <td key={channel} className="px-4 py-3 text-center">
                        <label className="inline-flex items-center justify-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={enabled}
                            disabled={isSms}
                            onChange={(e) =>
                              handleToggleChannel(eventType, channel, e.target.checked)
                            }
                            className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-brand-600 focus:ring-brand-500 disabled:opacity-40 disabled:cursor-not-allowed"
                          />
                        </label>
                        {isSms && (
                          <span className="block text-[10px] text-slate-400 mt-0.5">bientôt</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || saveMutation.isPending}
          className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saveMutation.isPending ? "Enregistrement…" : "Enregistrer les préférences"}
        </button>
        {saveMutation.isSuccess && !dirty && (
          <span className="text-sm text-green-600 dark:text-green-400 font-medium">
            Préférences sauvegardées
          </span>
        )}
        {saveMutation.isError && (
          <span className="text-sm text-red-600 dark:text-red-400">
            Erreur lors de la sauvegarde
          </span>
        )}
      </div>
    </div>
  );
}
