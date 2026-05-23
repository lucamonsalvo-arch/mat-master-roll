// Belt data ─────────────────────────────────────────────────────────────────

const KIDS = [
  { id:'k-white',      name:'Blanca',           main:'#f0ede8', type:'solid'           },
  { id:'k-grey-white', name:'Gris / Blanca',    main:'#888888', type:'split-top-white' },
  { id:'k-grey',       name:'Gris',             main:'#888888', type:'solid'           },
  { id:'k-grey-black', name:'Gris / Negra',     main:'#888888', type:'split-top-black' },
  { id:'k-yel-white',  name:'Amarilla / Blanca',main:'#f5c800', type:'split-top-white' },
  { id:'k-yellow',     name:'Amarilla',         main:'#f5c800', type:'solid'           },
  { id:'k-yel-black',  name:'Amarilla / Negra', main:'#f5c800', type:'split-top-black' },
  { id:'k-ora-white',  name:'Naranja / Blanca', main:'#e86c00', type:'split-top-white' },
  { id:'k-orange',     name:'Naranja',          main:'#e86c00', type:'solid'           },
  { id:'k-ora-black',  name:'Naranja / Negra',  main:'#e86c00', type:'split-top-black' },
  { id:'k-grn-white',  name:'Verde / Blanca',   main:'#1a8c3a', type:'split-top-white' },
  { id:'k-green',      name:'Verde',            main:'#1a8c3a', type:'solid'           },
  { id:'k-grn-black',  name:'Verde / Negra',    main:'#1a8c3a', type:'split-top-black' },
];

const ADULTS = [
  { id:'a-white',  name:'Branca', main:'#f0ede8', type:'solid'            },
  { id:'a-blue',   name:'Azul',   main:'#1e5fad', type:'solid'            },
  { id:'a-purple', name:'Roxa',   main:'#6b3fa0', type:'solid'            },
  { id:'a-brown',  name:'Marrom', main:'#7a4a24', type:'solid'            },
  { id:'a-black',  name:'Preta',  main:'#1a1a1a', type:'black', black:true },
];

const ALL_BELTS = [...KIDS, ...ADULTS];

// Adults: selector ID ↔ DB value
const DB_TO_ID = { blanco:'a-white', azul:'a-blue', morado:'a-purple', marron:'a-brown', negro:'a-black' };
const ID_TO_DB = { 'a-white':'blanco', 'a-blue':'azul', 'a-purple':'morado', 'a-brown':'marron', 'a-black':'negro' };

const BLACK_TIPS  = ['#c8102e','#f0ede8','#c8102e','#f0ede8','#c8102e','#f0ede8'];
const BLACK_GRAUS = ['1er grado','2º grado','3er grado','4º grado','5º grado','6º grado'];
const MAX_TIPS    = 4;

export function getBeltObj(belt) {
  const id = DB_TO_ID[belt] || belt;
  return ALL_BELTS.find(b => b.id === id) || ADULTS[0];
}

export function grauLabel(beltObj, tips) {
  if (beltObj.black) return tips === 0 ? 'Preta' : BLACK_GRAUS[tips - 1] || '';
  return tips === 0 ? 'Sin graus' : `${tips} grau${tips > 1 ? 's' : ''}`;
}

// Belt SVG ───────────────────────────────────────────────────────────────────

export function BeltSVG({ belt, tips = 0, width = 100, height = 24 }) {
  const b     = typeof belt === 'string' ? getBeltObj(belt) : belt;
  const tipW  = Math.round(width * 0.22);
  const mainW = width - tipW;
  const half  = Math.round(height / 2);
  const maxT  = b.black ? 6 : MAX_TIPS;
  const slotW = Math.floor((tipW - 4) / maxT);

  const borderCol = b.type === 'split-top-black' ? '#333'
                  : b.black                      ? '#444'
                  : b.main === '#f0ede8'          ? '#ccc'
                  : b.main;

  return (
    <svg width={width} height={height} style={{ display:'block', borderRadius:4, flexShrink:0 }}
      xmlns="http://www.w3.org/2000/svg">
      {/* Belt body */}
      {(b.type === 'split-top-white') && <>
        <rect x={0} y={0} width={mainW} height={half} fill="#f0ede8"/>
        <rect x={0} y={half} width={mainW} height={height - half} fill={b.main}/>
      </>}
      {(b.type === 'split-top-black') && <>
        <rect x={0} y={0} width={mainW} height={half} fill="#1a1a1a"/>
        <rect x={0} y={half} width={mainW} height={height - half} fill={b.main}/>
      </>}
      {(b.type === 'solid' || b.type === 'black') &&
        <rect x={0} y={0} width={mainW} height={height} fill={b.main}/>
      }
      {/* Tip area */}
      <rect x={mainW} y={0} width={tipW} height={height} fill="rgba(0,0,0,0.22)"/>
      {/* Tip stripes */}
      {tips > 0 && Array.from({ length: maxT }, (_, i) => {
        const filled = i < tips;
        const tc     = b.black ? (filled ? BLACK_TIPS[i] : 'transparent') : (filled ? '#f0ede8' : 'transparent');
        const stroke = b.black ? (filled ? 'none' : '#555')               : (filled ? 'none'    : 'rgba(255,255,255,0.25)');
        return (
          <rect key={i} x={mainW + 2 + i * slotW} y={3}
            width={slotW - 1} height={height - 6} rx={1}
            fill={tc} stroke={stroke} strokeWidth={0.5}/>
        );
      })}
      {/* Border */}
      <rect x={0} y={0} width={width} height={height} rx={3} fill="none" stroke={borderCol} strokeWidth={1}/>
    </svg>
  );
}

