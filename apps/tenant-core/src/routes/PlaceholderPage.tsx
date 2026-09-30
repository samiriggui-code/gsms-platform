export function PlaceholderPage({
  title: _title,
  hint: _hint,
}: {
  title: string;
  hint: string;
}) {
  return (
    <div className="surface-card flex min-h-[240px] items-center justify-center p-8 text-sm text-[hsl(var(--muted-foreground))]">
      Contenu à brancher
    </div>
  );
}
