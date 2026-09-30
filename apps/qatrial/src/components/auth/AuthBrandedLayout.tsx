import type { ReactNode } from 'react';

type AuthBrandedLayoutProps = {
  children: ReactNode;
  brandName: string;
  panelTitle: string;
  panelBody: ReactNode;
  mark?: string;
  controls?: ReactNode;
};

/** Auth shell — palette landing claire (#4f56e5), Inter only. */
export function AuthBrandedLayout({
  children,
  brandName,
  panelTitle,
  panelBody,
  mark = 'Q',
  controls,
}: AuthBrandedLayoutProps) {
  return (
    <div className="grid min-h-screen w-full grow bg-surface-secondary font-sans lg:grid-cols-2">
      <div className="order-2 flex flex-col lg:order-1">
        <div className="flex h-14 items-center justify-between border-b border-border bg-surface-secondary px-4 sm:px-6 lg:hidden">
          <BrandMark name={brandName} mark={mark} />
          {controls}
        </div>

        <div className="relative flex flex-1 items-center justify-center p-6 sm:p-8 lg:p-10">
          {controls ? (
            <div className="absolute end-6 top-6 hidden rounded-r2 border border-border bg-surface px-0.5 py-0.5 shadow-sh1 lg:block">
              {controls}
            </div>
          ) : null}
          <div className="w-full max-w-[400px] rounded-r4 border border-border bg-surface p-6 shadow-sh2">
            {children}
          </div>
        </div>
      </div>

      <div className="order-1 flex flex-col overflow-hidden bg-surface-tertiary lg:order-2 lg:m-5 lg:rounded-r4 lg:border lg:border-border">
        <div className="flex flex-col gap-4 p-8 lg:px-12 lg:pb-6 lg:pt-12">
          <div className="hidden lg:block">
            <BrandMark name={brandName} mark={mark} />
          </div>
          <div className="flex flex-col gap-3">
            <h2 className="text-[22px] font-semibold leading-snug tracking-[-0.02em] text-text-primary lg:text-[24px]">
              {panelTitle}
            </h2>
            <div className="text-[13.5px] font-medium leading-relaxed tracking-[-0.011em] text-text-secondary lg:text-[15px]">
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

function BrandMark({ name, mark }: { name: string; mark: string }) {
  return (
    <div className="inline-flex items-center gap-2.5">
      <span
        className="flex size-7 shrink-0 items-center justify-center rounded-[4px] text-[12px] font-bold text-white"
        style={{ background: 'var(--brand-mark)' }}
      >
        {mark}
      </span>
      <span className="text-[14px] font-semibold tracking-[-0.2px] text-text-primary">{name}</span>
    </div>
  );
}

function AuthHeroArt({ mark }: { mark: string }) {
  return (
    <div
      className="relative flex aspect-[4/3] w-full max-w-md items-center justify-center rounded-r4 border border-border bg-surface shadow-sh2"
      aria-hidden
    >
      <span
        className="flex size-16 items-center justify-center rounded-r3 text-2xl font-bold text-white"
        style={{ background: 'var(--brand-mark)' }}
      >
        {mark}
      </span>
    </div>
  );
}
