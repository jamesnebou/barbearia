import { redirect } from "next/navigation";

export const metadata = {
  title: "Demo NexaWi Barbearias",
  description: "Acesse a demonstração real do dashboard NexaWi Barbearias.",
};

export default function DemoPage() {
  redirect("/login-cliente?demo=1");
}
