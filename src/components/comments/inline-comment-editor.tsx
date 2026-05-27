"use client";

import { useState } from "react";

interface InlineCommentEditorProps {
  commentId: string;
  initialContent: string;
  canEdit: boolean;
  editAction: (formData: FormData) => Promise<void>;
  returnTo?: string;
  maxLength?: number;
}

export function InlineCommentEditor({
  commentId,
  initialContent,
  canEdit,
  editAction,
  returnTo,
  maxLength = 2000,
}: InlineCommentEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(initialContent);

  const handleEdit = () => {
    setContent(initialContent);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setContent(initialContent);
  };

  if (!isEditing) {
    return (
      <div>
        <p className="text-xs text-neutral-600 whitespace-pre-wrap break-words">
          {initialContent}
        </p>
        {canEdit && (
          <button
            type="button"
            onClick={handleEdit}
            className="text-xs text-neutral-400 hover:text-neutral-700 underline"
          >
            Editar
          </button>
        )}
      </div>
    );
  }

  return (
    <form action={editAction} className="space-y-1.5">
      <input type="hidden" name="commentId" value={commentId} />
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
      <textarea
        name="content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={maxLength}
        rows={3}
        className="w-full rounded border border-neutral-300 px-2 py-1 text-xs resize-none"
      />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={!content.trim() || content === initialContent}
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
        <span className="text-xs text-neutral-400">
          {content.length}/{maxLength}
        </span>
      </div>
    </form>
  );
}
