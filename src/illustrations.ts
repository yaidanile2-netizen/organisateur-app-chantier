// Illustrations animées des exercices (dessinées à la main, en SVG) : un personnage stylisé
// fait le mouvement en boucle sur sa machine ou à la maison. Les muscles travaillés sont
// dans la couleur de la séance. Tout est calculé ici ; ExoIllustration.tsx ne fait qu'afficher.

export type P = [number, number]
type Sens = 1 | -1

const L = { tronc: 24, cou: 8.5, tete: 5.6, bras: 14, ab: 13, cuisse: 19, jambe: 18, pied: 6.5 }
const SOL = 84

const rad = (d: number) => (d * Math.PI) / 180
const dir = (deg: number, l = 1): P => [Math.cos(rad(deg)) * l, Math.sin(rad(deg)) * l]
const add = (a: P, b: P): P => [a[0] + b[0], a[1] + b[1]]
const angle = (a: P, b: P) => (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI

/** Articulation du milieu (coude, genou) pour atteindre `cible` depuis `base`. */
function ik(base: P, cible: P, l1: number, l2: number, sens: Sens): [P, P] {
    const dx = cible[0] - base[0]
    const dy = cible[1] - base[1]
    const d = Math.min(l1 + l2 - 0.01, Math.max(Math.abs(l1 - l2) + 0.01, Math.hypot(dx, dy)))
    const off = Math.acos((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))
    const milieu = add(base, dir(angle(base, cible) + (sens * off * 180) / Math.PI, l1))
    const bout = add(milieu, dir(angle(milieu, cible), l2))
    return [milieu, bout]
}

// ---------- Poses ----------

type Rel = { rel: 'epaule' | 'hanche'; d: P }
type PoseCote = {
    hanche: P
    tronc?: number // angle hanche → épaule (−90 = droit)
    epaule?: P
    tete?: number // inclinaison de la tête par rapport au tronc
    main: P | Rel
    coude: Sens
    pied: P
    genou: Sens
    orteil: number
    main2?: P | Rel
    coude2?: Sens
    pied2?: P
    genou2?: Sens
    orteil2?: number
}
type PoseFace = {
    vue: 'face'
    cx: number
    epauleY: number
    hancheY: number
    mainD: P
    mainG?: P
    coude: Sens
    piedD: P
    piedG?: P
    genou: Sens
}
type Pose = PoseCote | PoseFace

type Joints = Record<string, P>

function joints(p: Pose): Joints {
    if ('vue' in p) {
        const miroir = (q: P): P => [2 * p.cx - q[0], q[1]]
        const j: Joints = {
            cou: [p.cx, p.epauleY - 2],
            tete: [p.cx, p.epauleY - 9],
            epauleD: [p.cx + 9, p.epauleY],
            epauleG: [p.cx - 9, p.epauleY],
            hancheD: [p.cx + 5, p.hancheY],
            hancheG: [p.cx - 5, p.hancheY],
            bassin: [p.cx, p.hancheY],
        }
        const mainG = p.mainG ?? miroir(p.mainD)
        const piedG = p.piedG ?? miroir(p.piedD)
        ;[j.coudeD, j.mainD] = ik(j.epauleD, p.mainD, L.bras, L.ab, p.coude)
        ;[j.coudeG, j.mainG] = ik(j.epauleG, mainG, L.bras, L.ab, (-p.coude) as Sens)
        ;[j.genouD, j.chevilleD] = ik(j.hancheD, p.piedD, L.cuisse, L.jambe, p.genou)
        ;[j.genouG, j.chevilleG] = ik(j.hancheG, piedG, L.cuisse, L.jambe, (-p.genou) as Sens)
        j.orteilD = add(j.chevilleD, [3.5, 0])
        j.orteilG = add(j.chevilleG, [-3.5, 0])
        return j
    }
    const epaule = p.epaule ?? add(p.hanche, dir(p.tronc ?? -90, L.tronc))
    const aTronc = angle(p.hanche, epaule)
    const res = (q: P | Rel): P => ('rel' in q ? add(q.rel === 'epaule' ? epaule : p.hanche, q.d) : q)
    const j: Joints = { hanche: p.hanche, epaule, tete: add(epaule, dir(aTronc + (p.tete ?? 0), L.cou)) }
    ;[j.coude, j.main] = ik(epaule, res(p.main), L.bras, L.ab, p.coude)
    ;[j.genou, j.cheville] = ik(p.hanche, p.pied, L.cuisse, L.jambe, p.genou)
    j.orteil = add(j.cheville, dir(p.orteil, L.pied))
    if (p.main2) [j.coude2, j.main2] = ik(epaule, res(p.main2), L.bras, L.ab, p.coude2 ?? p.coude)
    if (p.pied2) {
        ;[j.genou2, j.cheville2] = ik(p.hanche, p.pied2, L.cuisse, L.jambe, p.genou2 ?? p.genou)
        j.orteil2 = add(j.cheville2, dir(p.orteil2 ?? p.orteil, L.pied))
    }
    return j
}

// ---------- Éléments dessinés ----------

export type Sorte = 'corps' | 'loin' | 'accent' | 'machine' | 'piece' | 'cable' | 'elastique' | 'sol'
type C = P | { j: string; d?: P; x?: number; y?: number } | { v: P[] }
type Element =
    | { t: 'l'; a: C; b: C; k: Sorte; w?: number; avant?: boolean }
    | { t: 'c'; c: C; r: number; k: Sorte; avant?: boolean; vide?: boolean }
    | { t: 'r'; x: number; y: number; w: number; h: number; k: Sorte; rx?: number; avant?: boolean }

type Seg = 'tronc' | 'bras' | 'ab' | 'cuisse' | 'jambe' | 'pied' | 'epaules' | 'trapezes' | 'fessiers' | 'hanches'

type Def = {
    poses: Pose[]
    sansCorps?: boolean // gros plan (main) : seul le décor est dessiné
    pauses?: boolean // marque un temps en haut et en bas du mouvement
    duree?: number
    accent: Seg[]
    decor: Element[]
    legende?: string
}

const sol = (x1 = 4, x2 = 116, y = SOL): Element => ({ t: 'l', a: [x1, y], b: [x2, y], k: 'sol', w: 1.4 })
const J = (j: string, d?: P): C => ({ j, d })

// Siège de machine (assise + dossier) : x = bord arrière, y = dessus de l'assise.
const siege = (x: number, y: number, larg = 22, dossier: P | null = null): Element[] => [
    { t: 'r', x, y, w: larg, h: 4.5, rx: 2, k: 'piece' },
    { t: 'l', a: [x + larg / 2, y + 4], b: [x + larg / 2, SOL], k: 'machine', w: 3 },
    { t: 'l', a: [x + larg / 2 - 8, SOL], b: [x + larg / 2 + 8, SOL], k: 'machine', w: 3 },
    ...(dossier ? [{ t: 'l', a: [x + 2, y + 1], b: dossier, k: 'piece', w: 5 } as Element] : []),
]
// Pile de charges d'une machine guidée.
const pile = (x: number, haut = 40): Element[] => [
    { t: 'l', a: [x, SOL], b: [x, 10], k: 'machine', w: 3 },
    { t: 'l', a: [x + 14, SOL], b: [x + 14, 10], k: 'machine', w: 3 },
    { t: 'l', a: [x - 2, 10], b: [x + 16, 10], k: 'machine', w: 3 },
    { t: 'r', x: x + 2, y: SOL - haut, w: 10, h: haut - 2, rx: 1.5, k: 'piece' },
]


// Haltère vu de bout, barre avec disque, banc plat, colonne de poulie.
const halt = (j: string, d?: P, r = 3.4): Element => ({ t: 'c', c: J(j, d), r, k: 'piece', avant: true })
const disque = (j: string, d?: P, r = 8.5): Element => ({ t: 'c', c: J(j, d), r, k: 'piece' })
const banc = (x: number, y: number, larg: number): Element[] => [
    { t: 'r', x, y, w: larg, h: 4.5, rx: 2, k: 'piece' },
    { t: 'l', a: [x + 4, y + 4], b: [x + 4, SOL], k: 'machine', w: 3 },
    { t: 'l', a: [x + larg - 4, y + 4], b: [x + larg - 4, SOL], k: 'machine', w: 3 },
]
const colonne = (x: number, yPoulie: number): Element[] => [
    { t: 'l', a: [x, SOL], b: [x, 4], k: 'machine', w: 3 },
    { t: 'c', c: [x - 2, yPoulie], r: 2.4, k: 'machine' },
]
const corde = (): Element[] => [
    { t: 'l', a: J('main', [0, -3]), b: J('main', [-1, 3]), k: 'piece', w: 2.4, avant: true },
    { t: 'l', a: J('main', [0, -3]), b: J('main', [3, 3]), k: 'piece', w: 2.4, avant: true },
]

// Gros plan de la main pour le finger grip : 4 doigts qui s'ouvrent contre l'élastique.
const BASES: P[] = [[44, 38], [51, 35], [58, 35], [65, 38]]
const fermes: P[] = BASES.map(([x, y]) => [x + 1, y + 7])
const ouverts: P[] = BASES.map(([x, y], k) => add([x, y], dir(-118 + k * 18, 17)))
const doigt = (k: number): Element => ({ t: 'l', a: BASES[k], b: { v: [fermes[k], ouverts[k]] }, k: 'corps', w: 5.5 })
const boucle = (k: number): Element => ({
    t: 'l',
    a: { v: [fermes[k], ouverts[k]] },
    b: { v: [fermes[(k + 1) % 4], ouverts[(k + 1) % 4]] },
    k: 'elastique',
    w: 1.8,
    avant: true,
})

export const ILLUSTRATIONS: Record<string, Def> = {
    // ===== Séance A — haut du corps (machines) =====
    'a-chest-press': {
        legende: 'Pousse les poignées devant toi, dos collé au dossier',
        pauses: true,
        accent: ['bras', 'ab', 'epaules'],
        poses: [
            { hanche: [40, 60], tronc: -100, tete: 8, main: [41, 41], coude: 1, pied: [62, 83], genou: -1, orteil: 0 },
            { hanche: [40, 60], tronc: -100, tete: 8, main: [62, 40], coude: 1, pied: [62, 83], genou: -1, orteil: 0 },
        ],
        decor: [
            sol(),
            ...siege(28, 61, 22, [26, 26]),
            ...pile(94),
            { t: 'l', a: [84, 84], b: [84, 22], k: 'machine', w: 3 },
            { t: 'l', a: J('main', [2, 0]), b: { j: 'main', x: 84 }, k: 'machine', w: 2.6 },
            { t: 'l', a: J('main', [0, -4]), b: J('main', [0, 4]), k: 'piece', w: 3, avant: true },
        ],
    },
    'a-lat-pulldown': {
        legende: 'Tire la barre vers le haut de la poitrine',
        pauses: true,
        accent: ['tronc', 'bras'],
        poses: [
            { hanche: [44, 62], tronc: -95, tete: 6, main: [48, 13], coude: -1, pied: [64, 83], genou: -1, orteil: 0 },
            { hanche: [44, 62], tronc: -100, tete: 6, main: [43, 40], coude: 1, pied: [64, 83], genou: -1, orteil: 0 },
        ],
        decor: [
            sol(),
            ...siege(32, 63, 22),
            { t: 'r', x: 54, y: 52, w: 12, h: 4, rx: 2, k: 'piece', avant: true },
            { t: 'l', a: [92, SOL], b: [92, 4], k: 'machine', w: 3 },
            { t: 'l', a: [92, 4], b: [48, 4], k: 'machine', w: 3 },
            { t: 'c', c: [47, 5.5], r: 2.4, k: 'machine' },
            { t: 'l', a: [47, 6], b: J('main'), k: 'cable', w: 1 },
            { t: 'l', a: J('main', [-11, 0]), b: J('main', [9, 0]), k: 'piece', w: 2.8, avant: true },
        ],
    },
    'a-shoulder-press': {
        legende: 'Pousse au-dessus de la tête sans cambrer',
        pauses: true,
        accent: ['bras', 'epaules'],
        poses: [
            { hanche: [44, 62], tronc: -95, tete: 4, main: [47, 37], coude: 1, pied: [64, 83], genou: -1, orteil: 0 },
            { hanche: [44, 62], tronc: -95, tete: 4, main: [46, 12], coude: 1, pied: [64, 83], genou: -1, orteil: 0 },
        ],
        decor: [
            sol(),
            ...siege(32, 63, 22, [32, 24]),
            ...pile(90),
            { t: 'l', a: [26, 6], b: [26, 64], k: 'machine', w: 3 },
            { t: 'l', a: J('main', [-3, 0]), b: { j: 'main', x: 26 }, k: 'machine', w: 2.4 },
            { t: 'l', a: J('main', [-1, -4]), b: J('main', [-1, 4]), k: 'piece', w: 3, avant: true },
        ],
    },
    'a-seated-row': {
        legende: 'Tire les coudes vers l’arrière, poitrine sortie',
        pauses: true,
        accent: ['tronc', 'bras'],
        poses: [
            { hanche: [38, 62], tronc: -88, tete: 4, main: [64, 42], coude: 1, pied: [68, 74], genou: -1, orteil: -80 },
            { hanche: [38, 62], tronc: -92, tete: 4, main: [50, 45], coude: 1, pied: [68, 74], genou: -1, orteil: -80 },
        ],
        decor: [
            sol(),
            ...siege(26, 63, 24),
            { t: 'l', a: [71, 64], b: [73, 82], k: 'piece', w: 4 },
            { t: 'l', a: [98, SOL], b: [98, 30], k: 'machine', w: 3 },
            { t: 'c', c: [96, 43], r: 2.4, k: 'machine' },
            { t: 'l', a: [96, 43], b: J('main'), k: 'cable', w: 1 },
            { t: 'l', a: J('main', [0, -4]), b: J('main', [0, 4]), k: 'piece', w: 2.8, avant: true },
        ],
    },
    'a-curl-poulie': {
        legende: 'Coudes fixes, monte la barre vers les épaules',
        pauses: true,
        accent: ['bras', 'ab'],
        poses: [
            { hanche: [48, 46], tronc: -90, main: [51, 70], coude: -1, pied: [49, 83], genou: 1, orteil: 0 },
            { hanche: [48, 46], tronc: -90, main: [60, 27], coude: -1, pied: [49, 83], genou: 1, orteil: 0 },
        ],
        decor: [
            sol(),
            { t: 'l', a: [92, SOL], b: [92, 8], k: 'machine', w: 3 },
            { t: 'c', c: [89, 80], r: 2.4, k: 'machine' },
            { t: 'l', a: [89, 80], b: J('main'), k: 'cable', w: 1 },
            { t: 'l', a: J('main', [-2, 0]), b: J('main', [4, 0]), k: 'piece', w: 3, avant: true },
        ],
    },
    'a-triceps-corde': {
        legende: 'Coudes collés, tends les bras vers le bas',
        pauses: true,
        accent: ['bras'],
        poses: [
            { hanche: [46, 46], tronc: -80, tete: 6, main: [60, 30], coude: -1, pied: [45, 83], genou: 1, orteil: 0 },
            { hanche: [46, 46], tronc: -80, tete: 6, main: [55, 58], coude: -1, pied: [45, 83], genou: 1, orteil: 0 },
        ],
        decor: [
            sol(),
            { t: 'l', a: [92, SOL], b: [92, 4], k: 'machine', w: 3 },
            { t: 'c', c: [88, 7], r: 2.4, k: 'machine' },
            { t: 'l', a: [88, 7], b: J('main', [0, -3]), k: 'cable', w: 1 },
            { t: 'l', a: J('main', [0, -3]), b: J('main', [-1, 3]), k: 'piece', w: 2.4, avant: true },
            { t: 'l', a: J('main', [0, -3]), b: J('main', [3, 3]), k: 'piece', w: 2.4, avant: true },
        ],
    },

    // ===== Séance B — bas du corps =====
    'b-leg-press': {
        legende: 'Pousse le plateau, sans verrouiller les genoux',
        pauses: true,
        accent: ['cuisse', 'jambe', 'fessiers'],
        poses: [
            { hanche: [34, 66], tronc: -150, tete: 18, main: [38, 68], coude: 1, pied: [49, 49], genou: -1, orteil: -138 },
            { hanche: [34, 66], tronc: -150, tete: 18, main: [38, 68], coude: 1, pied: [57.5, 39.5], genou: -1, orteil: -138 },
        ],
        decor: [
            sol(),
            { t: 'l', a: [42, 72], b: [10, 50], k: 'piece', w: 6 },
            { t: 'l', a: [26, 72], b: [48, 72], k: 'piece', w: 5 },
            { t: 'l', a: [36, 74], b: [36, SOL], k: 'machine', w: 3 },
            { t: 'l', a: [50, 62], b: [83, 25], k: 'machine', w: 3 },
            { t: 'l', a: [83, 25], b: [83, SOL], k: 'machine', w: 3 },
            { t: 'l', a: J('cheville', [8.5, 7.5]), b: J('cheville', [-3, -3]), k: 'piece', w: 4 },
        ],
    },
    'b-leg-curl': {
        legende: 'Ramène les talons sous le siège, remonte lentement',
        pauses: true,
        accent: ['cuisse'],
        poses: [
            { hanche: [40, 58], tronc: -102, tete: 8, main: [44, 62], coude: 1, pied: [76, 60], genou: -1, orteil: -70 },
            { hanche: [40, 58], tronc: -102, tete: 8, main: [44, 62], coude: 1, pied: [52, 76], genou: -1, orteil: -10 },
        ],
        decor: [
            sol(),
            ...siege(26, 60, 24, [24, 28]),
            { t: 'r', x: 50, y: 51, w: 12, h: 4, rx: 2, k: 'piece', avant: true },
            { t: 'c', c: J('cheville', [1, 3.5]), r: 3.4, k: 'piece', avant: true },
            { t: 'l', a: [62, 62], b: J('cheville', [1, 3.5]), k: 'machine', w: 2.4 },
        ],
    },
    'b-leg-extension': {
        legende: 'Tends les jambes, tiens 1 s en haut',
        pauses: true,
        accent: ['cuisse'],
        poses: [
            { hanche: [40, 60], tronc: -98, tete: 6, main: [44, 63], coude: 1, pied: [60, 82], genou: -1, orteil: 0 },
            { hanche: [40, 60], tronc: -98, tete: 6, main: [44, 63], coude: 1, pied: [76, 62], genou: -1, orteil: -80 },
        ],
        decor: [
            sol(),
            ...siege(26, 62, 24, [26, 28]),
            { t: 'c', c: J('cheville', [3.5, -1]), r: 3.4, k: 'piece', avant: true },
            { t: 'l', a: [59, 63], b: J('cheville', [3.5, -1]), k: 'machine', w: 2.4 },
        ],
    },
    'b-mollets': {
        legende: 'Sur la presse : pousse avec la pointe des pieds',
        pauses: true,
        accent: ['jambe'],
        poses: [
            { hanche: [34, 66], tronc: -150, tete: 18, main: [38, 68], coude: 1, pied: [58.5, 38.5], genou: -1, orteil: -165 },
            { hanche: [34, 66], tronc: -150, tete: 18, main: [38, 68], coude: 1, pied: [58.5, 38.5], genou: -1, orteil: -85 },
        ],
        decor: [
            sol(),
            { t: 'l', a: [42, 72], b: [10, 50], k: 'piece', w: 6 },
            { t: 'l', a: [26, 72], b: [48, 72], k: 'piece', w: 5 },
            { t: 'l', a: [36, 74], b: [36, SOL], k: 'machine', w: 3 },
            { t: 'l', a: [50, 62], b: [83, 25], k: 'machine', w: 3 },
            { t: 'l', a: [83, 25], b: [83, SOL], k: 'machine', w: 3 },
            { t: 'l', a: J('orteil', [6, 5.5]), b: J('orteil', [-4, -4]), k: 'piece', w: 4 },
        ],
    },
    'b-crunch': {
        legende: 'Enroule le buste vers les cuisses',
        pauses: true,
        accent: ['tronc'],
        poses: [
            { hanche: [44, 62], tronc: -95, tete: 4, main: { rel: 'epaule', d: [7, 3] }, coude: 1, pied: [64, 83], genou: -1, orteil: 0 },
            { hanche: [44, 62], tronc: -45, tete: 25, main: { rel: 'epaule', d: [7, 6] }, coude: 1, pied: [64, 83], genou: -1, orteil: 0 },
        ],
        decor: [
            sol(),
            ...siege(30, 63, 24, [28, 34]),
            { t: 'l', a: J('epaule', [6, -1]), b: J('epaule', [9, 9]), k: 'piece', w: 4.5, avant: true },
            { t: 'l', a: [28, 16], b: J('epaule', [6, -1]), k: 'machine', w: 2.4 },
        ],
    },
    'b-planche': {
        legende: 'Corps bien aligné, tiens la position',
        duree: 3,
        accent: ['tronc'],
        poses: [
            { hanche: [53.1, 74.5], tronc: -12.5, tete: 6, main: [90, 83], coude: 1, pied: [17, 82.5], genou: 1, orteil: 95 },
            { hanche: [53.1, 74], tronc: -13, tete: 6, main: [90, 83], coude: 1, pied: [17, 82.5], genou: 1, orteil: 95 },
        ],
        decor: [sol()],
    },

    // ===== Séance C — cardio =====
    'c-fractionne': {
        legende: 'Vélo : alterne minutes rapides et lentes',
        duree: 1.1,
        accent: ['cuisse', 'jambe'],
        poses: [0, 90, 180, 270].map((a) => ({
            hanche: [44, 46] as P,
            tronc: -58,
            tete: -10,
            main: [75, 36] as P,
            coude: -1 as Sens,
            pied: add([58, 70], dir(a - 90, 7.5)),
            genou: -1 as Sens,
            orteil: 10,
            pied2: add([58, 70], dir(a + 90, 7.5)),
            orteil2: 10,
        })),
        decor: [
            sol(),
            { t: 'c', c: [78, 70], r: 9, k: 'machine', vide: true },
            { t: 'l', a: [46, 49], b: [58, 72], k: 'machine', w: 3.4 },
            { t: 'l', a: [58, 72], b: [76, 42], k: 'machine', w: 3.4 },
            { t: 'l', a: [76, 42], b: [78, 34], k: 'machine', w: 3 },
            { t: 'l', a: [73, 34], b: [82, 34], k: 'piece', w: 3 },
            { t: 'r', x: 37, y: 45, w: 14, h: 4, rx: 2, k: 'piece' },
            { t: 'l', a: [58, 72], b: [52, SOL - 1], k: 'machine', w: 3 },
            { t: 'l', a: [78, 72], b: [82, SOL - 1], k: 'machine', w: 3 },
            { t: 'l', a: [40, SOL - 1], b: [90, SOL - 1], k: 'machine', w: 3.4 },
            { t: 'c', c: [58, 70], r: 2.6, k: 'piece' },
            { t: 'l', a: J('cheville2'), b: J('cheville'), k: 'machine', w: 1.6, avant: true },
        ],
    },
    'c-marche-inclinee': {
        legende: 'Tapis incliné : marche vite, sans te tenir',
        duree: 1.6,
        accent: ['cuisse', 'jambe', 'fessiers'],
        poses: [
            { hanche: [56, 41], tronc: -86, main: [65, 36], coude: 1, main2: [49, 41], pied: [64, 74.5], genou: -1, orteil: -5, pied2: [46, 77], genou2: -1, orteil2: 20 },
            { hanche: [55, 39.5], tronc: -86, main: [57, 41], coude: 1, main2: [57, 41], pied: [55, 75.5], genou: -1, orteil: -5, pied2: [53, 70], genou2: -1, orteil2: 40 },
            { hanche: [56, 41], tronc: -86, main: [49, 41], coude: 1, main2: [65, 36], pied: [46, 77], genou: -1, orteil: 20, pied2: [64, 74.5], genou2: -1, orteil2: -5 },
            { hanche: [55, 39.5], tronc: -86, main: [57, 41], coude: 1, main2: [57, 41], pied: [53, 70], genou: -1, orteil: 40, pied2: [55, 75.5], genou2: -1, orteil2: -5 },
        ],
        decor: [
            { t: 'l', a: [10, 82], b: [104, 72], k: 'piece', w: 5 },
            { t: 'l', a: [12, 84], b: [104, 84], k: 'machine', w: 2 },
            { t: 'l', a: [104, 72], b: [104, 84], k: 'machine', w: 3 },
            { t: 'l', a: [98, 73], b: [94, 36], k: 'machine', w: 3 },
            { t: 'l', a: [94, 36], b: [80, 40], k: 'machine', w: 2.6 },
            { t: 'r', x: 88, y: 28, w: 12, h: 8, rx: 2, k: 'piece' },
        ],
    },

    'c-course': {
        legende: 'Tapis : course lente, foulée courte sous le bassin',
        duree: 0.8,
        accent: ['cuisse', 'jambe', 'fessiers'],
        poses: [
            { hanche: [56, 42], tronc: -80, tete: 6, main: [66, 32], coude: 1, main2: [48, 40], coude2: 1, pied: [67, 77], genou: -1, orteil: -5, pied2: [38, 66], genou2: -1, orteil2: 40 },
            { hanche: [55, 39], tronc: -80, tete: 6, main: [59, 38], coude: 1, main2: [59, 38], coude2: 1, pied: [55, 76], genou: -1, orteil: 5, pied2: [52, 60], genou2: -1, orteil2: 60 },
            { hanche: [56, 42], tronc: -80, tete: 6, main: [48, 40], coude: 1, main2: [66, 32], coude2: 1, pied: [38, 66], genou: -1, orteil: 40, pied2: [67, 77], genou2: -1, orteil2: -5 },
            { hanche: [55, 39], tronc: -80, tete: 6, main: [59, 38], coude: 1, main2: [59, 38], coude2: 1, pied: [52, 60], genou: -1, orteil: 60, pied2: [55, 76], genou2: -1, orteil2: 5 },
        ],
        decor: [
            { t: 'l', a: [10, 79], b: [104, 79], k: 'piece', w: 5 },
            { t: 'l', a: [12, 84], b: [104, 84], k: 'machine', w: 2 },
            { t: 'l', a: [104, 79], b: [104, 84], k: 'machine', w: 3 },
            { t: 'l', a: [98, 79], b: [94, 36], k: 'machine', w: 3 },
            { t: 'l', a: [94, 36], b: [80, 40], k: 'machine', w: 2.6 },
            { t: 'r', x: 88, y: 28, w: 12, h: 8, rx: 2, k: 'piece' },
        ],
    },

    // ===== Séance D — maison =====
    'd-elevations-laterales': {
        legende: 'Monte les bras sur les côtés jusqu’à l’horizontale',
        pauses: true,
        accent: ['epaules'],
        poses: [
            { vue: 'face', cx: 60, epauleY: 23, hancheY: 46, mainD: [72, 66], coude: 1, piedD: [66, 83], genou: 1 },
            { vue: 'face', cx: 60, epauleY: 23, hancheY: 46, mainD: [95, 25], coude: 1, piedD: [66, 83], genou: 1 },
        ],
        decor: [
            sol(),
            { t: 'l', a: J('chevilleD', [0, 0]), b: J('mainD'), k: 'elastique', w: 1.6 },
            { t: 'l', a: J('chevilleG', [0, 0]), b: J('mainG'), k: 'elastique', w: 1.6 },
        ],
    },
    'd-face-pull': {
        legende: 'Tire l’élastique vers le front, coudes hauts',
        pauses: true,
        accent: ['bras', 'epaules'],
        poses: [
            { hanche: [42, 46], tronc: -90, main: [68, 21], coude: -1, pied: [44, 83], genou: 1, orteil: 0 },
            { hanche: [42, 46], tronc: -90, main: [51, 15], coude: -1, pied: [44, 83], genou: 1, orteil: 0 },
        ],
        decor: [
            sol(),
            { t: 'r', x: 100, y: 0, w: 6, h: 84, rx: 1, k: 'piece' },
            { t: 'c', c: [100, 20], r: 1.8, k: 'machine' },
            { t: 'l', a: [100, 20], b: J('main'), k: 'elastique', w: 1.6 },
        ],
    },
    'd-haussements': {
        legende: 'Monte les épaules vers les oreilles, tiens 1 s',
        pauses: true,
        accent: ['trapezes'],
        poses: [
            { vue: 'face', cx: 60, epauleY: 23, hancheY: 46, mainD: [71, 52], coude: 1, piedD: [66, 83], genou: 1 },
            { vue: 'face', cx: 60, epauleY: 19, hancheY: 46, mainD: [71, 48], coude: 1, piedD: [66, 83], genou: 1 },
        ],
        decor: [
            sol(),
            { t: 'l', a: J('chevilleD'), b: J('mainD'), k: 'elastique', w: 1.6 },
            { t: 'l', a: J('chevilleG'), b: J('mainG'), k: 'elastique', w: 1.6 },
        ],
    },
    'd-pompes': {
        legende: 'Corps gainé, poitrine près du sol',
        pauses: true,
        accent: ['bras', 'epaules'],
        poses: [
            { hanche: [57.8, 66], tronc: -24, tete: 4, main: [77, 83], coude: 1, pied: [24, 81], genou: 1, orteil: 100 },
            { hanche: [60.4, 74.6], tronc: -10, tete: 4, main: [77, 83], coude: 1, pied: [24, 81], genou: 1, orteil: 100 },
        ],
        decor: [sol()],
    },
    'd-pont-fessier': {
        legende: 'Pousse dans les talons, serre les fessiers en haut',
        pauses: true,
        accent: ['fessiers'],
        poses: [
            { hanche: [44, 80], epaule: [20, 80], tete: 0, main: [46, 82.5], coude: -1, pied: [66, 82], genou: -1, orteil: 0 },
            { hanche: [46, 63], epaule: [22, 79], tete: 0, main: [48, 82.5], coude: -1, pied: [66, 82], genou: -1, orteil: 0 },
        ],
        decor: [sol(), { t: 'c', c: J('genou', [-2, 2]), r: 2.2, k: 'elastique', avant: true, vide: true }],
    },
    'd-abduction': {
        legende: 'Pas sur le côté, élastique toujours tendu',
        pauses: true,
        accent: ['hanches'],
        poses: [
            { vue: 'face', cx: 60, epauleY: 24, hancheY: 46, mainD: [66, 45], coude: -1, piedD: [66, 83], genou: 1 },
            { vue: 'face', cx: 64, epauleY: 24, hancheY: 46, mainD: [70, 45], mainG: [58, 45], coude: -1, piedD: [80, 83], piedG: [54, 83], genou: 1 },
        ],
        decor: [sol(), { t: 'l', a: J('genouD', [0, 3]), b: J('genouG', [0, 3]), k: 'elastique', w: 1.8, avant: true }],
    },
    'd-superman': {
        legende: 'Décolle bras et jambes, tiens 2 s',
        pauses: true,
        accent: ['tronc', 'fessiers'],
        poses: [
            { hanche: [52, 79], epaule: [76, 78], tete: 0, main: [103, 79], coude: -1, pied: [15, 80.5], genou: 1, orteil: 100 },
            { hanche: [52, 79], epaule: [75.5, 74], tete: -6, main: [101, 66], coude: -1, pied: [15.5, 71], genou: 1, orteil: 120 },
        ],
        decor: [sol()],
    },
    'd-gainage-lateral': {
        legende: 'Sur l’avant-bras, hanches hautes',
        duree: 3,
        accent: ['tronc', 'hanches'],
        poses: [
            { hanche: [53.1, 74.5], epaule: [76.5, 69.3], tete: -4, main: [89, 83], coude: 1, main2: [78, 43], coude2: 1, pied: [17, 82.5], genou: 1, orteil: 0 },
            { hanche: [53.4, 73], epaule: [76.5, 69.3], tete: -4, main: [89, 83], coude: 1, main2: [78, 43], coude2: 1, pied: [17, 82.5], genou: 1, orteil: 0 },
        ],
        decor: [sol()],
    },
    'd-finger-grip': {
        legende: 'Ouvre la main contre l’élastique, en continu',
        sansCorps: true,
        duree: 1.6,
        accent: [],
        poses: [
            { hanche: [0, 0], main: [0, 0], coude: 1, pied: [0, 0], genou: 1, orteil: 0 },
            { hanche: [0, 0], main: [0, 0], coude: 1, pied: [0, 0], genou: 1, orteil: 0 },
        ],
        decor: [
            { t: 'r', x: 46, y: 62, w: 18, h: 28, rx: 4, k: 'accent' },
            { t: 'r', x: 40, y: 36, w: 30, h: 30, rx: 10, k: 'corps' },
            { t: 'l', a: [41, 56], b: { v: [[37, 46], [28, 42]] }, k: 'corps', w: 5.5 },
            doigt(0),
            doigt(1),
            doigt(2),
            doigt(3),
            boucle(0),
            boucle(1),
            boucle(2),
            { t: 'l', a: { v: [fermes[3], ouverts[3]] }, b: { v: [[37, 46], [28, 42]] }, k: 'elastique', w: 1.8, avant: true },
            { t: 'l', a: { v: [[37, 46], [28, 42]] }, b: { v: [fermes[0], ouverts[0]] }, k: 'elastique', w: 1.8, avant: true },
        ],
    },
    // ===== Nouveaux exercices (programme par niveaux) =====
    'a-pec-deck': {
        legende: 'Ramène les poignées devant la poitrine, coudes fixes',
        pauses: true,
        accent: ['tronc', 'epaules'],
        poses: [
            { vue: 'face', cx: 60, epauleY: 30, hancheY: 56, mainD: [90, 31], coude: 1, piedD: [70, 83], genou: -1 },
            { vue: 'face', cx: 60, epauleY: 30, hancheY: 56, mainD: [65, 34], coude: 1, piedD: [70, 83], genou: -1 },
        ],
        decor: [
            sol(),
            { t: 'r', x: 51, y: 16, w: 18, h: 42, rx: 3, k: 'piece' },
            { t: 'r', x: 46, y: 57, w: 28, h: 5, rx: 2, k: 'piece' },
            { t: 'l', a: [60, 62], b: [60, SOL], k: 'machine', w: 3 },
            { t: 'l', a: [76, 10], b: J('mainD', [0, -6]), k: 'machine', w: 2.4 },
            { t: 'l', a: [44, 10], b: J('mainG', [0, -6]), k: 'machine', w: 2.4 },
            { t: 'l', a: J('mainD', [0, -6]), b: J('mainD', [0, 6]), k: 'piece', w: 4, avant: true },
            { t: 'l', a: J('mainG', [0, -6]), b: J('mainG', [0, 6]), k: 'piece', w: 4, avant: true },
        ],
    },
    'a-oiseau-machine': {
        legende: 'Ouvre les bras vers l’arrière, sans hausser les épaules',
        pauses: true,
        accent: ['epaules', 'trapezes'],
        poses: [
            { vue: 'face', cx: 60, epauleY: 30, hancheY: 56, mainD: [66, 34], coude: 1, piedD: [70, 83], genou: -1 },
            { vue: 'face', cx: 60, epauleY: 30, hancheY: 56, mainD: [94, 30], coude: 1, piedD: [70, 83], genou: -1 },
        ],
        decor: [
            sol(),
            { t: 'r', x: 46, y: 57, w: 28, h: 5, rx: 2, k: 'piece' },
            { t: 'l', a: [60, 62], b: [60, SOL], k: 'machine', w: 3 },
            { t: 'l', a: [76, 10], b: J('mainD', [0, -6]), k: 'machine', w: 2.4 },
            { t: 'l', a: [44, 10], b: J('mainG', [0, -6]), k: 'machine', w: 2.4 },
            { t: 'l', a: J('mainD', [0, -6]), b: J('mainD', [0, 6]), k: 'piece', w: 4, avant: true },
            { t: 'l', a: J('mainG', [0, -6]), b: J('mainG', [0, 6]), k: 'piece', w: 4, avant: true },
        ],
    },
    'a-dc-halteres': {
        legende: 'Allongé, pousse les haltères vers le plafond',
        pauses: true,
        accent: ['bras', 'ab', 'tronc'],
        poses: [
            { hanche: [40, 62], epaule: [64, 62], tete: 0, main: [63, 52], coude: 1, pied: [24, 83], genou: 1, orteil: 180 },
            { hanche: [40, 62], epaule: [64, 62], tete: 0, main: [64, 36], coude: 1, pied: [24, 83], genou: 1, orteil: 180 },
        ],
        decor: [sol(), ...banc(30, 64.5, 50), halt('main')],
    },
    'a-incline-halteres': {
        legende: 'Banc incliné : pousse les haltères au-dessus du haut de la poitrine',
        pauses: true,
        accent: ['bras', 'ab', 'tronc'],
        poses: [
            { hanche: [44, 64], tronc: -35, tete: 0, main: [60, 41], coude: 1, pied: [28, 83], genou: 1, orteil: 180 },
            { hanche: [44, 64], tronc: -35, tete: 0, main: [64, 24], coude: 1, pied: [28, 83], genou: 1, orteil: 180 },
        ],
        decor: [
            sol(),
            { t: 'l', a: [44, 68], b: [72, 49], k: 'piece', w: 5 },
            { t: 'l', a: [30, 68], b: [48, 68], k: 'piece', w: 5 },
            { t: 'l', a: [42, 70], b: [42, SOL], k: 'machine', w: 3 },
            { t: 'l', a: [64, 56], b: [66, SOL], k: 'machine', w: 3 },
            halt('main'),
        ],
    },
    'a-dc-barre': {
        legende: 'Descends la barre au bas des pectoraux, pousse en ligne droite',
        pauses: true,
        accent: ['bras', 'ab', 'tronc'],
        poses: [
            { hanche: [40, 62], epaule: [64, 62], tete: 0, main: [62, 53], coude: 1, pied: [24, 83], genou: 1, orteil: 180 },
            { hanche: [40, 62], epaule: [64, 62], tete: 0, main: [63, 36], coude: 1, pied: [24, 83], genou: 1, orteil: 180 },
        ],
        decor: [
            sol(),
            { t: 'l', a: [84, SOL], b: [84, 26], k: 'machine', w: 3 },
            { t: 'l', a: [84, 34], b: [78, 34], k: 'machine', w: 2.6 },
            ...banc(30, 64.5, 50),
            disque('main', [0, 0], 9),
            { t: 'c', c: J('main'), r: 2.2, k: 'machine', avant: true },
        ],
    },
    'a-militaire-halteres': {
        legende: 'Assis dos droit, pousse les haltères au-dessus de la tête',
        pauses: true,
        accent: ['bras', 'epaules'],
        poses: [
            { hanche: [44, 62], tronc: -95, tete: 4, main: [48, 37], coude: 1, pied: [64, 83], genou: -1, orteil: 0 },
            { hanche: [44, 62], tronc: -95, tete: 4, main: [46, 12], coude: 1, pied: [64, 83], genou: -1, orteil: 0 },
        ],
        decor: [sol(), ...siege(32, 63, 22, [32, 24]), halt('main')],
    },
    'a-rowing-haltere': {
        legende: 'Dos plat, tire l’haltère vers la hanche',
        pauses: true,
        accent: ['tronc', 'bras'],
        poses: [
            { hanche: [34, 50], tronc: -8, tete: 6, main: [58, 71], coude: -1, main2: [72, 64], coude2: 1, pied: [46, 83], genou: -1, orteil: 0, pied2: [20, 83], genou2: -1, orteil2: 0 },
            { hanche: [34, 50], tronc: -8, tete: 6, main: [45, 55], coude: -1, main2: [72, 64], coude2: 1, pied: [46, 83], genou: -1, orteil: 0, pied2: [20, 83], genou2: -1, orteil2: 0 },
        ],
        decor: [sol(), ...banc(64, 65, 40), halt('main')],
    },
    'a-elev-lat-halteres': {
        legende: 'Monte les bras sur les côtés jusqu’à l’horizontale',
        pauses: true,
        accent: ['epaules'],
        poses: [
            { vue: 'face', cx: 60, epauleY: 23, hancheY: 46, mainD: [72, 66], coude: 1, piedD: [66, 83], genou: 1 },
            { vue: 'face', cx: 60, epauleY: 23, hancheY: 46, mainD: [95, 25], coude: 1, piedD: [66, 83], genou: 1 },
        ],
        decor: [sol(), halt('mainD'), halt('mainG')],
    },
    'a-face-pull-poulie': {
        legende: 'Tire la corde vers le front, coudes hauts',
        pauses: true,
        accent: ['bras', 'epaules'],
        poses: [
            { hanche: [42, 46], tronc: -90, main: [68, 21], coude: -1, pied: [44, 83], genou: 1, orteil: 0 },
            { hanche: [42, 46], tronc: -90, main: [51, 15], coude: -1, pied: [44, 83], genou: 1, orteil: 0 },
        ],
        decor: [sol(), ...colonne(100, 20), { t: 'l', a: [98, 20], b: J('main'), k: 'cable', w: 1 }, ...corde()],
    },
    'a-curl-incline': {
        legende: 'Bras derrière le buste, monte les haltères sans bouger les coudes',
        pauses: true,
        accent: ['bras', 'ab'],
        poses: [
            { hanche: [52, 66], tronc: -125, tete: 12, main: [41, 71], coude: 1, pied: [72, 83], genou: -1, orteil: 0 },
            { hanche: [52, 66], tronc: -125, tete: 12, main: [47, 50], coude: 1, pied: [72, 83], genou: -1, orteil: 0 },
        ],
        decor: [
            sol(),
            { t: 'l', a: [54, 70], b: [30, 35], k: 'piece', w: 5 },
            { t: 'l', a: [46, 70], b: [64, 70], k: 'piece', w: 5 },
            { t: 'l', a: [56, 72], b: [56, SOL], k: 'machine', w: 3 },
            halt('main'),
        ],
    },
    'a-triceps-nuque': {
        legende: 'Dos à la poulie, tends les bras au-dessus de la tête',
        pauses: true,
        accent: ['bras'],
        poses: [
            { hanche: [44, 47], tronc: -70, tete: 0, main: [47, 16], coude: 1, pied: [52, 83], genou: -1, orteil: 0, pied2: [34, 83], orteil2: 0 },
            { hanche: [44, 47], tronc: -70, tete: 0, main: [74, 11], coude: 1, pied: [52, 83], genou: -1, orteil: 0, pied2: [34, 83], orteil2: 0 },
        ],
        decor: [sol(), ...colonne(12, 20), { t: 'l', a: [14, 20], b: J('main'), k: 'cable', w: 1 }, ...corde()],
    },
    'a-tractions-assistees': {
        legende: 'Genoux sur l’appui, monte le menton au-dessus de la barre',
        pauses: true,
        accent: ['tronc', 'bras'],
        poses: [
            { hanche: [50, 52], tronc: -90, tete: 0, main: [53, 5], coude: 1, pied: [34, 74], genou: -1, orteil: 180 },
            { hanche: [50, 40], tronc: -90, tete: 0, main: [53, 5], coude: 1, pied: [34, 62], genou: -1, orteil: 180 },
        ],
        decor: [
            sol(),
            { t: 'l', a: [76, SOL], b: [76, 4], k: 'machine', w: 3 },
            { t: 'l', a: [34, 4], b: [78, 4], k: 'machine', w: 3 },
            { t: 'l', a: J('genou', [0, 4]), b: { j: 'genou', y: SOL }, k: 'machine', w: 2.6 },
            { t: 'l', a: J('genou', [-7, 3]), b: J('genou', [6, 3]), k: 'piece', w: 4.5, avant: true },
        ],
    },
    'a-rowing-barre': {
        legende: 'Buste penché dos plat, tire la barre vers le nombril',
        pauses: true,
        accent: ['tronc', 'bras'],
        poses: [
            { hanche: [40, 48], tronc: -25, tete: 4, main: [60, 62], coude: -1, pied: [46, 83], genou: -1, orteil: 0 },
            { hanche: [40, 48], tronc: -25, tete: 4, main: [50, 53], coude: -1, pied: [46, 83], genou: -1, orteil: 0 },
        ],
        decor: [sol(), disque('main'), { t: 'c', c: J('main'), r: 2.2, k: 'machine', avant: true }],
    },
    'a-dips': {
        legende: 'Descends coudes à 90°, puis remonte',
        pauses: true,
        accent: ['bras', 'ab', 'epaules'],
        poses: [
            { hanche: [56, 48], tronc: -96, tete: 4, main: [58, 50], coude: -1, pied: [44, 70], genou: 1, orteil: 100 },
            { hanche: [58, 60], tronc: -80, tete: 4, main: [58, 50], coude: -1, pied: [46, 81], genou: 1, orteil: 100 },
        ],
        decor: [
            sol(),
            { t: 'l', a: [36, 50.5], b: [90, 50.5], k: 'machine', w: 3 },
            { t: 'l', a: [40, 50], b: [40, SOL], k: 'machine', w: 3 },
            { t: 'l', a: [86, 50], b: [86, SOL], k: 'machine', w: 3 },
        ],
    },
    'a-curl-ez': {
        legende: 'Coudes collés, monte la barre vers les épaules',
        pauses: true,
        accent: ['bras', 'ab'],
        poses: [
            { hanche: [48, 46], tronc: -90, main: [51, 70], coude: -1, pied: [49, 83], genou: 1, orteil: 0 },
            { hanche: [48, 46], tronc: -90, main: [60, 27], coude: -1, pied: [49, 83], genou: 1, orteil: 0 },
        ],
        decor: [sol(), disque('main', [0, 0], 5.5), { t: 'c', c: J('main'), r: 1.8, k: 'machine', avant: true }],
    },
    'b-goblet-squat': {
        legende: 'Haltère contre la poitrine, descends cuisses parallèles',
        pauses: true,
        accent: ['cuisse', 'fessiers'],
        poses: [
            { hanche: [52, 47], tronc: -88, tete: 2, main: { rel: 'epaule', d: [7, 8] }, coude: 1, pied: [54, 83], genou: -1, orteil: 0 },
            { hanche: [42, 66], tronc: -62, tete: -20, main: { rel: 'epaule', d: [7, 8] }, coude: 1, pied: [54, 83], genou: -1, orteil: 0 },
        ],
        decor: [sol(), halt('main', [1, -1], 4)],
    },
    'b-squat-barre': {
        legende: 'Barre sur le haut du dos, descends cuisses parallèles',
        pauses: true,
        accent: ['cuisse', 'fessiers'],
        poses: [
            { hanche: [52, 47], tronc: -88, tete: 2, main: { rel: 'epaule', d: [-2, -2] }, coude: 1, pied: [54, 83], genou: -1, orteil: 0 },
            { hanche: [40, 65], tronc: -55, tete: -25, main: { rel: 'epaule', d: [-2, -2] }, coude: 1, pied: [54, 83], genou: -1, orteil: 0 },
        ],
        decor: [sol(), disque('epaule', [-3, 0], 7.5), { t: 'c', c: J('epaule', [-3, 0]), r: 2.2, k: 'machine', avant: true }],
    },
    'b-sdt-roumain-halteres': {
        legende: 'Fesses en arrière, dos plat, haltères le long des jambes',
        pauses: true,
        accent: ['cuisse', 'fessiers'],
        poses: [
            { hanche: [50, 47], tronc: -90, tete: 0, main: [53, 49], coude: -1, pied: [52, 83], genou: -1, orteil: 0 },
            { hanche: [42, 48], tronc: -22, tete: 6, main: [62, 64], coude: -1, pied: [52, 83], genou: -1, orteil: 0 },
        ],
        decor: [sol(), halt('main')],
    },
    'b-fentes-marchees': {
        legende: 'Grand pas, le genou arrière descend presque au sol',
        pauses: true,
        accent: ['cuisse', 'fessiers'],
        poses: [
            { hanche: [54, 47], tronc: -90, main: { rel: 'epaule', d: [1, 26] }, coude: 1, pied: [58, 83], genou: -1, orteil: 0, pied2: [48, 83], genou2: -1, orteil2: 0 },
            { hanche: [52, 58], tronc: -90, main: { rel: 'epaule', d: [1, 26] }, coude: 1, pied: [68, 83], genou: -1, orteil: 0, pied2: [30, 81], genou2: -1, orteil2: 30 },
        ],
        decor: [sol(), halt('main')],
    },
    'b-fentes-bulgares': {
        legende: 'Pied arrière sur le banc, descends à la verticale',
        pauses: true,
        accent: ['cuisse', 'fessiers'],
        poses: [
            { hanche: [52, 48], tronc: -86, main: { rel: 'epaule', d: [1, 26] }, coude: 1, pied: [62, 83], genou: -1, orteil: 0, pied2: [28, 61], genou2: -1, orteil2: 180 },
            { hanche: [50, 62], tronc: -82, main: { rel: 'epaule', d: [1, 26] }, coude: 1, pied: [62, 83], genou: -1, orteil: 0, pied2: [28, 61], genou2: -1, orteil2: 180 },
        ],
        decor: [sol(), ...banc(10, 63.5, 24), halt('main')],
    },
    'b-hip-thrust': {
        legende: 'Dos contre le banc, monte les hanches et serre les fessiers',
        pauses: true,
        accent: ['fessiers', 'cuisse'],
        poses: [
            { hanche: [44, 76], epaule: [24, 60], tete: 0, main: { rel: 'hanche', d: [1, -6] }, coude: 1, pied: [66, 82], genou: -1, orteil: 0 },
            { hanche: [46, 60], epaule: [22, 61], tete: 0, main: { rel: 'hanche', d: [1, -6] }, coude: 1, pied: [66, 82], genou: -1, orteil: 0 },
        ],
        decor: [sol(), ...banc(4, 62.5, 22), disque('hanche', [1, -6.5], 8.5), { t: 'c', c: J('hanche', [1, -6.5]), r: 2.2, k: 'machine', avant: true }],
    },
    'b-mollets-debout': {
        legende: 'Talons en bas, puis monte au maximum sur la pointe des pieds',
        pauses: true,
        accent: ['jambe'],
        poses: [
            { hanche: [50, 45], tronc: -90, main: { rel: 'epaule', d: [6, -2] }, coude: 1, pied: [52, 81], genou: -1, orteil: -15 },
            { hanche: [49, 39], tronc: -90, main: { rel: 'epaule', d: [6, -2] }, coude: 1, pied: [51, 75], genou: -1, orteil: 60 },
        ],
        decor: [
            sol(),
            { t: 'l', a: [84, SOL], b: [84, 4], k: 'machine', w: 3 },
            { t: 'l', a: [40, 4], b: [86, 4], k: 'machine', w: 3 },
            { t: 'l', a: J('epaule', [7, -3]), b: { j: 'epaule', d: [7, 0], y: 4 }, k: 'machine', w: 2.4 },
            { t: 'l', a: J('epaule', [-5, -3]), b: J('epaule', [7, -3]), k: 'piece', w: 5, avant: true },
            { t: 'r', x: 50, y: 79.5, w: 18, h: 4.5, rx: 1, k: 'piece' },
        ],
    },
    'b-abducteurs': {
        legende: 'Écarte les genoux contre les coussins, tiens 1 s',
        pauses: true,
        accent: ['hanches', 'cuisse'],
        poses: [
            { vue: 'face', cx: 60, epauleY: 28, hancheY: 56, mainD: [72, 58], coude: 1, piedD: [67, 83], genou: -1 },
            { vue: 'face', cx: 60, epauleY: 28, hancheY: 56, mainD: [72, 58], coude: 1, piedD: [80, 83], genou: -1 },
        ],
        decor: [
            sol(),
            { t: 'r', x: 50, y: 20, w: 20, h: 38, rx: 3, k: 'piece' },
            { t: 'r', x: 44, y: 57, w: 32, h: 5, rx: 2, k: 'piece' },
            { t: 'l', a: J('genouD', [4, -5]), b: J('genouD', [4, 5]), k: 'piece', w: 4, avant: true },
            { t: 'l', a: J('genouG', [-4, -5]), b: J('genouG', [-4, 5]), k: 'piece', w: 4, avant: true },
        ],
    },
    'b-releve-genoux': {
        legende: 'Suspendu, monte les genoux vers la poitrine',
        pauses: true,
        accent: ['tronc', 'cuisse'],
        poses: [
            { hanche: [50, 52], tronc: -90, tete: 0, main: [51, 5], coude: 1, pied: [51, 88], genou: -1, orteil: 60 },
            { hanche: [50, 50], tronc: -94, tete: 0, main: [51, 5], coude: 1, pied: [66, 66], genou: -1, orteil: 60 },
        ],
        decor: [{ t: 'l', a: [28, 4.5], b: [76, 4.5], k: 'machine', w: 3 }],
    },
    'b-releve-jambes': {
        legende: 'Suspendu, monte les jambes tendues à l’horizontale',
        pauses: true,
        accent: ['tronc', 'cuisse'],
        poses: [
            { hanche: [50, 52], tronc: -90, tete: 0, main: [51, 5], coude: 1, pied: [51, 88], genou: -1, orteil: 60 },
            { hanche: [48, 50], tronc: -96, tete: 0, main: [51, 5], coude: 1, pied: [84, 46], genou: -1, orteil: -20 },
        ],
        decor: [{ t: 'l', a: [28, 4.5], b: [76, 4.5], k: 'machine', w: 3 }],
    },
    'b-pallof': {
        legende: 'Tends les bras devant toi sans laisser le buste tourner',
        pauses: true,
        accent: ['tronc'],
        poses: [
            { hanche: [48, 47], tronc: -90, main: { rel: 'epaule', d: [5, 9] }, coude: 1, pied: [50, 83], genou: -1, orteil: 0, pied2: [44, 83], orteil2: 0 },
            { hanche: [48, 47], tronc: -90, main: [73, 31], coude: 1, pied: [50, 83], genou: -1, orteil: 0, pied2: [44, 83], orteil2: 0 },
        ],
        decor: [
            sol(),
            ...colonne(102, 31),
            { t: 'l', a: [100, 31], b: J('main'), k: 'cable', w: 1 },
            { t: 'l', a: J('main', [0, -3]), b: J('main', [0, 3]), k: 'piece', w: 3, avant: true },
        ],
    },
    'b-crunch-poulie': {
        legende: 'À genoux, enroule le dos pour amener les coudes aux genoux',
        pauses: true,
        accent: ['tronc'],
        poses: [
            { hanche: [48, 60], tronc: -82, tete: 0, main: { rel: 'epaule', d: [5, -7] }, coude: 1, pied: [32, 82], genou: -1, orteil: 180 },
            { hanche: [48, 60], tronc: -22, tete: 30, main: { rel: 'epaule', d: [7, 3] }, coude: 1, pied: [32, 82], genou: -1, orteil: 180 },
        ],
        decor: [sol(), ...colonne(98, 8), { t: 'l', a: [96, 8], b: J('main'), k: 'cable', w: 1 }, ...corde()],
    },
    'd-rowing-elastique': {
        legende: 'Assis, tire l’élastique vers le bas des côtes',
        pauses: true,
        accent: ['tronc', 'bras'],
        poses: [
            { hanche: [36, 80], tronc: -95, tete: 0, main: [58, 64], coude: -1, pied: [72, 81], genou: 1, orteil: -80 },
            { hanche: [36, 80], tronc: -98, tete: 0, main: [42, 64], coude: -1, pied: [72, 81], genou: 1, orteil: -80 },
        ],
        decor: [sol(), { t: 'l', a: J('cheville', [3, -3]), b: J('main'), k: 'elastique', w: 1.6 }],
    },
    'd-pike-pushup': {
        legende: 'Fesses en l’air, descends la tête entre les mains',
        pauses: true,
        accent: ['bras', 'epaules'],
        poses: [
            { hanche: [50, 48], tronc: 30, tete: 20, main: [80, 83], coude: -1, pied: [36, 82], genou: 1, orteil: 100 },
            { hanche: [50, 50], tronc: 48, tete: 15, main: [80, 83], coude: -1, pied: [36, 82], genou: 1, orteil: 100 },
        ],
        decor: [sol()],
    },
    'd-pompes-surelevees': {
        legende: 'Pieds sur une chaise, corps aligné, poitrine près du sol',
        pauses: true,
        accent: ['bras', 'epaules', 'tronc'],
        poses: [
            { hanche: [51, 60], tronc: -8, tete: 4, main: [77, 83], coude: 1, pied: [16, 65], genou: 1, orteil: 160 },
            { hanche: [52, 70], tronc: 12, tete: 4, main: [77, 83], coude: 1, pied: [16, 65], genou: 1, orteil: 160 },
        ],
        decor: [sol(), ...banc(2, 67, 20)],
    },
    'd-pont-une-jambe': {
        legende: 'Une jambe tendue, pousse dans le talon et monte le bassin',
        pauses: true,
        accent: ['fessiers'],
        poses: [
            { hanche: [44, 80], epaule: [20, 80], tete: 0, main: [46, 82.5], coude: -1, pied: [66, 82], genou: -1, orteil: 0, pied2: [78, 68], genou2: -1, orteil2: -30 },
            { hanche: [46, 63], epaule: [22, 79], tete: 0, main: [48, 82.5], coude: -1, pied: [66, 82], genou: -1, orteil: 0, pied2: [78, 46], genou2: -1, orteil2: -40 },
        ],
        decor: [sol()],
    },
    'd-dead-bug': {
        legende: 'Dos plaqué au sol, tends un bras et la jambe opposée',
        pauses: true,
        accent: ['tronc'],
        poses: [
            { hanche: [58, 80], epaule: [34, 80], tete: 0, main: [36, 54], coude: 1, main2: [37, 54], coude2: 1, pied: [76, 62], genou: -1, orteil: -60, pied2: [77, 62], genou2: -1, orteil2: -60 },
            { hanche: [58, 80], epaule: [34, 80], tete: 0, main: [11, 73], coude: 1, main2: [37, 54], coude2: 1, pied: [76, 62], genou: -1, orteil: -60, pied2: [94, 77], genou2: -1, orteil2: -20 },
        ],
        decor: [sol()],
    },
    'd-ytw': {
        legende: 'Allongé sur le ventre, décolle les bras en Y, T puis W',
        pauses: true,
        accent: ['epaules', 'bras'],
        poses: [
            { hanche: [52, 79], epaule: [76, 78], tete: 0, main: [101, 80], coude: -1, pied: [15, 80.5], genou: 1, orteil: 100 },
            { hanche: [52, 79], epaule: [76, 76.5], tete: -6, main: [100, 69], coude: -1, pied: [15, 80.5], genou: 1, orteil: 100 },
        ],
        decor: [sol()],
    },
    'd-hollow': {
        legende: 'Sur le dos, épaules et jambes décollées, bas du dos au sol',
        duree: 3,
        accent: ['tronc'],
        poses: [
            { hanche: [58, 80], epaule: [36, 76], tete: 0, main: [12, 70], coude: 1, pied: [94, 74], genou: 1, orteil: -10 },
            { hanche: [58, 80.5], epaule: [36, 76.6], tete: 0, main: [12, 70.6], coude: 1, pied: [94, 74.6], genou: 1, orteil: -10 },
        ],
        decor: [sol()],
    },
}

// Variantes qui réutilisent un dessin existant (même mouvement, autre matériel ou autre niveau).
const SQUAT_BARRE = ILLUSTRATIONS['b-squat-barre']
ILLUSTRATIONS['b-squat-smith'] = {
    ...SQUAT_BARRE,
    legende: 'Barre guidée sur le haut du dos, descends cuisses parallèles',
    decor: [{ t: 'l', a: [28, SOL], b: [28, 4], k: 'machine', w: 3 }, { t: 'l', a: [80, SOL], b: [80, 4], k: 'machine', w: 3 }, ...SQUAT_BARRE.decor],
}
ILLUSTRATIONS['b-sdt-roumain-barre'] = {
    ...ILLUSTRATIONS['b-sdt-roumain-halteres'],
    legende: 'Fesses en arrière, dos plat, barre le long des cuisses',
    decor: [sol(), disque('main'), { t: 'c', c: J('main'), r: 2.2, k: 'machine', avant: true }],
}
ILLUSTRATIONS['d-bulgare'] = {
    ...ILLUSTRATIONS['b-fentes-bulgares'],
    legende: 'Pied arrière sur une chaise, descends à la verticale',
    decor: [sol(), ...banc(10, 63.5, 24)],
}
const GOBLET = ILLUSTRATIONS['b-goblet-squat']
ILLUSTRATIONS['d-squat'] = {
    ...GOBLET,
    legende: 'Descends cuisses parallèles, talons au sol',
    poses: (GOBLET.poses as PoseCote[]).map((p) => ({ ...p, main: { rel: 'epaule', d: [16, 6] } })),
    decor: [sol()],
}
ILLUSTRATIONS['d-squat-saute'] = {
    legende: 'Squat, puis saute haut et réceptionne-toi en souplesse',
    duree: 1.4,
    accent: ['cuisse', 'jambe', 'fessiers'],
    poses: [
        { hanche: [44, 64], tronc: -62, tete: -20, main: { rel: 'epaule', d: [14, 10] }, coude: 1, pied: [54, 83], genou: -1, orteil: 0 },
        { hanche: [52, 40], tronc: -88, tete: 0, main: { rel: 'epaule', d: [6, -14] }, coude: 1, pied: [54, 76], genou: -1, orteil: 60 },
        { hanche: [52, 46], tronc: -86, tete: 0, main: { rel: 'epaule', d: [10, 14] }, coude: 1, pied: [54, 82], genou: -1, orteil: 5 },
    ],
    decor: [sol()],
}
const MOLLETS_MARCHE = (uneJambe: boolean): Def => ({
    legende: uneJambe ? 'Sur une jambe : descends lentement, monte au maximum' : 'Talons dans le vide : descends bas, monte au maximum',
    pauses: true,
    accent: ['jambe'],
    poses: [
        { hanche: [50, 46], tronc: -90, main: [70, 30], coude: 1, pied: [52, 82], genou: -1, orteil: -25, ...(uneJambe ? { pied2: [40, 72], genou2: -1, orteil2: 30 } : {}) },
        { hanche: [49, 40], tronc: -90, main: [70, 26], coude: 1, pied: [51, 76], genou: -1, orteil: 60, ...(uneJambe ? { pied2: [39, 66], genou2: -1, orteil2: 30 } : {}) },
    ],
    decor: [
        { t: 'r', x: 50, y: 82.5, w: 30, h: 5, rx: 1, k: 'piece' },
        { t: 'r', x: 80, y: 0, w: 6, h: 90, rx: 1, k: 'piece' },
        { t: 'l', a: [4, 88], b: [50, 88], k: 'sol', w: 1.4 },
    ],
})
ILLUSTRATIONS['d-mollets-marche'] = MOLLETS_MARCHE(false)
ILLUSTRATIONS['d-mollets-une-jambe'] = MOLLETS_MARCHE(true)

const ALIAS: Record<string, string> = {
    'a-tirage-serre': 'a-lat-pulldown',
    'a-elev-lat-poulie': 'a-elev-lat-halteres',
    'e-endurance': 'c-course',
    'c-fond': 'c-course',
    'c-acceleration': 'c-course',
    'c-30-30': 'c-course',
    'c-15-15': 'c-course',
    'f-fractionne': 'c-course',
    'd-planche': 'b-planche',
    'c-course-1': 'c-course',
    'c-course-2': 'c-course',
    'c-course-3': 'c-course',
    'c-course-5': 'c-course',
    'c-tempo': 'c-course',
    'c-vitesse': 'c-course',
    'c-fractionne-2': 'c-fractionne',
    'c-fractionne-3': 'c-fractionne',
    'c-fractionne-4': 'c-fractionne',
    'c-fractionne-5': 'c-fractionne',
    'c-marche-2': 'c-marche-inclinee',
    'c-marche-3': 'c-marche-inclinee',
    'c-marche-4': 'c-marche-inclinee',
    'c-marche-5': 'c-marche-inclinee',
}
const vraiId = (id: string) => ALIAS[id] ?? id

// ---------- Rendu (données prêtes pour le SVG) ----------

export type Forme = {
    tag: 'line' | 'circle' | 'rect'
    sorte: Sorte
    w?: number
    vide?: boolean
    // valeurs par pose (une seule = fixe)
    attrs: Record<string, number[]>
}

function resoudre(c: C, j: Joints, i: number): P {
    if (Array.isArray(c)) return c
    if ('v' in c) return c.v[i] ?? c.v[0]
    const p = j[c.j]
    if (!p) return [0, 0]
    const q = c.d ? add(p, c.d) : p
    return [c.x ?? q[0], c.y ?? q[1]]
}

const SEGS_COTE: [Seg, string, string, boolean][] = [
    ['cuisse', 'hanche', 'genou', false],
    ['jambe', 'genou', 'cheville', false],
    ['pied', 'cheville', 'orteil', false],
    ['tronc', 'hanche', 'epaule', false],
    ['bras', 'epaule', 'coude', false],
    ['ab', 'coude', 'main', false],
]
const SEGS_LOIN: [Seg, string, string][] = [
    ['cuisse', 'hanche', 'genou2'],
    ['jambe', 'genou2', 'cheville2'],
    ['pied', 'cheville2', 'orteil2'],
    ['bras', 'epaule', 'coude2'],
    ['ab', 'coude2', 'main2'],
]
const SEGS_FACE: [Seg, string, string][] = [
    ['cuisse', 'hancheD', 'genouD'],
    ['jambe', 'genouD', 'chevilleD'],
    ['pied', 'chevilleD', 'orteilD'],
    ['cuisse', 'hancheG', 'genouG'],
    ['jambe', 'genouG', 'chevilleG'],
    ['pied', 'chevilleG', 'orteilG'],
    ['tronc', 'bassin', 'cou'],
    ['hanches', 'hancheG', 'hancheD'],
    ['epaules', 'epauleG', 'epauleD'],
    ['trapezes', 'cou', 'epauleD'],
    ['trapezes', 'cou', 'epauleG'],
    ['bras', 'epauleD', 'coudeD'],
    ['ab', 'coudeD', 'mainD'],
    ['bras', 'epauleG', 'coudeG'],
    ['ab', 'coudeG', 'mainG'],
]

export type Illustration = { formes: Forme[]; temps: number[]; duree: number; legende: string }

export function illustration(id: string): Illustration | null {
    const def = ILLUSTRATIONS[vraiId(id)]
    if (!def) return null
    const js = def.poses.map(joints)
    const n = js.length
    // Séquence d'images clés : aller-retour avec temps de pause pour 2 poses, boucle pour plus.
    let ordre: number[]
    let temps: number[]
    if (n === 2 && def.pauses) {
        ordre = [0, 1, 1, 0, 0]
        temps = [0, 0.38, 0.5, 0.88, 1]
    } else if (n === 2) {
        ordre = [0, 1, 0]
        temps = [0, 0.5, 1]
    } else {
        ordre = [...js.keys(), 0]
        temps = ordre.map((_, i) => i / n)
    }
    const seq = (f: (j: Joints, i: number) => number) => {
        const v = ordre.map((i) => Math.round(f(js[i], i) * 10) / 10)
        return v.every((x) => x === v[0]) ? [v[0]] : v
    }
    const formes: Forme[] = []
    const ligne = (sorte: Sorte, a: (j: Joints, i: number) => P, b: (j: Joints, i: number) => P, w?: number) =>
        formes.push({
            tag: 'line',
            sorte,
            w,
            attrs: {
                x1: seq((j, i) => a(j, i)[0]),
                y1: seq((j, i) => a(j, i)[1]),
                x2: seq((j, i) => b(j, i)[0]),
                y2: seq((j, i) => b(j, i)[1]),
            },
        })
    const decor = (avant: boolean) => {
        for (const e of def.decor) {
            if (!!e.avant !== avant) continue
            if (e.t === 'l') ligne(e.k, (j, i) => resoudre(e.a, j, i), (j, i) => resoudre(e.b, j, i), e.w)
            else if (e.t === 'c')
                formes.push({
                    tag: 'circle',
                    sorte: e.k,
                    vide: e.vide,
                    attrs: { cx: seq((j, i) => resoudre(e.c, j, i)[0]), cy: seq((j, i) => resoudre(e.c, j, i)[1]), r: [e.r] },
                })
            else formes.push({ tag: 'rect', sorte: e.k, attrs: { x: [e.x], y: [e.y], width: [e.w], height: [e.h], rx: [e.rx ?? 0] } })
        }
    }
    const acc = (s: Seg): Sorte => (def.accent.includes(s) ? 'accent' : 'corps')
    decor(false)
    if (def.sansCorps) {
        decor(true)
        return { formes, temps, duree: def.duree ?? 2.2, legende: def.legende ?? '' }
    }
    const face = 'vue' in def.poses[0]
    if (face) {
        for (const [s, a, b] of SEGS_FACE) {
            const k = s === 'hanches' || s === 'trapezes' ? (def.accent.includes(s) ? 'accent' : null) : acc(s)
            if (!k) continue
            ligne(k, (j) => j[a], (j) => j[b], s === 'tronc' ? 7 : s === 'epaules' ? 5 : s === 'trapezes' || s === 'hanches' ? 3.6 : undefined)
        }
        if (def.accent.includes('epaules'))
            for (const cote of ['epauleD', 'epauleG'])
                formes.push({ tag: 'circle', sorte: 'accent', attrs: { cx: seq((j) => j[cote][0]), cy: seq((j) => j[cote][1]), r: [3.4] } })
    } else {
        if (js[0].genou2)
            for (const [, a, b] of SEGS_LOIN.slice(0, 3)) ligne('loin', (j) => j[a], (j) => j[b])
        if (js[0].coude2)
            for (const [, a, b] of SEGS_LOIN.slice(3)) ligne('loin', (j) => j[a], (j) => j[b])
        for (const [s, a, b] of SEGS_COTE) ligne(acc(s), (j) => j[a], (j) => j[b], s === 'tronc' ? 7 : undefined)
        if (def.accent.includes('fessiers') || def.accent.includes('hanches'))
            formes.push({ tag: 'circle', sorte: 'accent', attrs: { cx: seq((j) => j.hanche[0]), cy: seq((j) => j.hanche[1]), r: [4.6] } })
        if (def.accent.includes('epaules'))
            formes.push({ tag: 'circle', sorte: 'accent', attrs: { cx: seq((j) => j.epaule[0]), cy: seq((j) => j.epaule[1]), r: [3.8] } })
    }
    formes.push({ tag: 'circle', sorte: 'corps', attrs: { cx: seq((j) => j.tete[0]), cy: seq((j) => j.tete[1]), r: [L.tete] } })
    decor(true)
    return { formes, temps, duree: def.duree ?? (def.pauses ? 2.8 : 2.2), legende: def.legende ?? '' }
}

export const aUneIllustration = (id: string) => vraiId(id) in ILLUSTRATIONS

export const legendeDe = (id: string) => ILLUSTRATIONS[vraiId(id)]?.legende ?? ''
