import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { CSSProperties } from "react";

const dotGridStyle = {
  backgroundImage: "radial-gradient(circle, rgb(239 241 243 / 0.82) 1.15px, transparent 1.15px)",
  backgroundSize: "34px 34px",
} satisfies CSSProperties;

const landingMetalStyle = {
  background:
    "radial-gradient(circle at 20% 12%, rgb(255 255 255 / 0.14), transparent 24rem), repeating-linear-gradient(100deg, rgb(255 255 255 / 0.06) 0, rgb(255 255 255 / 0.06) 1px, transparent 1px, transparent 10px), linear-gradient(135deg, #111417 0%, #252a2f 42%, #15181c 100%)",
} satisfies CSSProperties;

export function LandingPage() {
  return (
    <main className="min-h-[100dvh] overflow-hidden text-[#ffffff]" style={landingMetalStyle}>
      <header className="grid h-20 grid-cols-3 items-center border-b border-[#d6dce1]/55 bg-[#121519]/42 px-5 backdrop-blur-xl sm:px-9 lg:px-14">
        <div aria-hidden="true" />
        <a
          className="justify-self-center text-sm font-semibold text-[#c2c9cf] transition-colors hover:text-[#ffffff] sm:text-base"
          href="#pricing"
        >
          Pricing
        </a>
        <Link
          className="justify-self-end whitespace-nowrap text-sm font-bold uppercase text-[#ffffff] transition-colors hover:text-[#c2c9cf] sm:text-base"
          to="/login"
        >
          Login
        </Link>
      </header>

      <section
        className="relative mx-auto min-h-[calc(100dvh-5rem)] max-w-[calc(100vw-2rem)] border-x border-b border-[#d6dce1]/62 sm:max-w-[calc(100vw-4.5rem)]"
        id="pricing"
        style={dotGridStyle}
      >
        <div className="pointer-events-none absolute inset-5 border border-[#d6dce1]/52 sm:inset-8" />
        <div className="pointer-events-none absolute inset-x-5 top-5 border-t border-[#ffffff]/65 sm:inset-x-8 sm:top-8" />
        <div className="pointer-events-none absolute inset-x-5 bottom-5 border-b border-[#ffffff]/65 sm:inset-x-8 sm:bottom-8" />

        <div className="relative z-10 flex min-h-[calc(100dvh-5rem)] flex-col items-center justify-center px-6 py-20 text-center">
          <div className="mx-auto w-full max-w-5xl">
            <h1 className="text-6xl font-bold leading-none text-[#efeded] sm:text-7xl lg:text-8xl">
              AI Models
            </h1>
            <p className="mx-auto mt-8 max-w-4xl text-xl font-semibold leading-8 text-[#b9c0c7] sm:text-2xl sm:leading-9 lg:text-3xl lg:leading-10">
              Access a vast selection of models via a standard, unified API protocol.
              <br className="hidden md:block" />
              Power AI applications, manage digital assets, and connect the Future.
            </p>

            <div className="mt-14 flex flex-col items-center justify-center gap-6 sm:flex-row sm:gap-10">
              <Link
                className="group grid grid-cols-[auto_auto] items-center gap-7 text-left text-lg font-bold text-[#ffffff] transition-colors hover:text-[#c2c9cf] sm:text-xl"
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
                className="h-16 w-52 rounded-[18px] border-2 border-[#ffffff]/85 bg-[#ffffff]/[0.03] shadow-[inset_0_1px_0_rgb(255_255_255_/_0.2)] transition-all hover:border-[#c2c9cf] hover:bg-[#ffffff]/10 focus:outline-none focus:ring-2 focus:ring-[#ffffff]/70 focus:ring-offset-4 focus:ring-offset-[#15181c]"
                to="/overview"
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
