const BELT_COLORS = {
  blanco:  'bg-white text-gray-900',
  azul:    'bg-blue-600 text-white',
  morado:  'bg-purple-600 text-white',
  marron:  'bg-amber-800 text-white',
  negro:   'bg-gray-900 text-white border border-gray-600',
};

export default function BeltBadge({ belt = 'blanco', stripe = 0 }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${BELT_COLORS[belt] || BELT_COLORS.blanco}`}>
      {belt}
      {stripe > 0 && <span className="text-yellow-400">{'★'.repeat(stripe)}</span>}
    </span>
  );
}