// BeltDisplay — read-only, for student profile ────────────────────────────────

export function BeltDisplay({ belt, stripe = 0 }) {
  const b = getBeltObj(belt);
  return (
    <div className="flex items-center gap-4 p-4 bg-gray-800 rounded-xl border border-gray-700">
      <BeltSVG belt={b} tips={stripe} width={200} height={42}/>
      <div>
        <p className="text-white font-bold text-base leading-tight">{b.name}</p>
        <p className="text-gray-400 text-sm mt-0.5">{grauLabel(b, stripe)}</p>
      </div>
    </div>
  );
}

// BeltSelector — interactive, for professor modal ─────────────────────────────

function beltToState(belt, stripe) {
  const adultId = DB_TO_ID[belt];
  if (adultId) return { tab:'adults', beltId:adultId, tips: stripe || 0 };
  if (KIDS.some(k => k.id === belt)) return { tab:'kids', beltId:belt, tips: stripe || 0 };
  return { tab:'adults', beltId:'a-white', tips:0 };
}

export default function BeltSelector({ belt = 'blanco', stripe = 0, onChange }) {
  const init = beltToState(belt, stripe);
  const [tab,    setTab]    = React.useState(init.tab);
  const [beltId, setBeltId] = React.useState(init.beltId);
  const [tips,   setTips]   = React.useState(init.tips);

  // Keep in sync if parent resets form
  React.useEffect(() => {
    const s = beltToState(belt, stripe);
    setTab(s.tab); setBeltId(s.beltId); setTips(s.tips);
  }, [belt, stripe]);

  function handleTab(t) {
    const list   = t === 'kids' ? KIDS : ADULTS;
    const newId  = list[0].id;
    const dbBelt = ID_TO_DB[newId] || newId;
    setTab(t); setBeltId(newId); setTips(0);
    onChange?.(dbBelt, 0);
  }

  function handleBelt(id) {
    const dbBelt = ID_TO_DB[id] || id;
    setBeltId(id); setTips(0);
    onChange?.(dbBelt, 0);
  }

  function handleTips(n) {
    const next   = tips === n ? 0 : n;
    const dbBelt = ID_TO_DB[beltId] || beltId;
    setTips(next);
    onChange?.(dbBelt, next);
  }

  const list    = tab === 'kids' ? KIDS : ADULTS;
  const beltObj = ALL_BELTS.find(b => b.id === beltId) || list[0];
  const maxT    = beltObj.black ? 6 : MAX_TIPS;

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2">
        {[['kids','Niños'],['adults','Adultos']].map(([t, label]) => (
          <button key={t} type="button" onClick={() => handleTab(t)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors
              ${tab === t ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Belt grid */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Faixa</p>
        <div className="grid gap-2" style={{ gridTemplateColumns:'repeat(auto-fill, minmax(90px, 1fr))' }}>
          {list.map(b => (
            <button key={b.id} type="button" onClick={() => handleBelt(b.id)}
              className={`rounded-xl p-2.5 text-center transition-all border
                ${beltId === b.id
                  ? 'border-red-500 bg-red-950/40 ring-1 ring-red-500'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-600'}`}>
              <BeltSVG belt={b} tips={0} width={66} height={18}/>
              <p className={`text-xs mt-1.5 leading-tight font-medium ${beltId === b.id ? 'text-red-400' : 'text-gray-400'}`}>
                {b.name}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Tip / Grau dots */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Graus</p>
        <div className="flex items-center gap-2 flex-wrap">
          {/* 0 = sin graus */}
          <button type="button" onClick={() => handleTips(0)}
            className={`w-7 h-7 rounded-full border-2 border-dashed transition-all
              ${tips === 0 ? 'border-red-500 scale-110' : 'border-gray-600 hover:border-gray-400'}`}
            title="Sin graus"/>
          {Array.from({ length: maxT }, (_, i) => {
            const n  = i + 1;
            const tc = beltObj.black ? BLACK_TIPS[i] : '#f0ede8';
            const needBorder = tc === '#f0ede8';
            return (
              <button key={n} type="button" onClick={() => handleTips(n)}
                style={{ backgroundColor: tc, border: needBorder ? '2px solid #9ca3af' : '2px solid transparent' }}
                className={`w-7 h-7 rounded-full transition-all ${tips === n ? 'scale-125 ring-2 ring-red-500 ring-offset-1 ring-offset-gray-900' : 'opacity-50 hover:opacity-80'}`}
                title={`${n} grau${n > 1 ? 's' : ''}`}/>
            );
          })}
        </div>
      </div>

      {/* Preview */}
      <div className="flex items-center gap-3 p-3 bg-gray-950 rounded-xl border border-gray-800">
        <BeltSVG belt={beltObj} tips={tips} width={160} height={34}/>
        <div>
          <p className="text-white font-bold text-sm">{beltObj.name}</p>
          <p className="text-gray-400 text-xs">{grauLabel(beltObj, tips)}</p>
        </div>
      </div>
    </div>
  );
}

// Need React for useState/useEffect
import React from 'react';
