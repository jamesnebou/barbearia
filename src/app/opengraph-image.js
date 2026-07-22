import { ImageResponse } from "next/og";

export const alt = "NexaWi Barbearias — cadeira ocupada, gestão no controle";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "80px", color: "white", background: "radial-gradient(circle at 15% 10%, #7a3210 0, #1c1c1c 42%, #090909 100%)" }}>
      <div style={{ display: "flex", alignItems: "center", color: "#ff9a45", fontSize: 28, fontWeight: 800, letterSpacing: 5 }}>NEXAWI BARBEARIAS</div>
      <div style={{ display: "flex", maxWidth: 980, marginTop: 30, fontSize: 72, lineHeight: 1.05, fontWeight: 900 }}>Cadeira ocupada. Gestão no controle.</div>
      <div style={{ display: "flex", maxWidth: 900, marginTop: 28, fontSize: 30, color: "rgba(255,255,255,.68)" }}>Agenda, sinal, CRM, financeiro e site premium em um único fluxo.</div>
    </div>,
    size
  );
}
