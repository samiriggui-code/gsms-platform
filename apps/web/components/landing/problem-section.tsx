import { Check, X } from "lucide-react";
import { COMPARE, PROBLEM } from "@/lib/copy/landing";
import { Section, SectionHeading } from "./section-heading";

export function ProblemSection() {
  return (
    <Section labelledBy="probleme-title">
      <SectionHeading id="probleme-title" eyebrow={PROBLEM.eyebrow} title={PROBLEM.title} accent={PROBLEM.accent} lede={PROBLEM.lede} />

      <ul className="grid gap-3 md:grid-cols-2">
        {PROBLEM.pains.map((pain, index) => (
          <li key={pain} className="flex gap-4 rounded-[14px] border border-border bg-card p-6 md:p-7">
            <span className="font-mono text-[11px]/6 text-primary">{String(index + 1).padStart(2, "0")}</span>
            <p className="text-[15px]/[1.6] text-muted-foreground">{pain}</p>
          </li>
        ))}
      </ul>

      <p className="max-w-3xl text-pretty text-[clamp(19px,1.8vw,23px)]/[1.5] font-medium tracking-[-0.02em]">{PROBLEM.answer}</p>

      <div className="w-full overflow-x-auto rounded-[20px] border border-border bg-surface-subtle">
        <table className="w-full min-w-[560px] border-collapse text-left">
          <caption className="sr-only">Comparaison : sans accompagnement et avec GSMS</caption>
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="w-1/2 px-6 py-3.5 font-mono text-[11px]/4 font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                {COMPARE.head.them}
              </th>
              <th scope="col" className="w-1/2 border-l border-border bg-primary/[0.05] px-6 py-3.5 font-mono text-[11px]/4 font-semibold uppercase tracking-[0.06em]">
                {COMPARE.head.us}
              </th>
            </tr>
          </thead>
          <tbody>
            {COMPARE.rows.map((row) => (
              <tr key={row.us} className="border-border [&:not(:last-child)]:border-b">
                <td className="px-6 py-4 align-top text-[14px]/[1.5] text-muted-foreground">
                  <span className="flex items-start gap-2.5">
                    <X className="mt-0.5 size-4 shrink-0 opacity-50" aria-hidden />
                    {row.them}
                  </span>
                </td>
                <td className="border-l border-border bg-primary/[0.05] px-6 py-4 align-top text-[14px]/[1.5] font-medium">
                  <span className="flex items-start gap-2.5">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    {row.us}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
