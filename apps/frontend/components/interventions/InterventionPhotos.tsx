"use client";

import Image from "next/image";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { DocumentResponse } from "@syncora/shared";
import { MAX_DOCUMENT_FILE_SIZE_BYTES } from "@syncora/shared";
import * as documentsApi from "@/lib/documents.api";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

interface Props {
  interventionId: string;
  /** Compact mode for MyDayPage cards (no upload zone, just button + thumbnails) */
  compact?: boolean;
  readOnly?: boolean;
}

export function InterventionPhotos({ interventionId, compact = false, readOnly = false }: Props) {
  const queryClient = useQueryClient();
  const [photos, setPhotos] = useState<DocumentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [lightboxDoc, setLightboxDoc] = useState<DocumentResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const loadPhotos = useCallback(async () => {
    try {
      setLoading(true);
      const docs = await documentsApi.listDocuments("intervention", interventionId);
      const imageOnly = docs.filter((d) => d.mimeType.startsWith("image/"));
      setPhotos(imageOnly);
      setError(null);

      const urls: Record<string, string> = {};
      await Promise.all(
        imageOnly.map(async (doc) => {
          try {
            urls[doc.id] = await documentsApi.fetchDocumentPreviewUrl(doc.id);
          } catch {
            /* ignore preview failures */
          }
        }),
      );
      setPreviewUrls((prev) => {
        Object.values(prev).forEach((u) => {
          if (u.startsWith("blob:")) URL.revokeObjectURL(u);
        });
        return urls;
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [interventionId]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  useEffect(() => {
    return () => {
      Object.values(previewUrls).forEach((u) => {
        if (u.startsWith("blob:")) URL.revokeObjectURL(u);
      });
    };
  }, [previewUrls]);

  const handleUpload = async (files: FileList | File[]) => {
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        if (file.size > MAX_DOCUMENT_FILE_SIZE_BYTES) {
          throw new Error(`« ${file.name} » dépasse la taille maximale de 10 Mo.`);
        }
        if (!file.type.startsWith("image/")) {
          throw new Error(`« ${file.name} » n'est pas une image.`);
        }
        await documentsApi.uploadDocument("intervention", interventionId, file);
      }
      await loadPhotos();
      void queryClient.invalidateQueries({ queryKey: ["subscription-current"] });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUpload(e.target.files);
      e.target.value = "";
    }
  };

  const handleDelete = async (doc: DocumentResponse) => {
    try {
      await documentsApi.deleteDocument(doc.id);
      await loadPhotos();
      void queryClient.invalidateQueries({ queryKey: ["subscription-current"] });
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (compact) {
    return (
      <div className="mt-3">
        {/* Thumbnails row */}
        {photos.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {photos.map((photo) => (
              <button
                key={photo.id}
                onClick={() => setLightboxDoc(photo)}
                className="relative flex-shrink-0 h-14 w-14 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 hover:ring-2 hover:ring-brand-400 transition-all"
              >
                {previewUrls[photo.id] ? (
                  <Image
                    src={previewUrls[photo.id]}
                    alt={photo.originalName}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-100 dark:bg-slate-800 animate-pulse" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Action buttons */}
        {!readOnly && (
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => cameraInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition disabled:opacity-50"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
                />
              </svg>
              {uploading ? "Envoi…" : "Photo"}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition disabled:opacity-50"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
                />
              </svg>
              Galerie
            </button>
            {photos.length > 0 && (
              <span className="flex items-center text-xs text-slate-400 dark:text-slate-500 ml-auto">
                {photos.length} photo{photos.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}

        {/* Hidden inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileInput}
          className="hidden"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileInput}
          className="hidden"
        />

        {error && <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{error}</p>}

        {/* Lightbox */}
        {lightboxDoc && previewUrls[lightboxDoc.id] && (
          <PhotoLightbox
            doc={lightboxDoc}
            url={previewUrls[lightboxDoc.id]}
            onClose={() => setLightboxDoc(null)}
            onDelete={
              !readOnly
                ? () => handleDelete(lightboxDoc).then(() => setLightboxDoc(null))
                : undefined
            }
          />
        )}
      </div>
    );
  }

  return (
    <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
          <svg
            className="h-4 w-4 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
            />
          </svg>
          Photos d&apos;intervention
          {photos.length > 0 && (
            <span className="ml-1 text-slate-400 dark:text-slate-500 font-normal">
              ({photos.length})
            </span>
          )}
        </h4>
        {!readOnly && (
          <div className="flex gap-1.5">
            <button
              onClick={() => cameraInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
                />
              </svg>
              Prendre une photo
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                />
              </svg>
              Importer
            </button>
          </div>
        )}
      </div>

      {/* Photo grid */}
      {loading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="aspect-square rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse"
            />
          ))}
        </div>
      ) : photos.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="group relative aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700"
            >
              <button onClick={() => setLightboxDoc(photo)} className="w-full h-full">
                {previewUrls[photo.id] ? (
                  <Image
                    src={previewUrls[photo.id]}
                    alt={photo.originalName}
                    fill
                    unoptimized
                    className="object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <svg
                      className="h-6 w-6 text-slate-300"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
                      />
                    </svg>
                  </div>
                )}
              </button>
              {!readOnly && (
                <button
                  onClick={() => handleDelete(photo)}
                  className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  title="Supprimer"
                >
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-[10px] text-white truncate">{photo.originalName}</p>
                <p className="text-[9px] text-white/70">{formatFileSize(photo.size)}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">
          Aucune photo rattachée à cette intervention.
        </p>
      )}

      {uploading && (
        <div className="mt-2 flex items-center gap-2 text-xs text-brand-600 dark:text-brand-400">
          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          Upload en cours…
        </div>
      )}

      {/* Hidden inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileInput}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileInput}
        className="hidden"
      />

      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}

      {/* Lightbox */}
      {lightboxDoc && previewUrls[lightboxDoc.id] && (
        <PhotoLightbox
          doc={lightboxDoc}
          url={previewUrls[lightboxDoc.id]}
          onClose={() => setLightboxDoc(null)}
          onDelete={
            !readOnly ? () => handleDelete(lightboxDoc).then(() => setLightboxDoc(null)) : undefined
          }
        />
      )}
    </div>
  );
}

function PhotoLightbox({
  doc,
  url,
  onClose,
  onDelete,
}: {
  doc: DocumentResponse;
  url: string;
  onClose: () => void;
  onDelete?: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative mx-4 w-full max-w-4xl max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute -top-3 -right-3 z-10 flex gap-2">
          {onDelete && (
            <button
              onClick={onDelete}
              className="w-8 h-8 rounded-full bg-red-600 shadow-lg flex items-center justify-center text-white hover:bg-red-700 transition-colors"
              title="Supprimer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          )}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 shadow-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-red-500 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="relative h-[85vh] w-full">
          <Image
            src={url}
            alt={doc.originalName}
            fill
            unoptimized
            className="rounded-lg bg-black object-contain shadow-2xl"
          />
        </div>
        <p className="mt-2 text-center text-sm text-white/80">
          {doc.originalName} • {formatFileSize(doc.size)}
        </p>
      </div>
    </div>
  );
}
