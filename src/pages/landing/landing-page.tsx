import { useGSAP } from "@gsap/react";
import { Link } from "@tanstack/react-router";
import gsap from "gsap";
import { ArrowRight, Sparkles } from "lucide-react";
import { useEffect, useRef, type CSSProperties } from "react";
import { useAuthStore } from "@features/auth/store";
import { UserAvatarMenu } from "@shared/ui/user-avatar-menu";

const landingMetalStyle = {
  background:
    "radial-gradient(circle at 18% 12%, rgb(255 255 255 / 0.95), transparent 22rem), radial-gradient(circle at 78% 20%, rgb(218 211 202 / 0.38), transparent 24rem), linear-gradient(180deg, #fbfaf8 0%, #f0eeeb 100%)",
} satisfies CSSProperties;

gsap.registerPlugin(useGSAP);

export function LandingPage() {
  const rootRef = useRef<HTMLElement>(null);
  const user = useAuthStore((state) => state.user);
  const authStatus = useAuthStore((state) => state.status);
  const refreshUser = useAuthStore((state) => state.refresh);

  useEffect(() => {
    if (authStatus !== "idle" || !localStorage.getItem("commercial_console_user_id")) {
      return;
    }

    void refreshUser();
  }, [authStatus, refreshUser]);

  useGSAP(
    () => {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const primaryCta = rootRef.current?.querySelector("[data-motion='primary-cta']");
      const primaryCtaIcon = rootRef.current?.querySelector("[data-motion='primary-cta-icon']");

      if (reduceMotion) {
        gsap.set("[data-animate]", {
          autoAlpha: 1,
          clearProps: "filter,transform,opacity,visibility",
        });
        return;
      }

      const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });

      gsap.set("[data-animate='nav']", { autoAlpha: 0, y: -10 });
      gsap.set("[data-animate='frame']", { autoAlpha: 0 });
      gsap.set("[data-animate='brand-mark']", {
        autoAlpha: 0,
        filter: "blur(10px)",
        scale: 0.98,
      });
      gsap.set("[data-animate='hero-copy']", {
        autoAlpha: 0,
        filter: "blur(8px)",
        y: 18,
      });
      gsap.set("[data-animate='cta']", {
        autoAlpha: 0,
        scale: 0.98,
        transformOrigin: "50% 50%",
        y: 12,
      });

      timeline
        .to("[data-animate='nav']", {
          autoAlpha: 1,
          duration: 0.6,
          y: 0,
        })
        .to(
          "[data-animate='frame']",
          {
            autoAlpha: 1,
            duration: 0.8,
            stagger: 0.08,
          },
          "-=0.32",
        )
        .to(
          "[data-animate='brand-mark']",
          {
            autoAlpha: 1,
            duration: 0.9,
            filter: "blur(0px)",
            scale: 1,
          },
          "-=0.52",
        )
        .to(
          "[data-animate='hero-copy']",
          {
            autoAlpha: 1,
            duration: 0.78,
            filter: "blur(0px)",
            stagger: 0.11,
            y: 0,
          },
          "-=0.42",
        )
        .to(
          "[data-animate='cta']",
          {
            autoAlpha: 1,
            duration: 0.62,
            scale: 1,
            stagger: 0.08,
            y: 0,
          },
          "-=0.36",
        );

      if (primaryCtaIcon) {
        timeline.to(
          primaryCtaIcon,
          {
            duration: 0.34,
            ease: "power2.out",
            x: 4,
            yoyo: true,
            repeat: 1,
          },
          "-=0.18",
        );
      }

      if (!primaryCta) {
        return;
      }

      const liftPrimaryCta = () => {
        gsap.to(primaryCta, {
          duration: 0.24,
          ease: "power2.out",
          scale: 1.015,
          y: -2,
        });
        if (primaryCtaIcon) {
          gsap.to(primaryCtaIcon, {
            duration: 0.24,
            ease: "power2.out",
            x: 5,
          });
        }
      };
      const settlePrimaryCta = () => {
        gsap.to(primaryCta, {
          duration: 0.32,
          ease: "power2.out",
          scale: 1,
          y: 0,
        });
        if (primaryCtaIcon) {
          gsap.to(primaryCtaIcon, {
            duration: 0.32,
            ease: "power2.out",
            x: 0,
          });
        }
      };

      primaryCta.addEventListener("pointerenter", liftPrimaryCta);
      primaryCta.addEventListener("pointerleave", settlePrimaryCta);
      primaryCta.addEventListener("pointercancel", settlePrimaryCta);

      return () => {
        primaryCta.removeEventListener("pointerenter", liftPrimaryCta);
        primaryCta.removeEventListener("pointerleave", settlePrimaryCta);
        primaryCta.removeEventListener("pointercancel", settlePrimaryCta);
      };
    },
    { scope: rootRef },
  );

  return (
    <main
      className="min-h-[100dvh] overflow-hidden text-[#111111]"
      ref={rootRef}
      style={landingMetalStyle}
    >
      <header
        className="relative z-30 shrink-0 border-b border-[#ddd4ca]/80 bg-[#f8f4ee]/78 backdrop-blur-xl"
        data-animate="nav"
      >
        <div className="flex h-[72px] w-full items-center justify-between gap-4 px-5 md:px-8">
        <Link
          className="group flex min-w-0 items-center gap-3 rounded-xl px-2 py-2 text-[#111111] transition-colors hover:bg-[#eee8e1]"
          to="/"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#211d19] text-[#fffaf3]">
            <Sparkles className="size-4" strokeWidth={2.4} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-lg font-semibold leading-none tracking-[-0.02em] text-[#1f1a16]">
              Test API
            </span>
            <span className="mt-1 hidden text-xs font-semibold text-[#74695f] sm:block">
              v2.4.0-stable
            </span>
          </span>
        </Link>
        <div className="ml-auto flex items-center">
          {user ? (
            <UserAvatarMenu />
          ) : (
            <Link
              className="inline-flex h-10 items-center rounded-lg px-3 text-sm font-semibold uppercase tracking-[0.08em] text-[#2b2621] transition-colors hover:bg-[#eee8e1]"
              to="/login"
            >
              Login
            </Link>
          )}
        </div>
        </div>
      </header>

      <section
        className="relative mx-auto min-h-[calc(100dvh-5rem)] max-w-[calc(100vw-1.5rem)] overflow-hidden sm:max-w-[calc(100vw-4.5rem)]"
        id="pricing"
      >
        <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-7xl flex-col items-center justify-center px-6 py-14 sm:px-10 lg:py-18">
          <div className="flex w-full min-w-0 flex-col items-center">
            <div className="relative mx-auto w-full max-w-[62rem] -translate-y-10 sm:-translate-y-12 lg:-translate-y-16">
              <svg
                aria-label="Test API"
                className="h-auto w-full"
                data-animate="brand-mark"
                role="img"
                viewBox="0 0 800 400"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <mask id="landing-ring-mask">
                    <circle
                      cx="400"
                      cy="200"
                      fill="none"
                      r="120"
                      stroke="white"
                      strokeWidth="40"
                    />
                  </mask>
                </defs>
                <circle
                  cx="400"
                  cy="200"
                  fill="none"
                  r="120"
                  stroke="#020202"
                  strokeWidth="40"
                />
                <text
                  fill="#7f7c78"
                  fontFamily="Hanken Grotesk, Inter, ui-sans-serif, system-ui, sans-serif"
                  fontSize="110"
                  fontWeight="900"
                  letterSpacing="-2"
                  x="460"
                  y="235"
                >
                  API
                </text>
                <text
                  fill="#8b8883"
                  fontFamily="Hanken Grotesk, Inter, ui-sans-serif, system-ui, sans-serif"
                  fontSize="110"
                  fontWeight="900"
                  letterSpacing="-2"
                  mask="url(#landing-ring-mask)"
                  x="460"
                  y="235"
                >
                  API
                </text>
                <text
                  fill="#050505"
                  fontFamily="Hanken Grotesk, Inter, ui-sans-serif, system-ui, sans-serif"
                  fontSize="110"
                  fontWeight="900"
                  letterSpacing="-2"
                  x="120"
                  y="235"
                >
                  TEST
                </text>
                <text
                  fill="#ffffff"
                  fontFamily="Hanken Grotesk, Inter, ui-sans-serif, system-ui, sans-serif"
                  fontSize="110"
                  fontWeight="900"
                  letterSpacing="-2"
                  mask="url(#landing-ring-mask)"
                  x="120"
                  y="235"
                >
                  TEST
                </text>
              </svg>
            </div>

            <div className="mt-2 flex flex-col items-stretch gap-3 sm:mt-4 sm:flex-row sm:items-center lg:mt-6">
              <Link
                className="group inline-flex min-h-13 items-center justify-center gap-4 rounded-xl bg-[#111111] px-6 text-base font-bold !text-white shadow-[0_18px_42px_rgb(83_66_48_/_0.16)] transition-all hover:-translate-y-0.5 hover:bg-[#2a2723] hover:!text-white active:translate-y-px sm:min-w-56"
                data-animate="cta"
                data-motion="primary-cta"
                to="/overview"
              >
                <span>Go to dashboard</span>
                <ArrowRight
                  className="size-5 text-white transition-transform group-hover:translate-x-1"
                  data-motion="primary-cta-icon"
                  strokeWidth={2.5}
                />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
