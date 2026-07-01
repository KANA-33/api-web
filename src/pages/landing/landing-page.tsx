import { useGSAP } from "@gsap/react";
import { Link } from "@tanstack/react-router";
import gsap from "gsap";
import { ArrowRight } from "lucide-react";
import { useEffect, useRef, type CSSProperties } from "react";
import { useAuthStore } from "@features/auth/store";
import { usePlatformStore } from "@features/platform/store";
import { PlatformBrandHeader, PlatformBrandHero } from "@shared/ui/platform-brand";
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
  const platformStatus = usePlatformStore((state) => state.status);
  const loadPlatform = usePlatformStore((state) => state.load);

  useEffect(() => {
    void loadPlatform(true);
  }, [loadPlatform]);

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
          <div className="flex origin-left scale-80 items-center">
        <Link
          className="group flex min-w-0 items-center gap-3 rounded-xl px-2 py-2 text-[#111111] transition-colors hover:bg-[#eee8e1]"
          to="/"
        >
          <PlatformBrandHeader status={platformStatus} />
        </Link>
          </div>
        <div className="flex origin-right scale-80 items-center">
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
              <div data-animate="brand-mark">
                <PlatformBrandHero status={platformStatus} />
              </div>
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
