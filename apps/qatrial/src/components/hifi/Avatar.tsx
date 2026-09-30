interface AvatarProps {
  name: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

const SIZES = {
  sm: 'w-5 h-5 text-[9.5px]',
  md: 'w-7 h-7 text-hifi-meta',
  lg: 'w-9 h-9 text-hifi-title',
  xl: 'w-20 h-20 text-[22px]',
} as const;

export function Avatar({ name, src, size = 'md' }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`inline-block rounded-full bg-a-100 object-cover ${SIZES[size]}`}
      />
    );
  }

  return (
    <span
      aria-label={name}
      className={`inline-flex items-center justify-center rounded-full bg-a-100 font-semibold text-a-700 ${SIZES[size]}`}
    >
      {initials(name) || '?'}
    </span>
  );
}
