/**
 * Hero illustration: textured ivory paper collage with torn, organic shapes in blush,
 * lavender, sage and terracotta — composed with the asymmetry and empty space of a
 * Japanese hanging scroll (ma). Abstract and text-free. Pure SVG, no external images.
 */
export function HeroArt({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 520 600" className={className} role="img" aria-label="Abstract paper collage of soft organic shapes">
      <defs>
        <filter id="paper" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="7" result="noise" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="table" tableValues="0 0.07" />
          </feComponentTransfer>
          <feComposite in2="SourceGraphic" operator="in" />
          <feBlend in="SourceGraphic" mode="multiply" />
        </filter>
        <filter id="torn">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="3" result="t" />
          <feDisplacementMap in="SourceGraphic" in2="t" scale="10" />
        </filter>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#35312F" floodOpacity="0.10" />
        </filter>
        <filter id="ink"><feGaussianBlur stdDeviation="0.6" /></filter>
      </defs>

      {/* paper sheet */}
      <rect x="20" y="20" width="480" height="560" rx="28" fill="#FAF8F3" filter="url(#shadow)" />
      <rect x="20" y="20" width="480" height="560" rx="28" fill="#F6F1E8" filter="url(#paper)" />

      {/* large lavender wash, top right */}
      <g filter="url(#torn)">
        <path d="M300 60c90 10 170 70 165 165-4 85-80 120-150 110-70-10-120-60-125-130C185 130 230 52 300 60z" fill="#EAE4F0" />
      </g>
      {/* blush form, overlapping */}
      <g filter="url(#shadow)">
        <g filter="url(#torn)">
          <path d="M120 230c60-40 165-25 200 45 34 70-5 150-85 170-80 20-160-20-175-95-10-50 20-90 60-120z" fill="#F3E5E5" />
        </g>
      </g>
      {/* sage leaf-like shape, lower right */}
      <g filter="url(#shadow)">
        <g filter="url(#torn)">
          <path d="M330 380c60-5 120 35 125 95 3 45-40 70-95 70-60 0-110-35-105-85 4-40 30-77 75-80z" fill="#E5ECE5" />
        </g>
      </g>
      {/* terracotta sun — small, off-centre, like a seal */}
      <g filter="url(#torn)">
        <circle cx="352" cy="168" r="34" fill="#B58B7D" />
      </g>
      {/* single brush stroke */}
      <path
        d="M90 520c70-30 160-48 250-40"
        fill="none"
        stroke="#35312F"
        strokeOpacity="0.55"
        strokeWidth="3.2"
        strokeLinecap="round"
        filter="url(#ink)"
      />
      <path d="M96 540c40-10 80-14 120-12" fill="none" stroke="#B58B7D" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.7" />
      {/* tiny scattered paper fragments */}
      <circle cx="140" cy="120" r="7" fill="#B58B7D" opacity="0.35" />
      <circle cx="460" cy="320" r="5" fill="#35312F" opacity="0.18" />
      <rect x="70" y="170" width="30" height="5" rx="2.5" fill="#E5ECE5" />
      {/* paper grain on top of everything */}
      <rect x="20" y="20" width="480" height="560" rx="28" fill="transparent" filter="url(#paper)" />
    </svg>
  );
}

/** Soft blurred organic shapes for section backgrounds. */
export function BlurShapes({ variant = 1 }: { variant?: 1 | 2 }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {variant === 1 ? (
        <>
          <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-blush blur-3xl opacity-70" />
          <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-lavender blur-3xl opacity-70" />
        </>
      ) : (
        <>
          <div className="absolute left-1/4 -top-10 h-72 w-96 rounded-full bg-sage blur-3xl opacity-80" />
          <div className="absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-blush blur-3xl opacity-60" />
        </>
      )}
    </div>
  );
}
