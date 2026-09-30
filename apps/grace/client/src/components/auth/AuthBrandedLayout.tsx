import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';

type AuthBrandedLayoutProps = {
  children: ReactNode;
  /** Short product name in chrome */
  brandName: string;
  /** Panel headline (right column desktop) */
  panelTitle: string;
  /** Panel supporting lines */
  panelBody: ReactNode;
  /** Single letter / short mark in the gradient tile */
  mark?: string;
  /** Theme / locale controls (top-right of form column) */
  controls?: ReactNode;
  homeHref?: string;
};

/**
 * Metronic-style branded auth shell (same pattern as InvoicePilot AuthBrandedLayout).
 * Split: form card left · brand panel right. Tokens = Grace design system.
 */
export function AuthBrandedLayout({
  children,
  brandName,
  panelTitle,
  panelBody,
  mark = 'G',
  controls,
  homeHref = '/',
}: AuthBrandedLayoutProps) {
  return (
    <div className="grid min-h-screen w-full grow bg-background lg:grid-cols-2">
      {/* Form column */}
      <div className="order-2 flex flex-col lg:order-1">
        <div className="flex h-14 items-center justify-between border-b border-border px-4 sm:px-6 lg:hidden">
          <BrandMark name={brandName} mark={mark} href={homeHref} />
          {controls}
        </div>

        <div className="relative flex flex-1 items-center justify-center p-6 sm:p-8 lg:p-10">
          {controls ? (
            <div className="absolute end-6 top-6 hidden rounded-r2 border border-border bg-card px-0.5 py-0.5 shadow-sh1 lg:block">
              {controls}
            </div>
          ) : null}
          <div className="w-full max-w-[400px] rounded-r4 border border-border bg-card p-6 shadow-sh2">
            {children}
          </div>
        </div>
      </div>

      {/* Brand panel */}
      <div className="order-1 flex flex-col overflow-hidden bg-muted lg:order-2 lg:m-5 lg:rounded-r4 lg:border lg:border-border">
        <div className="flex flex-col gap-4 p-8 lg:px-12 lg:pb-6 lg:pt-12">
          <div className="hidden w-fit lg:block">
            <BrandMark name={brandName} mark={mark} href={homeHref} />
          </div>
          <div className="flex flex-col gap-3">
            <h2 className="text-2xl font-semibold tracking-[-0.02em] text-foreground">
              {panelTitle}
            </h2>
            <div className="text-[15px] font-medium leading-relaxed text-muted-foreground">
              {panelBody}
            </div>
          </div>
        </div>

        <div className="relative flex flex-1 items-end justify-center px-6 pb-8 sm:px-10 lg:pb-10">
          <AuthHeroArt mark={mark} />
        </div>
      </div>
    </div>
  );
}

function BrandMark({
  name,
  mark,
  href,
}: {
  name: string;
  mark: string;
  href: string;
}) {
  return (
    <Link to={href} className="inline-flex items-center gap-2.5 no-underline">
      <span
        className="flex size-7 shrink-0 items-center justify-center rounded-[4px] text-[12px] font-bold text-white"
        style={{ background: 'linear-gradient(135deg, #4f56e5 0%, #3436a4 100%)' }}
      >
        {mark}
      </span>
      <span className="text-[14px] font-semibold tracking-[-0.2px] text-foreground">{name}</span>
    </Link>
  );
}

/** Decorative stand-in for Metronic auth-screen.png — same indigo family. */
function AuthHeroArt({ mark }: { mark: string }) {
  return (
    <div
      className="relative w-full max-w-[480px] overflow-hidden rounded-r4 border border-border shadow-sh2"
      style={{
        aspectRatio: '4 / 3',
        background:
          'linear-gradient(145deg, var(--a-50) 0%, var(--card) 42%, var(--a-100) 100%)',
      }}
    >
      <div
        className="absolute -right-10 -top-10 size-40 rounded-full opacity-40"
        style={{ background: 'radial-gradient(circle, var(--a-300), transparent 70%)' }}
      />
      <div
        className="absolute -bottom-8 -left-8 size-48 rounded-full opacity-30"
        style={{ background: 'radial-gradient(circle, var(--a-400), transparent 70%)' }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8">
        <span
          className="flex size-16 items-center justify-center rounded-r3 text-[28px] font-bold text-white shadow-sh2"
          style={{ background: 'linear-gradient(135deg, #4f56e5 0%, #3436a4 100%)' }}
        >
          {mark}
        </span>
        <div className="h-2 w-32 rounded-full bg-a-200/80" />
        <div className="h-2 w-24 rounded-full bg-n-200/80" />
        <div className="mt-4 grid w-full max-w-[280px] grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-16 rounded-r2 border border-border/80 bg-card/80 shadow-sh1"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
