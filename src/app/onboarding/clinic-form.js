"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createClinicAction } from "./actions";

const initialState = { ok: true, message: "" };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="h-11 rounded-lg bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
      type="submit"
      disabled={pending}
    >
      {pending ? "Criando clínica..." : "Criar clínica"}
    </button>
  );
}

export default function ClinicForm({ userEmail }) {
  const [state, formAction] = useActionState(createClinicAction, initialState);

  return (
    <form action={formAction} className="mt-6 grid gap-4 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
      <label className="block">
        <span className="text-sm font-medium text-neutral-700">Nome da clínica</span>
        <input className="mt-2 h-11 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-emerald-600" name="nome" required placeholder="Ex: Clínica Bella Skin" />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-neutral-700">Identificador</span>
          <input className="mt-2 h-11 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-emerald-600" name="slug" placeholder="clinica-bella-skin" />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-neutral-700">CNPJ/CPF</span>
          <input className="mt-2 h-11 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-emerald-600" name="documento" />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-neutral-700">E-mail</span>
          <input className="mt-2 h-11 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-emerald-600" name="email" type="email" defaultValue={userEmail || ""} />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-neutral-700">Telefone</span>
          <input className="mt-2 h-11 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-emerald-600" name="telefone" />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
        <label className="block">
          <span className="text-sm font-medium text-neutral-700">Cidade</span>
          <input className="mt-2 h-11 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-emerald-600" name="cidade" />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-neutral-700">UF</span>
          <input className="mt-2 h-11 w-full rounded-lg border border-neutral-200 px-3 text-sm uppercase outline-none focus:border-emerald-600" name="estado" maxLength={2} />
        </label>
      </div>

      {!state?.ok && state?.message ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{state.message}</p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
