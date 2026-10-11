// Schéma du corps (face et dos) : les muscles travaillés sont colorés.
import type { Muscle } from './programme'

type Forme =
    | { t: 'e'; cx: number; cy: number; rx: number; ry: number }
    | { t: 'r'; x: number; y: number; w: number; h: number; rx: number }
    | { t: 'p'; d: string }

// Silhouette (vue de face et de dos identiques).
const CORPS: Forme[] = [
    { t: 'e', cx: 60, cy: 17, rx: 11, ry: 12 },
    { t: 'r', x: 55, y: 27, w: 10, h: 8, rx: 3 },
    { t: 'r', x: 39, y: 35, w: 42, h: 58, rx: 13 },
    { t: 'r', x: 42, y: 86, w: 36, h: 20, rx: 9 },
    { t: 'r', x: 27, y: 38, w: 12, h: 36, rx: 6 },
    { t: 'r', x: 81, y: 38, w: 12, h: 36, rx: 6 },
    { t: 'r', x: 24, y: 72, w: 11, h: 34, rx: 5 },
    { t: 'r', x: 85, y: 72, w: 11, h: 34, rx: 5 },
    { t: 'e', cx: 29, cy: 111, rx: 5, ry: 6 },
    { t: 'e', cx: 91, cy: 111, rx: 5, ry: 6 },
    { t: 'r', x: 43, y: 102, w: 16, h: 50, rx: 8 },
    { t: 'r', x: 61, y: 102, w: 16, h: 50, rx: 8 },
    { t: 'r', x: 45, y: 150, w: 13, h: 46, rx: 6 },
    { t: 'r', x: 62, y: 150, w: 13, h: 46, rx: 6 },
    { t: 'e', cx: 51, cy: 200, rx: 8, ry: 4 },
    { t: 'e', cx: 69, cy: 200, rx: 8, ry: 4 },
]

const deux = (m: Muscle, a: Forme, b: Forme): [Muscle, Forme][] => [
    [m, a],
    [m, b],
]

const FACE: [Muscle, Forme][] = [
    ...deux('epaules', { t: 'e', cx: 37, cy: 43, rx: 8, ry: 7 }, { t: 'e', cx: 83, cy: 43, rx: 8, ry: 7 }),
    ...deux('pectoraux', { t: 'r', x: 43, y: 40, w: 16, h: 17, rx: 6 }, { t: 'r', x: 61, y: 40, w: 16, h: 17, rx: 6 }),
    ...deux('biceps', { t: 'e', cx: 33, cy: 59, rx: 5, ry: 11 }, { t: 'e', cx: 87, cy: 59, rx: 5, ry: 11 }),
    ...deux('avant-bras', { t: 'e', cx: 29.5, cy: 89, rx: 4.5, ry: 12 }, { t: 'e', cx: 90.5, cy: 89, rx: 4.5, ry: 12 }),
    ['abdos', { t: 'r', x: 51, y: 60, w: 18, h: 30, rx: 5 }],
    ...deux('obliques', { t: 'e', cx: 46, cy: 75, rx: 3.5, ry: 12 }, { t: 'e', cx: 74, cy: 75, rx: 3.5, ry: 12 }),
    ...deux('quadriceps', { t: 'e', cx: 51, cy: 125, rx: 7, ry: 21 }, { t: 'e', cx: 69, cy: 125, rx: 7, ry: 21 }),
    ...deux('mollets', { t: 'e', cx: 51.5, cy: 168, rx: 5, ry: 15 }, { t: 'e', cx: 68.5, cy: 168, rx: 5, ry: 15 }),
]

const DOS: [Muscle, Forme][] = [
    ['trapezes', { t: 'p', d: 'M50 30 L70 30 L83 40 L60 54 L37 40 Z' }],
    ...deux('deltoides-arriere', { t: 'e', cx: 37, cy: 43, rx: 8, ry: 7 }, { t: 'e', cx: 83, cy: 43, rx: 8, ry: 7 }),
    ['dos', { t: 'p', d: 'M43 47 L60 56 L77 47 L75 79 L60 86 L45 79 Z' }],
    ...deux('triceps', { t: 'e', cx: 33, cy: 59, rx: 5, ry: 11 }, { t: 'e', cx: 87, cy: 59, rx: 5, ry: 11 }),
    ...deux('avant-bras', { t: 'e', cx: 29.5, cy: 89, rx: 4.5, ry: 12 }, { t: 'e', cx: 90.5, cy: 89, rx: 4.5, ry: 12 }),
    ['lombaires', { t: 'r', x: 53, y: 79, w: 14, h: 13, rx: 4 }],
    ...deux('moyen-fessier', { t: 'e', cx: 45, cy: 94, rx: 5, ry: 5 }, { t: 'e', cx: 75, cy: 94, rx: 5, ry: 5 }),
    ...deux('fessiers', { t: 'e', cx: 52, cy: 103, rx: 9, ry: 9 }, { t: 'e', cx: 68, cy: 103, rx: 9, ry: 9 }),
    ...deux('ischios', { t: 'e', cx: 51, cy: 130, rx: 7, ry: 19 }, { t: 'e', cx: 69, cy: 130, rx: 7, ry: 19 }),
    ...deux('mollets', { t: 'e', cx: 51.5, cy: 166, rx: 6, ry: 14 }, { t: 'e', cx: 68.5, cy: 166, rx: 6, ry: 14 }),
]

function Dessin({ f, fill, opacite }: { f: Forme; fill: string; opacite?: number }) {
    // fill passe par style pour accepter les variables CSS (thème clair / sombre).
    if (f.t === 'e') return <ellipse cx={f.cx} cy={f.cy} rx={f.rx} ry={f.ry} style={{ fill }} opacity={opacite} />
    if (f.t === 'r') return <rect x={f.x} y={f.y} width={f.w} height={f.h} rx={f.rx} style={{ fill }} opacity={opacite} />
    return <path d={f.d} style={{ fill }} opacity={opacite} />
}

function Vue({ zones, muscles, couleur, coeur }: { zones: [Muscle, Forme][]; muscles: Muscle[]; couleur: string; coeur: boolean }) {
    return (
        <svg viewBox="0 0 120 208" className="bodymap-vue" aria-hidden="true">
            {CORPS.map((f, i) => (
                <Dessin key={`c${i}`} f={f} fill="var(--mu-corps)" />
            ))}
            {zones.map(([m, f], i) => (
                <Dessin
                    key={`z${i}`}
                    f={f}
                    fill={muscles.includes(m) ? couleur : 'var(--mu-corps)'}
                    opacite={muscles.includes(m) ? 0.95 : 1}
                />
            ))}
            {coeur && (
                <path
                    d="M60 58 C55 52 47 55 50 61 L60 70 L70 61 C73 55 65 52 60 58 Z"
                    fill="#ff3b5c"
                    className="bodymap-coeur"
                />
            )}
        </svg>
    )
}

export default function BodyMap({ muscles, couleur }: { muscles: Muscle[]; couleur: string }) {
    const coeur = muscles.includes('cardio')
    return (
        <div className="bodymap">
            <figure>
                <Vue zones={FACE} muscles={muscles} couleur={couleur} coeur={coeur} />
                <figcaption>Face</figcaption>
            </figure>
            <figure>
                <Vue zones={DOS} muscles={muscles} couleur={couleur} coeur={false} />
                <figcaption>Dos</figcaption>
            </figure>
        </div>
    )
}
