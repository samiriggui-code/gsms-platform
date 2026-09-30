/**
 * Couche `hifi` — surfaces et primitives visuelles.
 *
 * Portage du pattern de `apps/grace/client/src/components/hifi/`. COPIE, pas
 * dépendance : aucun import ne traverse les deux apps, elles restent
 * indépendantes. Les valeurs viennent des tokens `n-*` / `a-*` / `r-*` ajoutés
 * dans `src/index.css`, alignés sur `tokens.css` de Grace.
 *
 * Différence avec l'original : Grace écrit ses tailles en dur
 * (`text-[13.5px]`, `px-[14px]`) ; ici tout passe par des tokens, pour que la
 * densité reste pilotable depuis un seul fichier.
 */
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Liseré d'accent à gauche, pour signaler l'élément courant ou actif. */
  accent?: boolean;
  children: ReactNode;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ accent, className = '', children, ...rest }, ref) => (
    <div
      ref={ref}
      className={[
        'bg-card border border-border rounded-r3 shadow-sh1',
        accent ? 'border-l-[3px] border-l-a-500' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </div>
  ),
);
Card.displayName = 'Card';
