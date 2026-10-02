import { CLOSING } from "@/lib/copy/landing";
import { MissionCta } from "./mission-cta";
import { Eyebrow } from "./section-heading";

export function ClosingCta({
  title = CLOSING.title,
  lede = CLOSING.lede,
  eyebrow = CLOSING.eyebrow,
}: {
  title?: string;
  lede?: string;
  eyebrow?: string;
}) {
  return (
    <section aria-labelledby="closing-title" className="relative flex w-full flex-col items-center px-5 pt-20 pb-20 sm:px-6 md:pt-28">
      <div className="relative flex w-full max-w-6xl flex-col items-center gap-6 overflow-clip rounded-[28px] bg-ink px-6 py-16 text-center text-ink-foreground md:px-12 md:py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-[radial-gradient(ellipse_50%_100%_at_50%_100%,rgb(26_125_245/0.28),transparent_70%)]"
        />
        <Eyebrow className="relative text-white/60">{eyebrow}</Eyebrow>
        <h2 id="closing-title" className="relative max-w-[760px] text-balance text-[clamp(32px,4.2vw,52px)]/[1.04] font-[650] tracking-[-0.045em]">
          {title}
        </h2>
        <p className="relative max-w-[560px] text-pretty text-[17px]/[1.65] text-white/65">{lede}</p>
        <div className="relative flex flex-wrap items-center justify-center gap-3 pt-2">
          <MissionCta kind="audit" cta="closing" variant="onInk" arrow />
          <MissionCta kind="contact" cta="closing" variant="outline" className="border-white/20 bg-transparent text-white hover:border-white/40 hover:bg-white/5" />
        </div>
      </div>
    </section>
  );
}
