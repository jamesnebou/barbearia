"use client";

import { ArrowRight } from "lucide-react";
import { trackMarketingEvent } from "./conversion-tracker";

export function PlanCta({ plan, featured = false }) {
  function choosePlan() {
    try {
      window.localStorage.setItem("nexawi_selected_plan", plan);
    } catch {}
    window.dispatchEvent(new CustomEvent("nexawi:plan-selected", { detail: plan }));
    trackMarketingEvent("pricing_click", { plan });
  }

  return (
    <a
      href="#contato"
      onClick={choosePlan}
      className={`mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-black transition hover:-translate-y-0.5 ${featured ? "bg-[#ed7009] text-white shadow-[0_18px_42px_rgba(237,112,9,0.28)]" : "bg-[#1c1c1c] text-white"}`}
    >
      Quero este plano <ArrowRight size={16} />
    </a>
  );
}
