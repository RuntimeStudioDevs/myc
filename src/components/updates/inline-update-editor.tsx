"use client";

import { useState } from "react";

interface InlineUpdateEditorProps {
  updateId: string;
  initialTitle: string;
  initialDescription: string | null;
  canEdit: boolean;
  editAction: (formData: FormData) => Promise<void>;
}

export function InlineUpdateEditor({
  updateId,
  initialTitle,
  initialDescription,
  canEdit,
  editAction,
}: InlineUpdateEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription ?? "");

  const handleEdit = () => {
    setTitle(initialTitle);
    setDescription(initialDescription ?? "");
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setTitle(initialTitle);
    setDescription(initialDescription ?? "");
  };

  return (
    <div>
      {!isEditing ? (
        <div>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-medium text-sm">{initialTitle}</h3>
            </div>
            {canEdit && (
              <button
                type="button"
                onClick={handleEdit}
                className="text-xs text-neutral-400 hover:text-neutral-700 underline shrink-0"
              >
                Editar
              </button>
            )}
          </div>
          {initialDescription && (
            <p className="text-sm text-neutral-600 mt-1">
              {initialDescription}
            </p>
          )}
        </div>
      ) : (
        <form action={editAction} className="space-y-2">
          <input type="hidden" name="updateId" value={updateId} />
          <input
            name="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full rounded border border-neutral-300 px-2 py-1 text-xs"
          />
          <textarea
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded border border-neutral-300 px-2 py-1 text-xs resize-none"
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={
                !title.trim() ||
                (title === initialTitle && description === (initialDescription ?? ""))
              }
              className="rounded bg-neutral-900 px-2 py-1 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-40"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="rounded border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
