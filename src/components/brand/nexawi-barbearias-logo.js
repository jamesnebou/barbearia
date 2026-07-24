import Image from "next/image";

export function NexawiBarbeariasLogo({ className = "", priority = false }) {
  return (
    <span
      aria-label="NexaWi Barbearias"
      role="img"
      className={`relative inline-block shrink-0 overflow-hidden ${className}`}
    >
      <Image
        src="/NEXAWI-BARBEARIAS.png"
        alt=""
        aria-hidden="true"
        width={1774}
        height={887}
        priority={priority}
        className="pointer-events-none absolute left-0 top-[-33%] h-auto w-full max-w-none select-none"
      />
    </span>
  );
}
