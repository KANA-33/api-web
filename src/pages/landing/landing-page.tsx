import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { CSSProperties } from "react";

const dotGridStyle = {
  backgroundImage: "radial-gradient(circle, rgb(239 235 229 / 0.62) 1px, transparent 1px)",
  backgroundSize: "34px 34px",
} satisfies CSSProperties;

const landingMetalStyle = {
  background:
    "radial-gradient(circle at 20% 12%, rgb(255 250 243 / 0.18), transparent 24rem), repeating-linear-gradient(100deg, rgb(255 250 243 / 0.05) 0, rgb(255 250 243 / 0.05) 1px, transparent 1px, transparent 10px), linear-gradient(135deg, #151310 0%, #2a2520 42%, #181512 100%)",
} satisfies CSSProperties;

export function LandingPage() {
  return (
    <main className="min-h-[100dvh] overflow-hidden text-[#ffffff]" style={landingMetalStyle}>
      <header className="grid h-20 grid-cols-3 items-center border-b border-[#efe7dc]/32 bg-[#151310]/38 px-5 backdrop-blur-xl sm:px-9 lg:px-14">
        <div aria-hidden="true" />
        <a
          className="justify-self-center text-sm font-semibold text-[#d7cec3] transition-colors hover:text-[#fffaf3] sm:text-base"
          href="#pricing"
        >
          Pricing
        </a>
        <Link
          className="justify-self-end whitespace-nowrap text-sm font-bold uppercase text-[#fffaf3] transition-colors hover:text-[#d7cec3] sm:text-base"
          to="/login"
        >
          Login
        </Link>
      </header>

      <section
        className="relative mx-auto min-h-[calc(100dvh-5rem)] max-w-[calc(100vw-2rem)] border-x border-b border-[#efe7dc]/36 sm:max-w-[calc(100vw-4.5rem)]"
        id="pricing"
        style={dotGridStyle}
      >
        <div className="pointer-events-none absolute inset-5 rounded-[24px] border border-[#efe7dc]/28 sm:inset-8" />
        <div className="pointer-events-none absolute inset-x-5 top-5 border-t border-[#fffaf3]/42 sm:inset-x-8 sm:top-8" />
        <div className="pointer-events-none absolute inset-x-5 bottom-5 border-b border-[#fffaf3]/42 sm:inset-x-8 sm:bottom-8" />

        <div className="relative z-10 flex min-h-[calc(100dvh-5rem)] flex-col items-center justify-center px-6 py-20 text-center">
          <div className="mx-auto w-full max-w-5xl">
            <h1 className="text-6xl font-semibold leading-none tracking-[-0.035em] text-[#fffaf3] sm:text-7xl lg:text-8xl">
              AI Models
            </h1>
            <p className="mx-auto mt-8 max-w-4xl text-xl font-medium leading-8 text-[#d7cec3] text-pretty sm:text-2xl sm:leading-9 lg:text-3xl lg:leading-10">
              Access a vast selection of models via a standard, unified API protocol.
              <br className="hidden md:block" />
              Power AI applications, manage digital assets, and connect the Future.
            </p>

            <div className="mt-14 flex flex-col items-center justify-center gap-6 sm:flex-row sm:gap-10">
              <Link
                className="group grid grid-cols-[auto_auto] items-center gap-7 text-left text-lg font-bold text-[#fffaf3] transition-colors hover:text-[#d7cec3] sm:text-xl"
                to="/overview"
              >
                <span className="leading-tight">
                  Go to
                  <br />
                  Dashboard
                </span>
                <ArrowRight
                  className="size-8 transition-transform group-hover:translate-x-2"
                  strokeWidth={2.5}
                />
              </Link>

              <Link
                aria-label="Open dashboard"
                className="h-16 w-52 rounded-[20px] border-2 border-[#fffaf3]/72 bg-[#fffaf3]/[0.04] shadow-[inset_0_1px_0_rgb(255_250_243_/_0.2),0_18px_48px_rgb(0_0_0_/_0.16)] transition-all hover:border-[#d7cec3] hover:bg-[#fffaf3]/10 focus:outline-none focus:ring-2 focus:ring-[#fffaf3]/70 focus:ring-offset-4 focus:ring-offset-[#181512]"
                to="/overview"
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
