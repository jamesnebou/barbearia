"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createBarbershopAction } from "./actions";

const initialState = { ok: true, message: "" };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className="h-12 rounded-xl bg-[#1c1c1c] px-5 text-sm font-black text-white transition hover:bg-[#1f6dee] disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={pending}>
      {pending ? "Criando barbearia..." : "Criar barbearia"}
    </button>
  );
}

export default function BarbershopForm({ userEmail }) {
  const [state, formAction] = useActionState(createBarbershopAction, initialState);

  return (
    <form action={formAction} className="mt-7 grid gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-[0_22px_70px_rgba(28,28,28,0.10)] sm:p-7">
      <label className="block">
        <span className="text-sm font-bold text-neutral-700">Nome da barbearia</span>
        <input className="mt-2 h-12 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none transition focus:border-[#1f6dee]" name="nome" required placeholder="Ex.: Barbearia Prime" />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-bold text-neutral-700">Identificador do site</span>
          <input className="mt-2 h-12 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none transition focus:border-[#1f6dee]" name="slug" placeholder="barbearia-prime" />
        </label>
        <label className="block">
          <span className="text-sm font-bold text-neutral-700">CNPJ/CPF</span>
          <input className="mt-2 h-12 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none transition focus:border-[#1f6dee]" name="documento" />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-bold text-neutral-700">E-mail</span>
          <input className="mt-2 h-12 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none transition focus:border-[#1f6dee]" name="email" type="email" defaultValue={userEmail || ""} />
        </label>
        <label className="block">
          <span className="text-sm font-bold text-neutral-700">Telefone/WhatsApp</span>
          <input className="mt-2 h-12 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none transition focus:border-[#1f6dee]" name="telefone" />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
        <label className="block">
          <span className="text-sm font-bold text-neutral-700">Cidade</span>
          <input className="mt-2 h-12 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none transition focus:border-[#1f6dee]" name="cidade" />
        </label>
        <label className="block">
          <span className="text-sm font-bold text-neutral-700">UF</span>
          <input className="mt-2 h-12 w-full rounded-xl border border-neutral-200 px-3 text-sm uppercase outline-none transition focus:border-[#1f6dee]" name="estado" maxLength={2} />
        </label>
      </div>

      {!state?.ok && state?.message ? <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{state.message}</p> : null}
      <SubmitButton />
    </form>
  );
}
