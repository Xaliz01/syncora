"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { DocumentEntityType, DocumentResponse } from "@syncora/shared";
import * as documentsApi from "@/lib/documents.api";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

const FILE_ICONS: Record<string, string> = {
  "application/pdf": "📄",
  "image/": "🖼️",
  "video/": "🎬",
  "audio/": "🎵",
  "text/": "📝",
  "application/zip": "📦",
  "application/x-rar": "📦"
};

function getFileIcon(mimeType: string): string {
  for (const [prefix, icon] of Object.entries(FILE_ICONS)) {
    if (mimeType.startsWith(prefix)) return icon;
  }
  return "📎";
}

function isImage(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

interface Props {
  entityType: DocumentEntityType;
  entityId: string;
}

export function DocumentUploadZone({ entityType, entityId }: Props) {
  const [documents, setDocuments] = useState<DocumentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [previewDoc, setPreviewDoc] = useState<DocumentResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const docs = await documentsApi.listDocuments(entityType, entityId);
      setDocuments(docs);
      setError(null);

      const imageDocs = docs.filter((d) => isImage(d.mimeType));
      const urls: Record<string, string> = {};
      await Promise.all(
        imageDocs.map(async (doc) => {
          try {
            urls[doc.id] = await documentsApi.getDocumentDownloadUrl(doc.id);
          } catch { /* ignore preview failures */ }
        })
      );
      setPreviewUrls(urls);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleUpload = async (files: FileList | File[]) => {
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        await documentsApi.uploadDocument(entityType, entityId, file);
      }
      await loadDocuments();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUpload(e.target.files);
      e.target.value = "";
    }
  };

  const handleDownload = async (doc: DocumentResponse) => {
    try {
      const url = await documentsApi.getDocumentDownloadUrl(doc.id);
      window.open(url, "_blank");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleDelete = async (doc: DocumentResponse) => {
    if (!confirm(`Supprimer "${doc.originalName}" ?`)) return;
    try {
      await documentsApi.deleteDocument(doc.id);
      await loadDocuments();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="mt-8 border-t border-slate-200 dark:border-slate-700 pt-6">
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
        Documents
      </h3>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer
          transition-all duration-200
          ${dragOver
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
            : "border-slate-300 dark:border-slate-600 hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
          }
          ${uploading ? "opacity-60 pointer-events-none" : ""}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileInput}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-2">
          <svg
            className={`w-8 h-8 ${dragOver ? "text-blue-500" : "text-slate-400 dark:text-slate-500"}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          {uploading ? (
            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
              Upload en cours...
            </p>
          ) : (
            <>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                <span className="font-medium text-blue-600 dark:text-blue-400">
                  Cliquez pour sélectionner
                </span>{" "}
                ou glissez-déposez vos fichiers ici
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Taille maximale : 50 Mo
              </p>
            </>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {/* Document list */}
      {loading ? (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          Chargement des documents...
        </p>
      ) : documents.length > 0 ? (
        <div className="mt-4 space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              {isImage(doc.mimeType) && previewUrls[doc.id] ? (
                <button
                  onClick={() => setPreviewDoc(doc)}
                  className="flex-shrink-0 rounded overflow-hidden border border-slate-200 dark:border-slate-700 hover:ring-2 hover:ring-blue-400 transition-all"
                  title="Aperçu"
                >
                  <img
                    src={previewUrls[doc.id]}
                    alt={doc.originalName}
                    className="w-12 h-12 object-cover"
                  />
                </button>
              ) : (
                <span className="text-xl flex-shrink-0">{getFileIcon(doc.mimeType)}</span>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                  {doc.originalName}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {formatFileSize(doc.size)} • {formatDate(doc.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {isImage(doc.mimeType) && previewUrls[doc.id] && (
                  <button
                    onClick={() => setPreviewDoc(doc)}
                    className="p-1.5 rounded-md text-slate-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors"
                    title="Aperçu"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => handleDownload(doc)}
                  className="p-1.5 rounded-md text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                  title="Télécharger"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(doc)}
                  className="p-1.5 rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                  title="Supprimer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-400 dark:text-slate-500 text-center">
          Aucun document déposé
        </p>
      )}

      {/* Image preview modal */}
      {previewDoc && previewUrls[previewDoc.id] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setPreviewDoc(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewDoc(null)}
              className="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full bg-white dark:bg-slate-800 shadow-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-red-500 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={previewUrls[previewDoc.id]}
              alt={previewDoc.originalName}
              className="max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain bg-white dark:bg-slate-900"
            />
            <p className="mt-2 text-center text-sm text-white/80">
              {previewDoc.originalName} • {formatFileSize(previewDoc.size)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
