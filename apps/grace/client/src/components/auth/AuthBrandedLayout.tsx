import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';

export type AuthPanelItem = {
  icon: LucideIcon;
  label: string;
};

type AuthBrandedLayoutProps = {
  children: ReactNode;
  /** Sous-marque à côté de GSMS (ex. Grace). */
  product?: string;
  eyebrow: string;
  titleLead: string;
  titleEmph: string;
  body: string;
  items: AuthPanelItem[];
  siteHref?: string;
  controls?: ReactNode;
};

/** Pattern auth GSMS (apps/web) — split form + panneau #111721. */
export function AuthBrandedLayout({
  children,
  product,
  eyebrow,
  titleLead,
  titleEmph,
  body,
  items,
  siteHref = 'https://gsms-security.com',
  controls,
}: AuthBrandedLayoutProps) {
  return (
    <div className="grid min-h-svh w-full grow bg-background lg:grid-cols-2">
      <div className="order-2 flex flex-col lg:order-1">
        <header className="flex h-14 items-center justify-between border-b border-border/70 px-4 sm:px-6 lg:hidden">
          <BrandMark product={product} />
          {controls}
        </header>

        <div className="relative flex flex-1 items-center justify-center p-5 sm:p-8 lg:p-10">
          <div className="absolute end-6 top-6 hidden items-center gap-2 lg:flex">
            <a
              href={siteHref}
              className="text-[13px] text-muted-foreground no-underline hover:text-foreground"
            >
              Retour au site
            </a>
            {controls}
          </div>
          <div className="w-full max-w-[420px] rounded-2xl border border-border/70 bg-card p-6 shadow-[0_1px_2px_rgba(20,18,30,0.03),0_12px_32px_rgba(20,18,30,0.035)] sm:p-7">
            {children}
          </div>
        </div>
      </div>

      <aside
        aria-label="GSMS"
        className="order-1 flex flex-col overflow-hidden bg-[#111721] text-white lg:order-2 lg:m-5 lg:rounded-[28px] lg:border lg:border-white/10"
      >
        <div className="flex flex-col gap-5 p-8 lg:px-12 lg:pb-6 lg:pt-12">
          <div className="hidden lg:block">
            <BrandMark product={product} inverted />
          </div>
          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">
              {eyebrow}
            </p>
            <h2 className="text-balance text-2xl font-semibold tracking-[-0.035em] md:text-[30px]/[1.15]">
              {titleLead}{' '}
              <span className="font-serif font-normal italic text-white/60">{titleEmph}</span>
            </h2>
            <p className="max-w-md text-sm leading-6 text-white/60">{body}</p>
          </div>
        </div>

        <ul className="relative mt-auto hidden flex-1 flex-col justify-end gap-3 px-8 pb-8 sm:flex lg:px-12 lg:pb-12">
          {items.map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3"
            >
              <span className="grid size-9 place-items-center rounded-xl bg-white/10">
                <Icon className="size-4" strokeWidth={2} aria-hidden />
              </span>
              <span className="text-sm font-medium text-white/85">{label}</span>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className ?? 'size-[17px]'}>
      <path
        d="M12 2.5 4 5.6v6.1c0 4.6 3.2 8.6 8 9.8 4.8-1.2 8-5.2 8-9.8V5.6L12 2.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="m8.5 12 2.4 2.4 4.6-4.8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BrandMark({
  product,
  inverted,
}: {
  product?: string;
  inverted?: boolean;
}) {
  return (
    <Link to="/" className="inline-flex items-center gap-2.5 no-underline text-inherit">
      <span
        className={
          inverted
            ? 'grid size-8 place-items-center rounded-[10px] bg-white text-[#111721] shadow-sm'
            : 'grid size-8 place-items-center rounded-[10px] bg-foreground text-background shadow-sm'
        }
      >
        <LogoMark />
      </span>
      <span className="text-[15px] font-semibold tracking-[-0.025em]">
        GSMS
        {product ? (
          <span className={inverted ? 'text-white/55' : 'text-muted-foreground'}>
            {' '}
            {product}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
