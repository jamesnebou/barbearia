import "./globals.css";
import { Poppins } from "next/font/google";
import { MarketingPixels } from "@/components/marketing/marketing-pixels";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://barbearia.nexawi.com.br"),
  title: {
    default: "NexaWi Barbearias | Cadeira ocupada, gestão no controle",
    template: "%s | NexaWi Barbearias",
  },
  description: "Agenda, sinal online, CRM, clientes, comissões, financeiro e site premium no mesmo fluxo para sua barbearia crescer.",
  applicationName: "NexaWi Barbearias",
  keywords: ["sistema para barbearia", "agenda para barbearia", "gestão de barbearia", "CRM para barbearia", "site para barbearia"],
  authors: [{ name: "NexaWi" }],
  creator: "NexaWi",
  publisher: "NexaWi",
  category: "business",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className={poppins.variable}>
      <body>{children}<MarketingPixels /></body>
    </html>
  );
}
