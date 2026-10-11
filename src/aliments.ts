// Guide des aliments : pour chaque nutriment, des idées simples rangées en trois colonnes
// (aux repas · facile & rapide · à grignoter). Les portions sont des repères, pas des pesées.

export type Aliment = { n: string; e: string; p?: string }
export type GuideNutriment = {
    libelle: string
    emoji: string
    motifs: RegExp // pour reconnaître le nutriment dans les analyses du coach (texte sans accents)
    role: string
    astuce?: string
    repas: Aliment[]
    facile: Aliment[]
    grignoter: Aliment[]
}

export const GUIDE: GuideNutriment[] = [
    {
        libelle: 'Protéines',
        emoji: '🥚',
        motifs: /protein/,
        role: 'Construire et réparer le muscle après la séance.',
        astuce: 'Vise une source de protéines à chaque repas, pas tout le soir.',
        repas: [
            { n: 'Poulet (blanc)', e: '🍗', p: '120 g ≈ 30 g' },
            { n: 'Steak haché 5 %', e: '🥩', p: '1 steak ≈ 20 g' },
            { n: 'Œufs', e: '🥚', p: '3 œufs ≈ 18 g' },
            { n: 'Saumon / maquereau', e: '🐟', p: '1 pavé ≈ 25 g' },
            { n: 'Lentilles', e: '🫘', p: '1 assiette ≈ 12 g' },
            { n: 'Tofu', e: '🧈', p: '100 g ≈ 12 g' },
        ],
        facile: [
            { n: 'Thon en boîte', e: '🥫', p: '1 boîte ≈ 25 g' },
            { n: 'Skyr', e: '🥛', p: '1 pot ≈ 15 g' },
            { n: 'Fromage blanc', e: '🥣', p: '1 bol ≈ 15 g' },
            { n: 'Jambon blanc', e: '🍖', p: '2 tranches ≈ 15 g' },
            { n: 'Œufs durs (cuits d’avance)', e: '🥚', p: '2 œufs ≈ 12 g' },
        ],
        grignoter: [
            { n: 'Amandes', e: '🌰', p: '1 poignée ≈ 6 g' },
            { n: 'Cacahuètes', e: '🥜', p: '1 poignée ≈ 7 g' },
            { n: 'Fromage en portion', e: '🧀', p: '1 portion ≈ 5 g' },
            { n: 'Lait (1 verre)', e: '🥛', p: '≈ 8 g' },
            { n: 'Pain complet + beurre de cacahuète', e: '🍞', p: '≈ 8 g' },
        ],
    },
    {
        libelle: 'Glucides complexes',
        emoji: '🍚',
        motifs: /glucides complexes|feculent|complet/,
        role: 'L’énergie qui tient longtemps : séances et soirées de révision.',
        astuce: 'Un féculent 2–3 h avant la salle, pas juste avant.',
        repas: [
            { n: 'Riz (basmati ou complet)', e: '🍚' },
            { n: 'Pâtes complètes', e: '🍝' },
            { n: 'Pommes de terre', e: '🥔' },
            { n: 'Patate douce', e: '🍠' },
            { n: 'Quinoa', e: '🌾' },
        ],
        facile: [
            { n: 'Flocons d’avoine', e: '🥣', p: 'porridge en 2 min' },
            { n: 'Pain complet', e: '🍞' },
            { n: 'Riz en sachet micro-ondes', e: '🍚', p: '2 min' },
            { n: 'Semoule', e: '🥄', p: '5 min, eau chaude' },
            { n: 'Wraps complets', e: '🌯' },
        ],
        grignoter: [
            { n: 'Banane', e: '🍌' },
            { n: 'Galettes de riz', e: '🍘' },
            { n: 'Barre de céréales à l’avoine', e: '🍫' },
            { n: 'Dattes', e: '🌴', p: '3–4' },
        ],
    },
    {
        libelle: 'Fibres',
        emoji: '🥦',
        motifs: /fibre/,
        role: 'Digestion, ventre calé plus longtemps, moins de grignotage sucré.',
        repas: [
            { n: 'Brocoli', e: '🥦' },
            { n: 'Haricots verts', e: '🫛' },
            { n: 'Pois chiches / lentilles', e: '🫘' },
            { n: 'Légumes poêlés surgelés', e: '🥘', p: 'sans rien couper' },
            { n: 'Courgettes', e: '🥒' },
        ],
        facile: [
            { n: 'Carottes râpées (barquette)', e: '🥕' },
            { n: 'Tomates cerises', e: '🍅' },
            { n: 'Salade en sachet', e: '🥬' },
            { n: 'Flocons d’avoine', e: '🥣' },
            { n: 'Pain complet', e: '🍞' },
        ],
        grignoter: [
            { n: 'Pomme (avec la peau)', e: '🍎' },
            { n: 'Poire', e: '🍐' },
            { n: 'Pruneaux', e: '🟣', p: '4–5' },
            { n: 'Carottes en bâtonnets', e: '🥕' },
        ],
    },
    {
        libelle: 'Oméga-3',
        emoji: '🐟',
        motifs: /omega/,
        role: 'Récupération, peau, concentration.',
        astuce: 'Poisson gras 2 fois par semaine suffit.',
        repas: [
            { n: 'Saumon', e: '🐟' },
            { n: 'Maquereau', e: '🐟' },
            { n: 'Sardines', e: '🐟' },
            { n: 'Truite', e: '🐠' },
            { n: 'Huile de colza (assaisonnement)', e: '🫗', p: '1 c. à soupe' },
        ],
        facile: [
            { n: 'Sardines en boîte', e: '🥫', p: '1 boîte' },
            { n: 'Maquereau en boîte', e: '🥫', p: '1 boîte' },
            { n: 'Œufs enrichis oméga-3', e: '🥚' },
            { n: 'Graines de chia ou lin dans un yaourt', e: '🥄', p: '1 c. à soupe' },
        ],
        grignoter: [
            { n: 'Noix', e: '🌰', p: '1 poignée' },
            { n: 'Sardines sur pain complet', e: '🍞' },
            { n: 'Skyr + graines de lin', e: '🥛' },
        ],
    },
    {
        libelle: 'Fer',
        emoji: '🫘',
        motifs: /\bfer\b/,
        role: 'Transporter l’oxygène : moins de fatigue et d’essoufflement.',
        astuce: 'Mange-le avec de la vitamine C (agrume, poivron, kiwi) et évite thé/café au même repas.',
        repas: [
            { n: 'Bœuf', e: '🥩', p: 'le mieux absorbé' },
            { n: 'Lentilles', e: '🫘' },
            { n: 'Moules', e: '🦪' },
            { n: 'Pois chiches', e: '🫘' },
            { n: 'Épinards', e: '🥬' },
        ],
        facile: [
            { n: 'Houmous', e: '🥣' },
            { n: 'Céréales enrichies en fer', e: '🥣' },
            { n: 'Sardines en boîte', e: '🥫' },
            { n: 'Œufs', e: '🥚' },
        ],
        grignoter: [
            { n: 'Abricots secs', e: '🍑', p: '5–6' },
            { n: 'Graines de courge', e: '🎃', p: '1 poignée' },
            { n: 'Chocolat noir 70 %', e: '🍫', p: '2 carrés' },
            { n: 'Pistaches', e: '🥜' },
        ],
    },
    {
        libelle: 'Calcium',
        emoji: '🥛',
        motifs: /calcium/,
        role: 'Os solides — important à ton âge, ils se construisent encore.',
        repas: [
            { n: 'Fromage (comté, emmental)', e: '🧀', p: '30 g' },
            { n: 'Brocoli', e: '🥦' },
            { n: 'Sardines (avec arêtes)', e: '🐟' },
            { n: 'Tofu', e: '🧈' },
        ],
        facile: [
            { n: 'Yaourt nature', e: '🥛', p: '1 pot' },
            { n: 'Skyr', e: '🥛' },
            { n: 'Lait', e: '🥛', p: '1 verre' },
            { n: 'Eau riche en calcium', e: '💧', p: 'Hépar, Contrex, Courmayeur' },
        ],
        grignoter: [
            { n: 'Fromage en portion', e: '🧀' },
            { n: 'Yaourt à boire', e: '🥤' },
            { n: 'Amandes', e: '🌰' },
            { n: 'Figues sèches', e: '🟤', p: '3' },
        ],
    },
    {
        libelle: 'Potassium',
        emoji: '🍌',
        motifs: /potassium/,
        role: 'Contraction musculaire, limite les crampes.',
        repas: [
            { n: 'Pommes de terre (avec la peau)', e: '🥔' },
            { n: 'Patate douce', e: '🍠' },
            { n: 'Haricots blancs', e: '🫘' },
            { n: 'Saumon', e: '🐟' },
            { n: 'Épinards', e: '🥬' },
        ],
        facile: [
            { n: 'Banane', e: '🍌' },
            { n: 'Avocat', e: '🥑' },
            { n: 'Tomates', e: '🍅' },
            { n: 'Jus d’orange', e: '🧃', p: '1 verre' },
        ],
        grignoter: [
            { n: 'Banane', e: '🍌' },
            { n: 'Abricots secs', e: '🍑' },
            { n: 'Dattes', e: '🌴' },
            { n: 'Raisins secs', e: '🍇', p: '1 poignée' },
        ],
    },
    {
        libelle: 'Magnésium',
        emoji: '🌰',
        motifs: /magnesium/,
        role: 'Anti-fatigue, crampes, sommeil — utile en période de DS.',
        repas: [
            { n: 'Riz complet', e: '🍚' },
            { n: 'Lentilles / haricots', e: '🫘' },
            { n: 'Quinoa', e: '🌾' },
            { n: 'Épinards', e: '🥬' },
        ],
        facile: [
            { n: 'Pain complet', e: '🍞' },
            { n: 'Flocons d’avoine', e: '🥣' },
            { n: 'Eau riche en magnésium', e: '💧', p: 'Hépar, Rozana' },
            { n: 'Avocat', e: '🥑' },
        ],
        grignoter: [
            { n: 'Amandes', e: '🌰', p: '1 poignée' },
            { n: 'Noix de cajou', e: '🥜' },
            { n: 'Chocolat noir 70 %', e: '🍫', p: '2 carrés' },
            { n: 'Graines de courge', e: '🎃' },
            { n: 'Banane', e: '🍌' },
        ],
    },
    {
        libelle: 'Vitamine C',
        emoji: '🍊',
        motifs: /vitamine c\b|vit\.? c\b/,
        role: 'Défenses, belle peau (collagène), et aide à absorber le fer.',
        astuce: '1 à 2 kiwis couvrent presque ta journée.',
        repas: [
            { n: 'Poivron', e: '🫑', p: 'le champion' },
            { n: 'Brocoli', e: '🥦' },
            { n: 'Chou-fleur / choux de Bruxelles', e: '🥬' },
            { n: 'Tomates', e: '🍅' },
        ],
        facile: [
            { n: 'Orange', e: '🍊' },
            { n: 'Kiwi', e: '🥝' },
            { n: 'Poivron cru en lamelles', e: '🫑' },
            { n: 'Fraises', e: '🍓' },
        ],
        grignoter: [
            { n: 'Kiwi', e: '🥝' },
            { n: 'Clémentines', e: '🍊', p: '2' },
            { n: 'Fraises', e: '🍓' },
            { n: 'Ananas', e: '🍍' },
        ],
    },
    {
        libelle: 'Vitamine A',
        emoji: '🥕',
        motifs: /vitamine a\b|beta-?carotene/,
        role: 'Peau et vue.',
        repas: [
            { n: 'Carottes', e: '🥕' },
            { n: 'Patate douce', e: '🍠' },
            { n: 'Potiron / butternut', e: '🎃' },
            { n: 'Épinards', e: '🥬' },
            { n: 'Œufs', e: '🥚' },
        ],
        facile: [
            { n: 'Carottes râpées', e: '🥕' },
            { n: 'Poivron rouge', e: '🫑' },
            { n: 'Mangue', e: '🥭' },
            { n: 'Œufs durs', e: '🥚' },
        ],
        grignoter: [
            { n: 'Abricots secs', e: '🍑' },
            { n: 'Mangue', e: '🥭' },
            { n: 'Carottes en bâtonnets', e: '🥕' },
            { n: 'Melon', e: '🍈' },
        ],
    },
    {
        libelle: 'Zinc',
        emoji: '⚙️',
        motifs: /zinc/,
        role: 'Peau (imperfections), cicatrisation, défenses.',
        repas: [
            { n: 'Bœuf', e: '🥩' },
            { n: 'Poulet (cuisse)', e: '🍗' },
            { n: 'Lentilles', e: '🫘' },
            { n: 'Pois chiches', e: '🫘' },
            { n: 'Huîtres', e: '🦪', p: 'le champion' },
        ],
        facile: [
            { n: 'Œufs', e: '🥚' },
            { n: 'Fromage (comté, emmental)', e: '🧀' },
            { n: 'Flocons d’avoine', e: '🥣' },
            { n: 'Jambon', e: '🍖' },
        ],
        grignoter: [
            { n: 'Graines de courge', e: '🎃', p: '1 poignée' },
            { n: 'Noix de cajou', e: '🥜' },
            { n: 'Cacahuètes', e: '🥜' },
            { n: 'Amandes', e: '🌰' },
        ],
    },
    {
        libelle: 'Vitamine D',
        emoji: '☀️',
        motifs: /vitamine d\b|vit\.? d\b/,
        role: 'Os, muscles et défenses.',
        astuce: 'Le soleil en fait l’essentiel ; d’octobre à mars c’est dur d’en avoir assez. Pas de complément sans avis d’un médecin.',
        repas: [
            { n: 'Saumon', e: '🐟' },
            { n: 'Maquereau', e: '🐟' },
            { n: 'Sardines', e: '🐟' },
            { n: 'Œufs (le jaune)', e: '🥚' },
        ],
        facile: [
            { n: 'Sardines en boîte', e: '🥫' },
            { n: 'Maquereau en boîte', e: '🥫' },
            { n: 'Œufs durs', e: '🥚' },
            { n: 'Laitages enrichis en vitamine D', e: '🥛' },
        ],
        grignoter: [
            { n: 'Œuf dur', e: '🥚' },
            { n: 'Sardines sur pain complet', e: '🍞' },
            { n: 'Yaourt enrichi en vitamine D', e: '🥛' },
        ],
    },
]

const MOTS_VIDES = new Set(['eau', 'des', 'les', 'aux', 'sur', 'une', 'avec', 'dans', 'sans', 'pour', 'blanc', 'boite', 'enrichi', 'enrichis', 'complet', 'complets', 'cuits', 'portion'])
export const sansAccent = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Mot-clé d'un aliment pour savoir s'il est déjà dans la liste de la semaine (« Thon en boîte » → « thon »). */
function cles(nom: string): string[] {
    return sansAccent(nom)
        .replace(/[’'()/+,%]/g, ' ')
        .split(/\s+/)
        .filter((m) => m.length >= 3 && !MOTS_VIDES.has(m))
        .slice(0, 1)
        .map((m) => m.replace(/(s|x)$/, ''))
}

export function dansLaListe(aliment: Aliment, nomsListe: string[]): boolean {
    const [cle] = cles(aliment.n)
    if (!cle) return false
    return nomsListe.some((nom) => sansAccent(nom).includes(cle))
}
