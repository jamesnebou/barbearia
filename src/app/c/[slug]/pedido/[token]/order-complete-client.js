"use client";

import { useEffect } from "react";

export function ClearPurchasedCart({ slug }) {
  useEffect(() => {
    window.localStorage.removeItem(`barbearia_cart_${slug}`);
  }, [slug]);
  return null;
}
