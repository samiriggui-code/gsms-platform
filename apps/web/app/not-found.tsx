import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="contenu" className="flex min-h-svh flex-col items-center justify-center gap-5 px-6 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Erreur 404</p>
      <h1 className="text-[clamp(28px,4vw,44px)]/[1.05] font-[650] tracking-[-0.045em]">
        Page introuvable. <span className="font-serif font-normal italic text-muted-foreground">Elle a peut-être changé d&apos;adresse.</span>
      </h1>
      <Link href="/" className={buttonVariants({ variant: "contrast", size: "lg" })}>
        Retour à l&apos;accueil
      </Link>
    </main>
  );
}
