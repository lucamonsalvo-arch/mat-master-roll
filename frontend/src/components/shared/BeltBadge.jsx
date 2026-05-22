const BELT_PT = {
  blanco: 'Branca',
  azul:   'Azul',
  morado: 'Roxa',
  marron: 'Marrom',
  negro:  'Preta',
};

const BELT_BG = {
  blanco: '#e5e7eb',
  azul:   '#2563eb',
  morado: '#9333ea',
  marron: '#92400e',
  negro:  '#111111',
};

const STRIPE_COLOR = {
  blanco: '#6b7280',
  azul:   '#ffffff',
  morado: '#ffffff',
  marron: '#ffffff',
  negro:  '#ef4444',
};

const LABEL_COLOR = {
  blanco: 'text-gray-300',
  azul:   'text-blue-400',
  morado: 'text-purple-400',
  marron: 'text-amber-600',
  negro:  'text-gray-300',
};

export default function BeltBadge({ belt = 'blanco', stripe = 0 }) {
  const bg     = BELT_BG[belt]     || BELT_BG.blanco;
  const sc     = STRIPE_COLOR[belt] || '#ffffff';
  const label  = LABEL_COLOR[belt]  || 'text-gray-300';

  return (
    <div className="inline-flex items-center gap-1.5">
      {/* Belt bar */}
      <div className="relative rounded-sm overflow-hidden" style={{ width: 52, height: 12, backgroundColor: bg, border: '1px solid rgba(255,255,255,0.1)' }}>
        {/* Stripe marks on right end */}
        {stripe > 0 && (
          <div className="absolute right-1 top-0 bottom-0 flex items-stretch gap-px">
            {Array.from({ length: stripe }).map((_, i) => (
              <div key={i} style={{ width: 4, backgroundColor: sc, opacity: 0.9 }} />
            ))}
          </div>
        )}
      </div>
      {/* Label */}
      <span className={`text-xs font-semibold ${label}`}>{BELT_PT[belt] || belt}</span>
    </div>
  );
}
