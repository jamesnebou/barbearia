"use client";

import { Trash2 } from "lucide-react";
import { deleteTutorialAction } from "@/app/admin/actions";

export function DeleteTutorialButton({ id, title }) {
  return (
    <form action={deleteTutorialAction} onSubmit={(event) => { if (!window.confirm(`Excluir permanentemente o tutorial “${title}”?`)) event.preventDefault(); }}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-bold text-red-700 transition hover:bg-red-100">
        <Trash2 size={16} /> Excluir tutorial
      </button>
    </form>
  );
}
