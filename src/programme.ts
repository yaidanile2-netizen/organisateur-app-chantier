// Programme de la semaine : 4 séances, la muscu d'abord, orientée callisthénie (novembre 2026).
//   A tirer + pousser (vers le muscle-up) · B jambes + gainage (vers le pistol et le L-sit)
//   C cardio athlétique (salle / dehors) · D skills (handstand, front lever), à la salle ou à la maison.
// Objectif cardio de Daniel : retrouver la forme de quand il jouait au basket — se sentir fort,
// rapide et léger, enchaîner des efforts comme dans un match sans être fatigué. Les 10 km sans
// s'arrêter d'ici fin juin 2027 sont un bonus, pas la priorité.
// Chaque séance a ses niveaux, que Daniel change lui-même dans l'app.

export type Muscle =
    | 'pectoraux'
    | 'epaules'
    | 'deltoides-arriere'
    | 'trapezes'
    | 'dos'
    | 'biceps'
    | 'triceps'
    | 'avant-bras'
    | 'abdos'
    | 'obliques'
    | 'lombaires'
    | 'fessiers'
    | 'moyen-fessier'
    | 'quadriceps'
    | 'ischios'
    | 'mollets'
    | 'cardio'

export const MUSCLES: Record<Muscle, string> = {
    pectoraux: 'Pectoraux',
    epaules: 'Épaules',
    'deltoides-arriere': 'Arrière d’épaules',
    trapezes: 'Trapèzes',
    dos: 'Dos',
    biceps: 'Biceps',
    triceps: 'Triceps',
    'avant-bras': 'Avant-bras',
    abdos: 'Abdos',
    obliques: 'Obliques',
    lombaires: 'Lombaires',
    fessiers: 'Fessiers',
    'moyen-fessier': 'Moyen fessier',
    quadriceps: 'Quadriceps',
    ischios: 'Ischios',
    mollets: 'Mollets',
    cardio: 'Cardio',
}

export type Materiel = 'machine' | 'poulie' | 'halteres' | 'barre' | 'corps' | 'elastique' | 'cardio'

export const MATERIEL: Record<Materiel, { emoji: string; libelle: string }> = {
    machine: { emoji: '🏋️', libelle: 'Machine' },
    poulie: { emoji: '🪢', libelle: 'Poulie' },
    halteres: { emoji: '🏋️', libelle: 'Haltères' },
    barre: { emoji: '🏋️', libelle: 'Barre' },
    corps: { emoji: '🤸', libelle: 'Poids du corps' },
    elastique: { emoji: '🎗️', libelle: 'Élastique' },
    cardio: { emoji: '🚴', libelle: 'Cardio' },
}

export type Exercice = {
    id: string
    muscles: Muscle[]
    materiel: Materiel
    nom: string
    machine: string
    series: number
    reps: string
    consignes: string[]
    alternative?: string
    charge?: boolean // false pour les exercices sans charge (planche, cardio)
    parHaltere?: boolean // la charge notée est celle d'un seul haltère
    assistance?: boolean // machine d'assistance : moins de kg = plus dur
    mesure?: 'km' | 'reps' | 'sec' // on note la distance (km), le meilleur nombre de reps ou la meilleure tenue (s)
}

export type Bloc = { titre: string; tours: number; repos: number; exercices: Exercice[] }

export type CodeSeance = 'A' | 'B' | 'C' | 'D'

export type NiveauSeance = {
    nom: string
    resume: string
    echauffement: string[]
    blocs: Bloc[]
    retourAuCalme: string[]
    progression: string // comment progresser à ce niveau
    monter: string // quand passer au niveau suivant
    defi?: Defi // objectif à réussir pour passer au niveau suivant (ou objectif final au dernier niveau)
    duree?: number // minutes de séance, si différent du réglage (courses)
}

/** Un défi à tenter quand on se sent prêt, conseillé après `apres` séances au niveau. */
export type Defi = { titre: string; detail: string; apres: number; figure?: { id: FigureId; etape: number } }

export type SeanceBase = {
    code: CodeSeance
    lieu: 'salle' | 'maison'
    emoji: string
    degrade: [string, string]
    titre: string
    court: string
    couleur: string
    focus: string
    niveaux: NiveauSeance[]
}

/** Une séance à un niveau donné (ce que l'app affiche). */
export type SeanceProgramme = SeanceBase & NiveauSeance & { niveau: number; nbNiveaux: number }

export const SALLE = {
    nom: 'Basic-Fit Saint-Herblain Atlantis',
    horaires: 'Tous les jours, 6h00–22h30',
}

export const DUREE_SEANCE = 45

// ---------- Petits constructeurs ----------

type Opts = Partial<Pick<Exercice, 'alternative' | 'charge' | 'parHaltere' | 'assistance' | 'mesure'>>
function ex(
    id: string,
    nom: string,
    machine: string,
    materiel: Materiel,
    muscles: Muscle[],
    series: number,
    reps: string,
    consignes: string[],
    opts: Opts = {}
): Exercice {
    const sansCharge = materiel === 'corps' || materiel === 'elastique' || materiel === 'cardio'
    return { id, nom, machine, materiel, muscles, series, reps, consignes, ...(sansCharge ? { charge: false } : {}), ...opts }
}
const avec = (e: Exercice, series: number, reps: string): Exercice => ({ ...e, series, reps })
const bloc = (titre: string, tours: number, repos: number, exercices: Exercice[]): Bloc => ({ titre, tours, repos, exercices })

// ---------- Exercices : séance A (haut du corps) ----------

const A = {
    chestPress: ex('a-chest-press', 'Développé assis', 'Chest press (machine pectoraux)', 'machine', ['pectoraux', 'epaules', 'triceps'], 3, '10–12', [
        'Poignées à hauteur du milieu de la poitrine',
        'Dos collé au dossier, pousse sans verrouiller les coudes',
    ], { alternative: 'Développé couché aux haltères sur banc' }),
    latPulldown: ex('a-lat-pulldown', 'Tirage vertical', 'Lat pulldown (poulie haute, barre large)', 'poulie', ['dos', 'biceps'], 3, '10–12', [
        'Tire la barre vers le haut de la poitrine, pas derrière la nuque',
        'Serre les omoplates en bas, remonte lentement',
    ], { alternative: 'Tractions assistées' }),
    shoulderPress: ex('a-shoulder-press', 'Développé épaules', 'Shoulder press (machine épaules)', 'machine', ['epaules', 'triceps'], 3, '10–12', [
        'Poignées à hauteur des épaules au départ',
        'Ne cambre pas le bas du dos',
    ], { alternative: 'Développé haltères assis, dossier relevé' }),
    seatedRow: ex('a-seated-row', 'Tirage horizontal', 'Seated row (rowing assis, machine ou poulie basse)', 'machine', ['dos', 'deltoides-arriere', 'biceps'], 3, '10–12', [
        'Poitrine sortie, tire les coudes vers l’arrière',
        'Pas d’élan avec le buste',
    ], { alternative: 'Rowing un bras à l’haltère' }),
    pecDeck: ex('a-pec-deck', 'Butterfly', 'Pec deck (machine pectoraux, bras écartés)', 'machine', ['pectoraux'], 3, '12–15', [
        'Coudes légèrement fléchis et fixes pendant tout le mouvement',
        'Serre les pectoraux 1 seconde quand les poignées se touchent',
    ], { alternative: 'Écarté à la poulie vis-à-vis' }),
    oiseauMachine: ex('a-oiseau-machine', 'Oiseau à la machine', 'Pec deck à l’envers (assis face au dossier)', 'machine', ['deltoides-arriere', 'trapezes'], 3, '12–15', [
        'Bras presque tendus, ouvre jusqu’à ce que les bras soient dans l’axe des épaules',
        'Ne hausse pas les épaules : c’est l’arrière de l’épaule qui travaille',
    ], { alternative: 'Face pull à la poulie' }),
    curlPoulie: ex('a-curl-poulie', 'Curl biceps', 'Poulie basse avec barre droite', 'poulie', ['biceps', 'avant-bras'], 3, '12–15', [
        'Coudes fixes le long du corps',
        'Descente lente sur 2 secondes',
    ], { alternative: 'Curl haltères debout' }),
    tricepsCorde: ex('a-triceps-corde', 'Extension triceps', 'Poulie haute avec corde', 'poulie', ['triceps'], 3, '12–15', [
        'Coudes collés au corps',
        'Écarte la corde en bas du mouvement',
    ], { alternative: 'Extension haltère au-dessus de la tête' }),
    dcHalteres: ex('a-dc-halteres', 'Développé couché haltères', 'Banc plat + 2 haltères', 'halteres', ['pectoraux', 'epaules', 'triceps'], 4, '8–10', [
        'Omoplates serrées et collées au banc, pieds bien à plat au sol',
        'Descends les haltères au niveau de la poitrine, coudes à 45° du corps',
        'Pousse en rapprochant légèrement les haltères en haut',
    ], { alternative: 'Chest press machine', parHaltere: true }),
    tirageSerre: ex('a-tirage-serre', 'Tirage vertical prise serrée', 'Poulie haute, poignée en V (prise neutre)', 'poulie', ['dos', 'biceps'], 3, '8–10', [
        'Buste légèrement penché en arrière, tire la poignée vers le haut du ventre',
        'Coudes le long du corps, serre le dos 1 seconde en bas',
    ], { alternative: 'Tirage vertical barre large' }),
    militaireHalteres: ex('a-militaire-halteres', 'Développé militaire haltères', 'Banc à dossier droit + 2 haltères', 'halteres', ['epaules', 'triceps'], 3, '8–10', [
        'Dos collé au dossier, abdos serrés',
        'Haltères à hauteur des oreilles au départ, pousse au-dessus de la tête',
    ], { alternative: 'Shoulder press machine', parHaltere: true }),
    rowingHaltere: ex('a-rowing-haltere', 'Rowing un bras', 'Haltère, main libre en appui sur un banc', 'halteres', ['dos', 'deltoides-arriere', 'biceps'], 3, '10 par bras', [
        'Dos plat, presque parallèle au sol',
        'Tire l’haltère vers la hanche, pas vers l’épaule',
        'Descends lentement, bras tendu en bas',
    ], { alternative: 'Seated row machine', parHaltere: true }),
    elevLatHalteres: ex('a-elev-lat-halteres', 'Élévations latérales', '2 haltères légers, debout', 'halteres', ['epaules'], 3, '12–15', [
        'Bras presque tendus, monte jusqu’à l’horizontale',
        'Petit doigt légèrement plus haut que le pouce, sans élan',
    ], { alternative: 'Élévations latérales à la poulie basse', parHaltere: true }),
    facePull: ex('a-face-pull-poulie', 'Face pull', 'Poulie haute avec corde, à hauteur du visage', 'poulie', ['deltoides-arriere', 'trapezes'], 3, '15', [
        'Tire la corde vers le front en écartant les mains',
        'Coudes hauts, serre les omoplates 1 seconde',
    ], { alternative: 'Oiseau à la machine' }),
    curlIncline: ex('a-curl-incline', 'Curl incliné', 'Banc incliné à 45° + 2 haltères', 'halteres', ['biceps'], 3, '10–12', [
        'Bras qui pendent derrière le buste au départ : étirement complet',
        'Coudes immobiles, monte sans décoller les épaules du banc',
    ], { alternative: 'Curl poulie basse', parHaltere: true }),
    tricepsNuque: ex('a-triceps-nuque', 'Extension triceps au-dessus de la tête', 'Poulie avec corde, dos à la machine', 'poulie', ['triceps'], 3, '10–12', [
        'Coudes près de la tête et pointés vers l’avant',
        'Tends complètement les bras, reviens lentement derrière la tête',
    ], { alternative: 'Extension haltère à deux mains, assis' }),
    dcBarre: ex('a-dc-barre', 'Développé couché barre', 'Banc plat avec rack (barre de 20 kg)', 'barre', ['pectoraux', 'epaules', 'triceps'], 4, '6–8', [
        'Mains un peu plus larges que les épaules, omoplates serrées',
        'Descends la barre jusqu’au bas des pectoraux, pousse en ligne droite',
        'Demande à quelqu’un de t’assurer pour les dernières séries',
    ], { alternative: 'Développé couché à la Smith machine' }),
    tractionsAssistees: ex('a-tractions-assistees', 'Tractions assistées', 'Machine de tractions avec contrepoids (genoux sur l’appui)', 'machine', ['dos', 'biceps'], 4, '6–8', [
        'Prise un peu plus large que les épaules, monte le menton au-dessus de la barre',
        'Descends jusqu’aux bras tendus, sans balancer',
        'Ici, moins de kg = plus dur : baisse l’assistance quand c’est facile',
    ], { alternative: 'Tirage vertical lourd', assistance: true }),
    inclineHalteres: ex('a-incline-halteres', 'Développé incliné haltères', 'Banc incliné à 30° + 2 haltères', 'halteres', ['pectoraux', 'epaules', 'triceps'], 3, '8–10', [
        'Banc à 30° maximum, sinon ce sont les épaules qui travaillent',
        'Descends les haltères au haut de la poitrine',
    ], { alternative: 'Chest press incliné (machine)', parHaltere: true }),
    rowingBarre: ex('a-rowing-barre', 'Rowing barre', 'Barre droite ou EZ, buste penché', 'barre', ['dos', 'deltoides-arriere', 'biceps', 'lombaires'], 3, '8–10', [
        'Genoux fléchis, buste penché à 45°, dos bien plat',
        'Tire la barre vers le nombril, coudes le long du corps',
    ], { alternative: 'Rowing un bras à l’haltère' }),
    elevLatPoulie: ex('a-elev-lat-poulie', 'Élévations latérales poulie', 'Poulie basse, une main à la fois', 'poulie', ['epaules'], 3, '12–15 par bras', [
        'Câble qui passe devant toi, monte le bras jusqu’à l’horizontale',
        'Tension continue : ne pose jamais la charge entre deux reps',
    ], { alternative: 'Élévations latérales haltères' }),
    dips: ex('a-dips', 'Dips', 'Barres parallèles (ou machine de dips assistés)', 'corps', ['pectoraux', 'triceps', 'epaules'], 3, 'max − 2', [
        'Buste légèrement penché en avant, descends jusqu’à coudes à 90°',
        'Remonte sans verrouiller, arrête 2 reps avant l’échec',
    ], { alternative: 'Dips assistés à la machine de tractions' }),
    curlEz: ex('a-curl-ez', 'Curl barre EZ', 'Barre EZ (coudée), debout', 'barre', ['biceps', 'avant-bras'], 3, '8–10', [
        'Coudes collés au corps, aucun élan du buste',
        'Descente lente sur 3 secondes',
    ], { alternative: 'Curl poulie basse' }),
}

// ---------- Exercices : séance B (bas du corps + abdos) ----------

const B = {
    legPress: ex('b-leg-press', 'Presse à cuisses', 'Leg press', 'machine', ['quadriceps', 'fessiers'], 3, '10–12', [
        'Pieds largeur d’épaules au milieu du plateau',
        'Bas du dos collé au siège, ne verrouille pas les genoux',
    ], { alternative: 'Squat goblet avec un haltère' }),
    legCurl: ex('b-leg-curl', 'Leg curl', 'Leg curl (ischios, assis ou allongé)', 'machine', ['ischios'], 3, '10–12', [
        'Genou aligné avec l’axe de la machine',
        'Remonte lentement',
    ], { alternative: 'Soulevé de terre jambes tendues léger aux haltères' }),
    legExtension: ex('b-leg-extension', 'Leg extension', 'Leg extension (quadriceps)', 'machine', ['quadriceps'], 3, '12–15', [
        'Marque 1 seconde jambes tendues en haut',
        'Descente contrôlée',
    ], { alternative: 'Fentes avant aux haltères' }),
    mollets: ex('b-mollets', 'Mollets', 'Presse à cuisses, pointes de pieds en bas du plateau', 'machine', ['mollets'], 3, '15', [
        'Amplitude complète, montée et descente lentes',
    ], { alternative: 'Mollets debout sur une marche avec un haltère' }),
    crunch: ex('b-crunch', 'Crunch', 'Machine abdominaux', 'machine', ['abdos'], 3, '12–15', [
        'Enroule le dos, souffle en contractant',
        'Pas de traction avec les bras',
    ], { alternative: 'Crunch au sol sur tapis' }),
    planche: ex('b-planche', 'Planche', 'Tapis, zone d’étirement', 'corps', ['abdos', 'obliques', 'lombaires'], 3, '30–45 s', [
        'Corps aligné, fesses serrées, ne creuse pas le dos',
    ]),
    gobletSquat: ex('b-goblet-squat', 'Squat goblet', '1 haltère tenu contre la poitrine', 'halteres', ['quadriceps', 'fessiers', 'abdos'], 3, '10', [
        'Pieds un peu plus larges que les épaules, pointes légèrement ouvertes',
        'Descends entre les genoux, cuisses au moins parallèles au sol, dos droit',
        'Genoux dans l’axe des pieds, pousse dans les talons pour remonter',
    ], { alternative: 'Presse à cuisses' }),
    abducteurs: ex('b-abducteurs', 'Abducteurs', 'Machine abducteurs (assis, écarter les genoux)', 'machine', ['moyen-fessier', 'fessiers'], 2, '15', [
        'Buste légèrement penché en avant pour mieux cibler les fessiers',
        'Tiens 1 seconde jambes écartées',
    ], { alternative: 'Pas latéraux avec élastique' }),
    squatSmith: ex('b-squat-smith', 'Squat à la Smith machine', 'Smith machine (barre guidée)', 'barre', ['quadriceps', 'fessiers'], 4, '8–10', [
        'Barre sur le haut du dos (pas sur la nuque), pieds légèrement devant toi',
        'Descends jusqu’aux cuisses parallèles, dos droit, regard devant',
    ], { alternative: 'Squat goblet lourd' }),
    sdtHalteres: ex('b-sdt-roumain-halteres', 'Soulevé de terre roumain', '2 haltères', 'halteres', ['ischios', 'fessiers', 'lombaires'], 3, '10', [
        'Genoux à peine fléchis, pousse les fesses en arrière',
        'Haltères qui frôlent les cuisses, dos plat jusqu’à mi-tibia',
        'Remonte en serrant les fessiers',
    ], { alternative: 'Leg curl', parHaltere: true }),
    fentesMarchees: ex('b-fentes-marchees', 'Fentes marchées', '2 haltères, dans une allée libre', 'halteres', ['quadriceps', 'fessiers'], 3, '10 par jambe', [
        'Grand pas, le genou arrière descend presque au sol',
        'Buste droit, genou avant au-dessus de la cheville',
    ], { alternative: 'Fentes sur place', parHaltere: true }),
    hipThrust: ex('b-hip-thrust', 'Hip thrust', 'Banc + barre avec mousse (ou machine hip thrust)', 'barre', ['fessiers', 'ischios'], 3, '10–12', [
        'Haut du dos contre le banc, barre posée sur les hanches',
        'Monte jusqu’à ce que le corps soit à plat, serre les fessiers 1 seconde',
        'Menton rentré, ne cambre pas en haut',
    ], { alternative: 'Pont fessier au sol avec un haltère' }),
    molletsDebout: ex('b-mollets-debout', 'Mollets debout', 'Machine mollets debout (ou Smith sur une marche)', 'machine', ['mollets'], 3, '12–15', [
        'Talons bien en bas, puis monte au maximum sur la pointe des pieds',
        'Tiens 1 seconde en haut',
    ], { alternative: 'Mollets à la presse' }),
    releveGenoux: ex('b-releve-genoux', 'Relevé de genoux', 'Chaise romaine (dos à l’appui) ou suspendu à une barre', 'corps', ['abdos'], 3, '10–12', [
        'Monte les genoux vers la poitrine en enroulant le bassin',
        'Redescends lentement, sans te balancer',
    ], { alternative: 'Crunch inversé au sol' }),
    pallof: ex('b-pallof', 'Pallof press', 'Poulie à hauteur de poitrine, de profil', 'poulie', ['obliques', 'abdos'], 3, '10 par côté', [
        'De profil par rapport à la poulie, poignée contre la poitrine',
        'Tends les bras devant toi sans laisser le buste tourner, tiens 2 secondes',
    ], { alternative: 'Gainage latéral' }),
    squatBarre: ex('b-squat-barre', 'Squat barre', 'Rack à squat, barre sur le haut du dos', 'barre', ['quadriceps', 'fessiers', 'lombaires'], 4, '6–8', [
        'Sors la barre du rack, 2 pas en arrière, pieds largeur d’épaules',
        'Inspire, gaine-toi, descends cuisses parallèles, genoux dans l’axe des pieds',
        'Règle les barres de sécurité du rack juste sous ta position basse',
    ], { alternative: 'Squat à la Smith machine' }),
    sdtBarre: ex('b-sdt-roumain-barre', 'Soulevé de terre roumain barre', 'Barre droite', 'barre', ['ischios', 'fessiers', 'lombaires'], 3, '8', [
        'Barre contre les cuisses, fesses en arrière, dos plat',
        'Descends jusqu’à sentir l’étirement des ischios (sous les genoux)',
    ], { alternative: 'Soulevé de terre roumain haltères' }),
    fentesBulgares: ex('b-fentes-bulgares', 'Fentes bulgares', 'Pied arrière sur un banc + 2 haltères', 'halteres', ['quadriceps', 'fessiers'], 3, '8 par jambe', [
        'Pied avant assez loin du banc, descends à la verticale',
        'Genou arrière presque au sol, buste légèrement penché',
    ], { alternative: 'Fentes marchées', parHaltere: true }),
    releveJambes: ex('b-releve-jambes', 'Relevé de jambes tendues', 'Suspendu à une barre ou chaise romaine', 'corps', ['abdos', 'obliques'], 3, '8–10', [
        'Jambes tendues, monte-les au moins à l’horizontale',
        'Contrôle la descente, aucun balancier',
    ], { alternative: 'Relevé de genoux' }),
    crunchPoulie: ex('b-crunch-poulie', 'Crunch à la poulie', 'Poulie haute avec corde, à genoux', 'poulie', ['abdos'], 3, '10–12', [
        'Hanches immobiles, enroule le dos pour amener les coudes vers les genoux',
        'Souffle fort en bas, remonte lentement',
    ], { alternative: 'Machine crunch' }),
}

// ---------- Exercices : séance C (cardio athlétique) ----------
// Point de départ : la formule habituelle de Daniel, 3 × (5 min de marche + 5 min de course lente).
// On construit d'abord le « fond » (courir longtemps sans fatigue), puis la capacité à répéter des
// efforts courts et intenses, comme au basket ou au foot (accélérations, 30/30, 15/15).

const MUSCLES_COURSE: Muscle[] = ['cardio', 'quadriceps', 'mollets', 'fessiers']
const OU_COURIR = 'Tapis (pente 1 %) ou dehors'
function course(id: string, nom: string, nb: number, reps: string, consignes: string[]): Exercice {
    return ex(id, nom, OU_COURIR, 'cardio', MUSCLES_COURSE, nb, reps, [
        ...consignes,
        'Note la distance totale à la fin (compteur du tapis ou montre)',
    ], { mesure: 'km', alternative: 'Vélo ou rameur, mêmes durées, si une douleur apparaît aux genoux ou aux tibias' })
}
function marche(id: string, minutes: number, pente: string, vitesse: string): Exercice {
    return ex(id, 'Marche inclinée', 'Tapis de course', 'cardio', ['cardio', 'fessiers', 'mollets'], 1, `${minutes} min, pente ${pente}, ${vitesse}`, [
        'Ne te tiens pas aux barres',
        'Tu dois pouvoir parler (effort 6/10)',
    ])
}
const ECHAUFFEMENT_COURSE = ['5 min de marche, de 5 à 6,5 km/h', 'Montées de genoux, talons-fesses et pas chassés (1 min)']
const RETOUR_COURSE = ['3 min de marche lente (4,5-5 km/h)', 'Étirements mollets, cuisses, fessiers (30 s chacun)']

// ---------- Exercices : séance D (maison) ----------

const D = {
    elevLat: ex('d-elevations-laterales', 'Élévations latérales', 'Élastique sous les pieds', 'elastique', ['epaules'], 3, '15', [
        'Bras presque tendus, monte jusqu’à l’horizontale',
        'Ne hausse pas les épaules',
    ]),
    facePull: ex('d-face-pull', 'Face pull', 'Élastique accroché à hauteur du visage (poignée de porte)', 'elastique', ['deltoides-arriere', 'trapezes'], 3, '15', [
        'Tire vers le front, coudes hauts',
        'Serre les omoplates 1 seconde',
    ]),
    haussements: ex('d-haussements', 'Haussements d’épaules', 'Élastique sous les pieds', 'elastique', ['trapezes'], 3, '15', [
        'Monte les épaules vers les oreilles, tiens 1 seconde',
        'Bras tendus',
    ]),
    pompes: ex('d-pompes', 'Pompes', 'Poids du corps (sur les genoux si besoin)', 'corps', ['pectoraux', 'triceps', 'epaules'], 3, 'max − 2', [
        'Corps gainé, poitrine près du sol',
        'Arrête-toi 2 répétitions avant l’échec',
    ]),
    pontFessier: ex('d-pont-fessier', 'Pont fessier', 'Au sol, élastique au-dessus des genoux', 'elastique', ['fessiers', 'ischios'], 3, '15', [
        'Pousse dans les talons, serre les fessiers en haut 1 seconde',
        'Ne cambre pas',
    ]),
    pasLateraux: ex('d-abduction', 'Pas latéraux', 'Élastique autour des chevilles ou au-dessus des genoux', 'elastique', ['moyen-fessier'], 3, '12 de chaque côté', [
        'Genoux légèrement fléchis, garde l’élastique tendu',
    ]),
    superman: ex('d-superman', 'Superman', 'Allongé sur le ventre, au sol', 'corps', ['lombaires', 'fessiers'], 2, '12', [
        'Décolle bras et jambes, tiens 2 secondes',
        'Regard vers le sol',
    ]),
    gainageLateral: ex('d-gainage-lateral', 'Gainage latéral', 'Au sol, sur l’avant-bras', 'corps', ['obliques'], 2, '30 s par côté', [
        'Hanches hautes, corps aligné',
    ]),
    fingerGrip: ex('d-finger-grip', 'Finger grip', 'Élastique autour des doigts (ou serre une balle)', 'elastique', ['avant-bras'], 2, '30 s', [
        'Ouvre et ferme la main en continu',
    ]),
    rowingElastique: ex('d-rowing-elastique', 'Rowing élastique', 'Assis jambes tendues, élastique autour des pieds', 'elastique', ['dos', 'deltoides-arriere', 'biceps'], 4, '12–15', [
        'Dos droit, tire les mains vers le bas des côtes',
        'Serre les omoplates 1 seconde, reviens lentement',
    ]),
    pike: ex('d-pike-pushup', 'Pompes piquées', 'Poids du corps, fesses en l’air (V inversé)', 'corps', ['epaules', 'triceps'], 3, '8–10', [
        'Mains largeur d’épaules, hanches hautes, tête qui descend entre les mains',
        'C’est la version « développé épaules » des pompes',
    ]),
    bulgare: ex('d-bulgare', 'Fentes bulgares', 'Pied arrière sur une chaise ou le canapé', 'corps', ['quadriceps', 'fessiers'], 3, '10 par jambe', [
        'Pied avant assez loin, descends à la verticale',
        'Genou arrière presque au sol',
    ]),
    pontUneJambe: ex('d-pont-une-jambe', 'Pont fessier une jambe', 'Au sol, l’autre jambe tendue en l’air', 'corps', ['fessiers', 'ischios'], 3, '12 par jambe', [
        'Pousse dans le talon au sol, bassin bien horizontal',
        'Serre le fessier 2 secondes en haut',
    ]),
    deadBug: ex('d-dead-bug', 'Dead bug', 'Sur le dos, bras tendus vers le plafond', 'corps', ['abdos', 'obliques'], 2, '10 par côté', [
        'Bas du dos plaqué au sol pendant tout l’exercice',
        'Tends un bras et la jambe opposée, lentement, en soufflant',
    ]),
    pompesSurelevees: ex('d-pompes-surelevees', 'Pompes pieds surélevés', 'Pieds sur une chaise ou le canapé', 'corps', ['pectoraux', 'epaules', 'triceps'], 4, 'max − 2', [
        'Corps parfaitement aligné des talons à la tête',
        'Poitrine qui touche presque le sol, coudes à 45°',
    ]),
    ytw: ex('d-ytw', 'Y-T-W au sol', 'Allongé sur le ventre (bouteilles d’eau si trop facile)', 'corps', ['deltoides-arriere', 'trapezes', 'lombaires'], 3, '6 de chaque lettre', [
        'Bras en Y, puis en T, puis en W, pouces vers le plafond',
        'Décolle les bras en serrant les omoplates, front au sol',
    ]),
    hollow: ex('d-hollow', 'Hollow hold', 'Sur le dos, épaules et jambes décollées', 'corps', ['abdos'], 3, '20–30 s', [
        'Bas du dos collé au sol, bras tendus derrière la tête',
        'Si le dos se décolle : plie les genoux',
    ]),
    squat: ex('d-squat', 'Squat', 'Poids du corps (sac à dos chargé si facile)', 'corps', ['quadriceps', 'fessiers'], 3, '15', [
        'Pieds largeur d’épaules, descends cuisses parallèles, talons au sol',
        'Genoux dans l’axe des pieds, remonte en poussant dans les talons',
    ]),
    mollets: ex('d-mollets-marche', 'Mollets sur une marche', 'Marche d’escalier, une main au mur', 'corps', ['mollets'], 3, '15', [
        'Talons dans le vide : descends bas, puis monte au maximum',
        'Lent en descente (3 s) : c’est ce qui protège les tendons d’Achille en course',
    ]),
    molletsUneJambe: ex('d-mollets-une-jambe', 'Mollets une jambe', 'Marche d’escalier, une main au mur', 'corps', ['mollets'], 3, '12 par jambe', [
        'Même mouvement sur une seule jambe, descente sur 3 s',
        'Sac à dos chargé quand 15 reps deviennent faciles',
    ]),
    squatSaute: ex('d-squat-saute', 'Squats sautés', 'Poids du corps, sur un tapis', 'corps', ['quadriceps', 'fessiers', 'mollets'], 3, '8', [
        'Descends en squat, saute haut, réceptionne-toi souplement genoux fléchis',
        'Qualité avant tout : arrête dès que la réception devient lourde',
    ]),
    planche: ex('d-planche', 'Planche', 'Au sol, sur les avant-bras', 'corps', ['abdos', 'obliques', 'lombaires'], 3, '30–45 s', [
        'Corps aligné, fesses serrées, ne creuse pas le dos',
    ]),
}


// ---------- Callisthénie (programme hybride, novembre 2026) ----------
// Choix de Daniel : priorité au poids du corps et à l'endurance musculaire plutôt qu'à soulever lourd,
// avec quelques charges légères (jambes, épaules) pour garder tout le corps. Les défis de chaque niveau
// sont les étapes vers 5 figures : muscle-up, handstand, front lever, L-sit et pistol squat.

const BARRE = 'Barre de traction (salle, parc ou barre de porte)'
const reps = (e: Exercice, series: number, r: string): Exercice => ({ ...e, series, reps: r, mesure: 'reps' })
const tenue = (e: Exercice, series: number, r: string): Exercice => ({ ...e, series, reps: r, mesure: 'sec' })

const KA = {
    australiennes: ex('a-australiennes', 'Tractions australiennes', 'Barre basse (Smith machine ou rack), corps sous la barre', 'corps', ['dos', 'biceps', 'deltoides-arriere'], 3, '10–12', [
        'Corps gainé comme une planche, talons au sol',
        'Tire la poitrine jusqu’à la barre et serre les omoplates 1 seconde',
        'Plus dur : pieds plus loin, ou posés sur un banc',
    ], { mesure: 'reps', alternative: 'Tirage horizontal à la poulie' }),
    negatives: ex('a-negatives', 'Tractions négatives', `${BARRE}, avec un banc pour monter`, 'corps', ['dos', 'biceps', 'avant-bras'], 3, '3 descentes lentes (5 s)', [
        'Monte avec le banc, menton au-dessus de la barre',
        'Descends le plus lentement possible jusqu’aux bras tendus',
        'Note ta descente la plus longue, en secondes',
    ], { mesure: 'sec', alternative: 'Tractions assistées' }),
    tractions: ex('a-tractions', 'Tractions strictes', `${BARRE}, prise pronation`, 'corps', ['dos', 'biceps', 'avant-bras'], 4, 'max − 1', [
        'Bras tendus en bas, menton au-dessus de la barre en haut',
        'Aucun élan : jambes serrées, abdos gainés',
        'Bloqué avant la fin ? Termine la série avec 1 ou 2 négatives',
    ], { mesure: 'reps', alternative: 'Tractions assistées' }),
    explosives: ex('a-tractions-explosives', 'Tractions explosives', BARRE, 'corps', ['dos', 'biceps', 'trapezes'], 4, '3–5', [
        'Tire le plus vite possible : vise la poitrine à la barre, pas le menton',
        'Descends contrôlé, puis repars aussitôt',
        'Arrête la série dès que la vitesse baisse',
    ], { mesure: 'reps' }),
    muscleUpElastique: ex('a-muscle-up-elastique', 'Muscle-up avec élastique', `${BARRE} + gros élastique sous les genoux`, 'corps', ['dos', 'pectoraux', 'triceps', 'epaules'], 5, '1–3', [
        'Traction explosive vers le bas de la poitrine, légèrement en arc',
        'En haut : bascule vite poignets et épaules au-dessus de la barre',
        'Finis par une poussée de dips sur la barre',
    ], { mesure: 'reps', alternative: 'Tractions explosives puis dips sur barre droite' }),
    muscleUpNegatif: ex('a-muscle-up-negatif', 'Muscle-up négatif', `${BARRE}, monte au-dessus avec un banc`, 'corps', ['dos', 'pectoraux', 'triceps'], 3, '2–3 descentes lentes', [
        'Départ bras tendus au-dessus de la barre',
        'Descends lentement : dips, transition, puis traction jusqu’en bas',
    ], { mesure: 'reps' }),
    dipsBarre: ex('a-dips-barre-droite', 'Dips sur barre droite', 'Barre de Smith réglée à hauteur de hanche', 'corps', ['pectoraux', 'triceps', 'epaules'], 3, '6–10', [
        'Buste au-dessus de la barre, barre contre le bas du ventre',
        'Descends coudes à 90°, pousse en te penchant vers l’avant',
        'C’est la dernière partie du muscle-up',
    ], { mesure: 'reps', alternative: 'Dips aux barres parallèles' }),
    dipsAssistes: ex('a-dips-assistes', 'Dips assistés', 'Machine de tractions / dips avec contrepoids', 'machine', ['pectoraux', 'triceps', 'epaules'], 3, '10–12', [
        'Buste légèrement penché, descends coudes à 90°',
        'Ici, moins de kg = plus dur : baisse l’assistance quand c’est facile',
    ], { assistance: true, alternative: 'Dips sur un banc, pieds au sol' }),
    pompesDiamant: ex('a-pompes-diamant', 'Pompes diamant', 'Mains rapprochées sous la poitrine (pouces et index en losange)', 'corps', ['triceps', 'pectoraux'], 3, '8–12', [
        'Coudes qui frôlent le corps en descendant',
        'Corps gainé, poitrine jusqu’aux mains',
    ], { mesure: 'reps', alternative: 'Pompes classiques' }),
    pompesArcher: ex('a-pompes-archer', 'Pompes archer', 'Mains très écartées, un bras tendu sur le côté', 'corps', ['pectoraux', 'triceps', 'epaules'], 3, '5 par côté', [
        'Descends vers une main, l’autre bras reste tendu',
        'Étape vers la pompe à un bras, et force utile pour le muscle-up',
    ], { mesure: 'reps' }),
    pompesClaquees: ex('a-pompes-claquees', 'Pompes explosives', 'Poids du corps, sur un tapis', 'corps', ['pectoraux', 'triceps', 'epaules'], 3, '5–8', [
        'Pousse assez fort pour décoller les mains (claque si tu peux)',
        'Réception souple, coudes légèrement fléchis',
    ], { mesure: 'reps' }),
    emomPompes: ex('a-emom', 'EMOM pompes + australiennes', 'Chrono : une série au début de chaque minute', 'corps', ['pectoraux', 'dos', 'triceps', 'cardio'], 8, '8 min · chaque minute : 6 pompes + 5 australiennes', [
        'Au top de chaque minute : fais les reps, puis repos jusqu’à la minute suivante',
        'Coche un rond par minute. Trop dur ? Enlève 1 rep, pas une minute',
    ]),
    emomTractions: ex('a-emom', 'EMOM tractions + pompes', 'Chrono : une série au début de chaque minute', 'corps', ['pectoraux', 'dos', 'triceps', 'cardio'], 10, '10 min · chaque minute : 2–3 tractions + 8 pompes', [
        'Au top de chaque minute : fais les reps, puis repos jusqu’à la minute suivante',
        'Des reps faciles et propres : c’est de l’endurance, pas de l’échec',
    ]),
}

const KB = {
    boxPistol: ex('b-box-pistol', 'Pistol sur un banc', 'Banc ou box derrière toi, sur une jambe', 'corps', ['quadriceps', 'fessiers'], 3, '5–8 par jambe', [
        'Une jambe tendue devant, bras devant pour l’équilibre',
        'Descends lentement jusqu’à t’asseoir sur le banc, sans te laisser tomber',
        'Remonte sur une jambe. Facile ? Prends un banc plus bas',
    ], { mesure: 'reps', alternative: 'Fentes bulgares' }),
    pistolAssiste: ex('b-pistol-assiste', 'Pistol assisté', 'Tenu à un poteau du rack ou à des sangles (TRX)', 'corps', ['quadriceps', 'fessiers', 'mollets'], 4, '5 par jambe', [
        'Descends tout en bas sur une jambe, talon au sol',
        'Les mains aident le moins possible, surtout à la remontée',
    ], { mesure: 'reps', alternative: 'Pistol sur un banc bas' }),
    pistol: ex('b-pistol', 'Pistol squat', 'Poids du corps, sur une jambe', 'corps', ['quadriceps', 'fessiers', 'mollets', 'abdos'], 4, '3–5 par jambe', [
        'Bras et jambe libre tendus devant pour faire contrepoids',
        'Descends contrôlé jusqu’en bas, talon collé au sol',
        'Petit poids (2 kg) dans les mains si tu bascules en arrière',
    ], { mesure: 'reps', alternative: 'Pistol assisté' }),
    nordic: ex('b-nordic', 'Nordic curl négatif', 'À genoux sur un tapis, talons bloqués sous une barre ou une machine', 'corps', ['ischios'], 3, '4–6', [
        'Corps droit des genoux à la tête, fesses serrées',
        'Descends le plus lentement possible vers l’avant',
        'Rattrape-toi avec les mains, repousse pour remonter',
    ], { mesure: 'reps', alternative: 'Leg curl' }),
    lsitGroupe: ex('b-lsit-groupe', 'L-sit groupé', 'Barres de dips, ou 2 haltères posés au sol', 'corps', ['abdos', 'triceps', 'epaules'], 4, '10–20 s', [
        'Bras tendus, épaules basses (pousse le sol)',
        'Genoux remontés vers la poitrine, pieds décollés',
        'Note ta meilleure tenue en secondes',
    ], { mesure: 'sec', alternative: 'Relevés de genoux à la chaise romaine' }),
    lsitUneJambe: ex('b-lsit-une-jambe', 'L-sit une jambe', 'Barres de dips ou parallettes', 'corps', ['abdos', 'triceps', 'quadriceps'], 4, '8–12 s', [
        'Une jambe tendue à l’horizontale, l’autre groupée',
        'Change de jambe à chaque série',
    ], { mesure: 'sec' }),
    sdtUneJambe: ex('b-sdt-une-jambe', 'Soulevé de terre une jambe', '1 haltère léger, dans la main opposée', 'halteres', ['ischios', 'fessiers', 'moyen-fessier'], 3, '10 par jambe', [
        'Bascule le buste en avant, jambe arrière tendue dans l’alignement',
        'Hanches bien de face, remonte en serrant le fessier',
    ], { alternative: 'Soulevé de terre roumain aux haltères' }),
    circuit: ex('b-circuit', 'Circuit endurance jambes', 'Sans matériel, à enchaîner', 'corps', ['quadriceps', 'fessiers', 'mollets', 'cardio'], 3, '15 squats + 10 fentes sautées + 30 s de chaise au mur', [
        'Un rond = un tour complet, 1 min de repos entre les tours',
        'Rythme régulier : c’est l’endurance des jambes qui compte, pas la vitesse',
    ]),
}

const KD = {
    corbeau: ex('d-corbeau', 'Corbeau (crow)', 'Au sol, mains à plat, genoux posés sur les coudes', 'corps', ['epaules', 'abdos', 'avant-bras'], 4, 'jusqu’à 20 s', [
        'Regarde devant tes mains, pas tes pieds',
        'Penche-toi en avant jusqu’à ce que les pieds décollent tout seuls',
        'Coussin devant la tête au début. Note ta meilleure tenue',
    ], { mesure: 'sec' }),
    handstandMur: ex('d-handstand-mur', 'Équilibre ventre au mur', 'Ventre face au mur : monte en marchant avec les pieds', 'corps', ['epaules', 'triceps', 'abdos'], 4, '20–30 s', [
        'Mains à 20-30 cm du mur, bras tendus, pousse le sol',
        'Corps droit : côtes rentrées, fesses serrées, regard entre les mains',
        'Redescends en marchant, jamais en te laissant tomber',
    ], { mesure: 'sec', alternative: 'Pompes piquées pieds sur un banc' }),
    handstandLibre: ex('d-handstand-libre', 'Handstand libre', 'Sol dégagé, coussin ou tapis devant', 'corps', ['epaules', 'triceps', 'abdos', 'avant-bras'], 6, 'essais de 5–15 s', [
        'Monte d’un coup de pied (kick-up), une jambe après l’autre',
        'Corrige avec les doigts : appuie fort si tu pars vers l’avant',
        'Sortie de secours : pivote sur une main et redescends sur le côté',
    ], { mesure: 'sec' }),
    pompesEquilibre: ex('d-pompes-equilibre', 'Pompes en équilibre au mur', 'Dos au mur, en équilibre, tête vers un coussin', 'corps', ['epaules', 'triceps', 'trapezes'], 3, '3–5 (amplitude partielle)', [
        'Descends lentement la tête vers le coussin, coudes vers l’avant',
        'Commence à mi-hauteur, puis descends un peu plus chaque semaine',
    ], { mesure: 'reps', alternative: 'Pompes piquées pieds surélevés' }),
    suspension: ex('d-suspension-active', 'Suspension active', BARRE, 'corps', ['dos', 'trapezes', 'avant-bras'], 3, '10 tirages d’épaules + 20 s', [
        'Bras tendus : descends puis remonte les épaules sans plier les coudes',
        'Finis suspendu, épaules engagées. Note ta tenue en secondes',
    ], { mesure: 'sec' }),
    frontGroupe: ex('d-front-lever-groupe', 'Front lever groupé', BARRE, 'corps', ['dos', 'abdos', 'epaules'], 4, '8–15 s', [
        'Bras tendus, tire la barre vers les hanches pour basculer à l’horizontale',
        'Genoux serrés contre la poitrine, dos arrondi',
        'Note ta meilleure tenue',
    ], { mesure: 'sec', alternative: 'Sans barre : hollow hold' }),
    frontAvance: ex('d-front-lever-avance', 'Front lever groupé avancé', BARRE, 'corps', ['dos', 'abdos', 'epaules', 'lombaires'], 4, '6–10 s', [
        'Comme le groupé, mais dos plat et cuisses à 90° du buste',
        'Hanches à la hauteur des épaules',
    ], { mesure: 'sec' }),
    frontUneJambe: ex('d-front-lever-une-jambe', 'Front lever une jambe', BARRE, 'corps', ['dos', 'abdos', 'epaules', 'lombaires'], 4, '5–8 s', [
        'Une jambe tendue dans l’alignement du corps, l’autre groupée',
        'Change de jambe à chaque série',
    ], { mesure: 'sec' }),
    lsit: ex('d-lsit', 'L-sit jambes tendues', 'Barres de dips, parallettes ou 2 chaises solides', 'corps', ['abdos', 'quadriceps', 'triceps'], 4, '5–15 s', [
        'Jambes tendues et serrées à l’horizontale, pointes de pieds',
        'Épaules basses, bras verrouillés',
    ], { mesure: 'sec' }),
    arch: ex('d-arch', 'Arch hold', 'Allongé sur le ventre, bras tendus devant', 'corps', ['lombaires', 'fessiers', 'deltoides-arriere'], 3, '20–30 s', [
        'Décolle bras, poitrine et jambes, regard vers le sol',
        'L’opposé du hollow : les deux ensemble font un corps solide',
    ], { mesure: 'sec' }),
    circuit: ex('d-circuit', 'Circuit endurance', 'Sans matériel, à enchaîner', 'corps', ['pectoraux', 'quadriceps', 'abdos', 'cardio'], 3, '10 pompes + 15 squats + 10 relevés de genoux + 30 s de planche', [
        'Un rond = un tour complet, 1 min de repos entre les tours',
        'Tout propre, sans pause dans le tour',
    ]),
}

const ECHAUFFEMENT_POIGNETS = 'Poignets : cercles, puis appui sur les paumes et le dos des mains (1 min)'

// ---------- Figures de callisthénie : les objectifs muscu de Daniel ----------

export type FigureId = 'muscle-up' | 'handstand' | 'front-lever' | 'l-sit' | 'pistol'
export type Figure = {
    id: FigureId
    nom: string
    emoji: string
    seance: CodeSeance // séance où elle se travaille le plus
    ou: string
    etapes: { titre: string; detail: string }[]
}

export const FIGURES: Figure[] = [
    {
        id: 'muscle-up',
        nom: 'Muscle-up',
        emoji: '🧗',
        seance: 'A',
        ou: 'Séance A (tirer + pousser)',
        etapes: [
            { titre: '1 traction stricte', detail: 'Bras tendus en bas, menton au-dessus de la barre, sans élan.' },
            { titre: '8 tractions strictes', detail: 'D’affilée, sans balancer.' },
            { titre: '5 tractions explosives', detail: 'Poitrine à la hauteur de la barre à chaque rep.' },
            { titre: '1 muscle-up avec élastique', detail: 'Traction, transition et dips sur la barre, avec l’aide d’un élastique.' },
            { titre: '1 muscle-up strict', detail: 'Sans élastique et sans gros balancier.' },
        ],
    },
    {
        id: 'handstand',
        nom: 'Handstand',
        emoji: '🤸',
        seance: 'D',
        ou: 'Séance D (skills)',
        etapes: [
            { titre: '20 s de corbeau', detail: 'En équilibre sur les mains, genoux sur les coudes.' },
            { titre: '30 s ventre au mur', detail: 'Corps droit, bras tendus.' },
            { titre: '60 s ventre au mur', detail: 'Tu tiens 1 minute sans t’effondrer dans les épaules.' },
            { titre: '10 s de handstand libre', detail: 'Sans mur, sans marcher sur les mains.' },
            { titre: '30 s de handstand libre', detail: 'L’équilibre parfait.' },
        ],
    },
    {
        id: 'front-lever',
        nom: 'Front lever',
        emoji: '🛸',
        seance: 'D',
        ou: 'Séance D (skills)',
        etapes: [
            { titre: '30 s de suspension active', detail: 'Épaules engagées, bras tendus.' },
            { titre: '15 s de front lever groupé', detail: 'Corps à l’horizontale, genoux contre la poitrine.' },
            { titre: '10 s groupé avancé', detail: 'Dos plat, cuisses à 90°.' },
            { titre: '8 s avec une jambe tendue', detail: 'De chaque côté.' },
            { titre: '5 s de front lever complet', detail: 'Corps tendu à l’horizontale sous la barre.' },
        ],
    },
    {
        id: 'l-sit',
        nom: 'L-sit',
        emoji: '🪑',
        seance: 'B',
        ou: 'Séances B et D (gainage)',
        etapes: [
            { titre: '30 s de hollow hold', detail: 'Au sol, bas du dos collé.' },
            { titre: '20 s de L-sit groupé', detail: 'Sur des barres ou des haltères, pieds décollés.' },
            { titre: '10 s de L-sit une jambe', detail: 'Une jambe tendue à l’horizontale, de chaque côté.' },
            { titre: '15 s de L-sit jambes tendues', detail: 'Les deux jambes tendues à l’horizontale.' },
        ],
    },
    {
        id: 'pistol',
        nom: 'Pistol squat',
        emoji: '🦵',
        seance: 'B',
        ou: 'Séance B (jambes)',
        etapes: [
            { titre: '15 fentes bulgares par jambe', detail: 'Au poids du corps, genou arrière qui frôle le sol.' },
            { titre: '8 pistols sur un banc par jambe', detail: 'Descente lente jusqu’au banc, remontée sur une jambe.' },
            { titre: '5 pistols assistés par jambe', detail: 'Tout en bas, en t’aidant le moins possible.' },
            { titre: '5 pistols libres par jambe', detail: 'Sans aide, talon au sol.' },
        ],
    },
]

const fig = (id: FigureId, etape: number) => ({ id, etape })

// ---------- Les séances, par niveau ----------

export const OBJECTIF_KM = 10 // bonus de fin d'année
export const OBJECTIF_DATE = '2027-06-30'


export const PROGRAMME: SeanceBase[] = [
    {
        code: 'A',
        lieu: 'salle',
        emoji: '💪',
        degrade: ['#0b2a6b', '#1e5bd8'],
        titre: 'Haut du corps : tirer + pousser',
        court: 'Haut du corps en callisthénie (tractions, dips, pompes) + épaules',
        couleur: '#4d9fff',
        focus: 'Callisthénie : tractions, dips et pompes jusqu’au muscle-up, avec un peu de poulie légère pour les épaules. Des reps propres et beaucoup d’endurance, plutôt que du lourd.',
        niveaux: [
            {
                nom: 'Bases',
                resume: 'Australiennes, négatives et tractions assistées pour construire ta première traction, pompes et dips assistés pour pousser.',
                echauffement: ['5 min de rameur (effort 4/10)', 'Rotations d’épaules, 10 tirages d’épaules suspendu à la barre, 10 pompes faciles'],
                blocs: [
                    bloc('Tirer', 3, 75, [KA.australiennes, KA.negatives]),
                    bloc('Tractions assistées', 3, 75, [avec(A.tractionsAssistees, 3, '8–10')]),
                    bloc('Pousser', 3, 60, [reps(D.pompes, 3, 'max − 2'), KA.dipsAssistes]),
                    bloc('Épaules (léger)', 2, 45, [avec(A.facePull, 2, '15–20'), avec(A.elevLatPoulie, 2, '15 par bras')]),
                    bloc('Finisher', 1, 0, [KA.emomPompes]),
                ],
                retourAuCalme: ['Suspension passive à la barre (20 s)', '2 min d’étirements pectoraux, dos et épaules'],
                progression: 'Négatives : +1 s de descente par séance. Assistance : −2,5 kg quand les 3 séries de 10 passent. Pompes : +1 rep par série.',
                monter: 'Niveau 2 quand tu réussis ta première traction stricte.',
                defi: { titre: '1 traction stricte', detail: 'Bras tendus en bas, menton au-dessus de la barre, sans élan. La 1re étape du muscle-up.', apres: 8, figure: fig('muscle-up', 1) },
            },
            {
                nom: 'Tractions',
                resume: 'Les vraies tractions arrivent : tu accumules les reps, et les dips passent au poids du corps.',
                echauffement: ['5 min de rameur (effort 4/10)', 'Rotations d’épaules, 10 tirages d’épaules à la barre', '1 série facile de 5 australiennes et 8 pompes'],
                blocs: [
                    bloc('Tractions', 4, 90, [KA.tractions]),
                    bloc('Dips', 3, 75, [reps(A.dips, 3, '6–10')]),
                    bloc('Tirer + pousser', 3, 60, [avec(KA.australiennes, 3, '12, pieds sur un banc'), KA.pompesDiamant]),
                    bloc('Épaules', 3, 45, [reps(D.pike, 3, '8–10'), avec(A.facePull, 3, '15–20')]),
                    bloc('Finisher', 1, 0, [KA.emomTractions]),
                ],
                retourAuCalme: ['Suspension passive à la barre (20 s)', '2 min d’étirements pectoraux, dos et épaules'],
                progression: '+1 rep au total des tractions chaque séance (par exemple 3-3-2-2, puis 3-3-3-2).',
                monter: 'Niveau 3 quand tu fais 8 tractions strictes d’affilée.',
                defi: { titre: '8 tractions strictes d’affilée', detail: 'Sans balancer, bras tendus à chaque rep.', apres: 10, figure: fig('muscle-up', 2) },
            },
            {
                nom: 'Explosif',
                resume: 'Tirer vite et haut : tractions explosives, pompes archer et claquées. C’est ce qui prépare le muscle-up.',
                echauffement: ['5 min de rameur (effort 4/10)', 'Rotations d’épaules, 5 tractions faciles, 10 pompes'],
                blocs: [
                    bloc('Tractions explosives', 4, 90, [KA.explosives]),
                    bloc('Dips', 4, 75, [reps(A.dips, 4, '10–15'), KA.dipsBarre]),
                    bloc('Pousser', 3, 60, [KA.pompesArcher, KA.pompesClaquees]),
                    bloc('Tirer + épaules', 3, 45, [avec(KA.tractions, 3, 'max − 2, prise serrée'), avec(A.elevLatPoulie, 3, '15 par bras')]),
                    bloc('Finisher', 1, 0, [KA.emomTractions]),
                ],
                retourAuCalme: ['Suspension passive à la barre (20 s)', '2 min d’étirements pectoraux, dos et épaules'],
                progression: 'Tractions explosives : monte un peu plus haut chaque semaine (menton → clavicules → poitrine).',
                monter: 'Niveau 4 quand tu fais 5 tractions explosives poitrine à la barre.',
                defi: { titre: '5 tractions explosives, poitrine à la barre', detail: 'Les 5 dans la même série, aussi hautes la dernière que la première.', apres: 10, figure: fig('muscle-up', 3) },
            },
            {
                nom: 'Muscle-up',
                resume: 'Les transitions avec élastique, les négatives et les dips sur barre : tu assembles le muscle-up.',
                echauffement: ['5 min de rameur (effort 4/10)', 'Rotations d’épaules et de poignets, 5 tractions explosives faciles, 5 dips sur barre'],
                blocs: [
                    bloc('Muscle-up', 5, 120, [KA.muscleUpElastique]),
                    bloc('Négatives', 3, 90, [KA.muscleUpNegatif]),
                    bloc('Force', 3, 75, [avec(KA.explosives, 3, '4–5'), avec(KA.dipsBarre, 3, '10–12')]),
                    bloc('Pousser', 3, 60, [avec(KA.pompesArcher, 3, '6 par côté'), avec(A.facePull, 3, '15–20')]),
                ],
                retourAuCalme: ['Suspension passive à la barre (20 s)', '2 min d’étirements pectoraux, dos et épaules'],
                progression: 'Élastique plus fin dès que tu enchaînes 3 muscle-up propres.',
                monter: 'Dernier niveau : après le muscle-up, vise 3 puis 5 d’affilée.',
                defi: { titre: '🏅 1 muscle-up strict', detail: 'Sans élastique : traction, transition, dips. L’objectif final du haut du corps.', apres: 12, figure: fig('muscle-up', 5) },
            },
        ],
    },
    {
        code: 'B',
        lieu: 'salle',
        emoji: '🦵',
        degrade: ['#063b26', '#0f9a5c'],
        titre: 'Jambes + gainage',
        court: 'Jambes (vers le pistol squat) et gainage (vers le L-sit)',
        couleur: '#00c46a',
        focus: 'Jambes sur une jambe jusqu’au pistol squat, ischios au nordic, gainage vers le L-sit, et un peu de charge légère en séries longues pour l’endurance.',
        niveaux: [
            {
                nom: 'Bases',
                resume: 'Squat goblet léger et fentes bulgares en séries longues, ischios et mollets, puis gainage.',
                echauffement: ['5 min de vélo (effort 4/10)', '10 squats à vide, 10 fentes alternées, 10 ponts fessiers'],
                blocs: [
                    bloc('Squat', 3, 60, [avec(B.gobletSquat, 3, '15 (léger)')]),
                    bloc('Une jambe', 3, 60, [reps(D.bulgare, 3, '10–15 par jambe'), avec(B.sdtHalteres, 3, '12')]),
                    bloc('Mollets', 3, 45, [avec(B.molletsDebout, 3, '20')]),
                    bloc('Gainage', 3, 45, [reps(B.releveGenoux, 3, '10–12'), tenue(D.hollow, 3, '20–30 s')]),
                    bloc('Finisher', 1, 0, [KB.circuit]),
                ],
                retourAuCalme: ['2 min d’étirements cuisses, fessiers et mollets'],
                progression: 'Fentes bulgares : +1 rep par jambe et par série. Charges légères : +2,5 kg seulement quand les 15 reps sont faciles.',
                monter: 'Niveau 2 quand tu fais 15 fentes bulgares par jambe, propres.',
                defi: { titre: '15 fentes bulgares par jambe', detail: 'Au poids du corps, genou arrière qui frôle le sol à chaque rep. La 1re étape du pistol squat.', apres: 8, figure: fig('pistol', 1) },
            },
            {
                nom: 'Une jambe',
                resume: 'Pistol sur un banc, nordic et soulevé de terre une jambe : chaque jambe travaille seule. Le L-sit groupé commence.',
                echauffement: ['5 min de vélo (effort 4/10)', '10 squats à vide, 10 fentes, 10 ponts fessiers une jambe', ECHAUFFEMENT_POIGNETS],
                blocs: [
                    bloc('Pistol sur banc', 3, 75, [KB.boxPistol]),
                    bloc('Ischios', 3, 75, [avec(KB.nordic, 3, '3–5'), KB.sdtUneJambe]),
                    bloc('Fentes', 3, 60, [avec(B.fentesBulgares, 3, '12 par jambe (léger)'), avec(D.molletsUneJambe, 3, '15 par jambe')]),
                    bloc('Gainage', 4, 45, [KB.lsitGroupe, reps(B.releveJambes, 4, '8–10')]),
                    bloc('Finisher', 1, 0, [KB.circuit]),
                ],
                retourAuCalme: ['2 min d’étirements cuisses, fessiers et mollets'],
                progression: 'Pistol sur banc : banc plus bas dès que les 8 reps passent. Nordic : descente plus lente.',
                monter: 'Niveau 3 quand tu fais 8 pistols sur un banc par jambe.',
                defi: { titre: '8 pistols sur un banc par jambe', detail: 'Descente lente jusqu’au banc, remontée sur une jambe sans élan.', apres: 10, figure: fig('pistol', 2) },
            },
            {
                nom: 'Pistol assisté',
                resume: 'Pistols tout en bas en te tenant, sauts pour l’explosivité, L-sit une jambe.',
                echauffement: ['5 min de vélo (effort 4/10)', '10 squats, 5 pistols sur banc par jambe, 10 squats sautés légers', ECHAUFFEMENT_POIGNETS],
                blocs: [
                    bloc('Pistol assisté', 4, 75, [KB.pistolAssiste]),
                    bloc('Explosivité', 3, 75, [reps(D.squatSaute, 3, '8'), KB.nordic]),
                    bloc('Une jambe', 3, 60, [avec(KB.sdtUneJambe, 3, '12 par jambe'), avec(D.molletsUneJambe, 3, '15 par jambe')]),
                    bloc('Gainage', 4, 45, [KB.lsitUneJambe, reps(B.releveJambes, 4, '10–12')]),
                    bloc('Finisher', 1, 0, [KB.circuit]),
                ],
                retourAuCalme: ['2 min d’étirements cuisses, fessiers et mollets'],
                progression: 'Aide-toi de moins en moins avec les mains, d’abord à la descente, puis à la remontée.',
                monter: 'Niveau 4 quand tu fais 5 pistols assistés par jambe en t’aidant à peine.',
                defi: { titre: '5 pistols assistés par jambe', detail: 'Tout en bas, talon au sol, mains presque sans effort.', apres: 10, figure: fig('pistol', 3) },
            },
            {
                nom: 'Pistol',
                resume: 'Pistols libres, sauts et nordic complet : des jambes fortes, légères et explosives.',
                echauffement: ['5 min de vélo (effort 4/10)', '10 squats, 3 pistols assistés par jambe, 10 squats sautés', ECHAUFFEMENT_POIGNETS],
                blocs: [
                    bloc('Pistol', 4, 90, [KB.pistol]),
                    bloc('Explosivité', 3, 75, [reps(D.squatSaute, 3, '10'), avec(KB.nordic, 3, '5–6')]),
                    bloc('Une jambe', 3, 60, [avec(KB.sdtUneJambe, 3, '12 par jambe'), avec(D.molletsUneJambe, 3, '20 par jambe')]),
                    bloc('Gainage', 4, 45, [tenue(KD.lsit, 4, '5–10 s'), reps(B.releveJambes, 4, '12')]),
                ],
                retourAuCalme: ['2 min d’étirements cuisses, fessiers et mollets'],
                progression: 'Quand 5 pistols par jambe passent : tiens 2 s en bas, ou prends un petit poids.',
                monter: 'Dernier niveau : vise 10 pistols par jambe d’affilée.',
                defi: { titre: '🏅 5 pistols libres par jambe', detail: 'Sans aide, talon au sol, contrôlés. L’objectif final des jambes.', apres: 12, figure: fig('pistol', 4) },
            },
        ],
    },
    {
        code: 'C',
        lieu: 'salle',
        emoji: '⚡',
        degrade: ['#4a0d05', '#d9481e'],
        titre: 'Cardio athlétique',
        court: 'Cardio athlétique (fond + efforts de match)',
        couleur: '#ff5a36',
        focus: 'Retrouver ta forme de basketteur : courir longtemps sans fatigue, et enchaîner des accélérations comme dans un match, en récupérant vite.',
        niveaux: [
            {
                nom: 'Départ',
                resume: 'Pour démarrer en douceur : des petits blocs de course très lente, et beaucoup de marche. Le souffle et les jambes s’habituent.',
                duree: 40,
                echauffement: ['6 min de marche, de 5 à 6 km/h', 'Montées de genoux et talons-fesses sur place (1 min)', '1 min de trottinage très lent à 6,5 km/h'],
                blocs: [
                    bloc('Course + marche', 1, 0, [
                        course('c-depart', '7 × (2 min course + 2 min marche)', 7, '2 min à 6,5–7,5 km/h, puis 2 min de marche à 5,5 km/h', [
                            'Course TRÈS lente : tu dois pouvoir parler en phrases. Essoufflé ? Ralentis encore, même à 6,5 km/h',
                            'Petits pas rapides, pieds sous le corps : ça évite que les cuisses « brûlent »',
                            'Les jambes qui chauffent au début, c’est normal : ça diminue en quelques séances',
                        ]),
                    ]),
                    bloc('Finition en côte', 1, 0, [marche('c-marche-inclinee', 6, '8 %', '5 km/h')]),
                ],
                retourAuCalme: RETOUR_COURSE,
                progression: 'D’abord garder la même vitesse et que ce soit plus facile. Ensuite : 2 min 30 de course, puis 3 min.',
                monter: 'Niveau 2 quand tu cours 5 min d’affilée sans être essoufflé.',
                defi: { titre: 'Courir 5 min sans t’arrêter, en pouvant parler', detail: 'À 7–7,5 km/h. Si tu y arrives sans être à bout de souffle, tu es prêt pour ta formule.', apres: 4 },
            },
            {
                nom: 'Fond',
                resume: 'Ta formule course + marche, avec un peu plus de course : la base du souffle.',
                duree: 45,
                echauffement: ECHAUFFEMENT_COURSE,
                blocs: [
                    bloc('Course + marche', 1, 0, [course('c-fond', '4 × (5 min course + 2 min marche)', 4, '5 min à 7,5–8,5 km/h, puis 2 min de marche à 5,5 km/h', ['Course facile : tu peux parler par phrases (effort 6/10)', 'Coche un rond à chaque bloc'])]),
                    bloc('Finition en côte', 1, 0, [marche('c-marche-inclinee', 6, '10 %', '5 km/h')]),
                ],
                retourAuCalme: RETOUR_COURSE,
                progression: '+0,5 km/h sur la course quand les 4 blocs passent bien.',
                monter: 'Niveau 2 quand tu tiens 4 × 5 min à 9 km/h sans finir épuisé.',
                defi: { titre: 'Courir 15 min sans t’arrêter', detail: 'À 8 km/h environ, sans marcher. Tu dois finir en pouvant encore parler.', apres: 4 },
            },
            {
                nom: 'Vitesse',
                resume: 'Course facile + 6 accélérations : tu réveilles la vitesse, comme une contre-attaque.',
                duree: 45,
                echauffement: ECHAUFFEMENT_COURSE,
                blocs: [
                    bloc('Course facile', 1, 0, [course('c-fond', '3 × (8 min course + 1 min marche)', 3, '8 min à 8,5–9 km/h, puis 1 min de marche', ['Allure facile, respiration calme'])]),
                    bloc('Accélérations', 1, 0, [course('c-acceleration', '6 × (20 s vite + 40 s marche)', 6, '20 s à 12–13 km/h, puis 40 s de marche', ['Vite = effort 9/10 mais relâché : épaules basses, bras qui poussent', 'Sur tapis : monte la vitesse 5 s avant, ou fais-les dehors'])]),
                ],
                retourAuCalme: RETOUR_COURSE,
                progression: '+0,5 km/h sur les accélérations quand elles restent faciles à tenir.',
                monter: 'Niveau 3 quand les 24 min de course passent sans pause difficile.',
                defi: { titre: 'Courir 20 min sans t’arrêter, puis 6 accélérations à 12 km/h', detail: 'Le fond et la vitesse dans la même séance.', apres: 4 },
            },
            {
                nom: '30/30',
                resume: '30 s vite, 30 s lent : le format le plus proche d’un match. Le cœur apprend à récupérer en courant.',
                duree: 45,
                echauffement: [...ECHAUFFEMENT_COURSE, '6 min de course facile à 8 km/h'],
                blocs: [
                    bloc('30/30', 1, 0, [course('c-30-30', '2 × (8 × 30 s vite + 30 s lent)', 16, '30 s à 11–12 km/h, puis 30 s à 6 km/h · 3 min de marche entre les 2 séries', ['Coche un rond à chaque « vite »', 'Si tu n’arrives plus à tenir la vitesse : 30 s de marche au lieu de trot'])]),
                    bloc('Course facile', 1, 0, [course('c-fond', 'Course facile', 1, '8 min à 8,5 km/h', ['Tu récupères en courant'])]),
                ],
                retourAuCalme: RETOUR_COURSE,
                progression: '+0,5 km/h sur les 30 s vite quand les 16 passent.',
                monter: 'Niveau 4 quand tu récupères en trottinant (6-7 km/h) au lieu de marcher.',
                defi: { titre: '16 × 30/30 en récupérant en trottinant', detail: 'Les 30 s lentes se font en courant (6-7 km/h), jamais en marchant.', apres: 4 },
            },
            {
                nom: 'Endurance',
                resume: '25 min sans t’arrêter : tu ne te sens plus lourd, même quand ça dure.',
                duree: 45,
                echauffement: ECHAUFFEMENT_COURSE,
                blocs: [
                    bloc('Course continue', 1, 0, [course('c-fond', '25 min de course continue', 5, '5 × 5 min à 8,5–9,5 km/h, sans marcher', ['Coche un rond toutes les 5 minutes', 'Trop dur ? Baisse de 0,5 km/h plutôt que de marcher'])]),
                    bloc('Accélérations', 1, 0, [course('c-acceleration', '6 × (20 s vite + 40 s marche)', 6, '20 s à 12–13 km/h, puis 40 s de marche', ['Relâché, foulée rapide'])]),
                ],
                retourAuCalme: RETOUR_COURSE,
                progression: 'Monte la course continue de 0,5 km/h quand c’est facile.',
                monter: 'Niveau 5 quand les 25 min sont faciles à 9 km/h.',
                defi: { titre: 'Courir 5 km sans t’arrêter', detail: 'Allure libre (environ 35 min). C’est le premier grand palier vers les 10 km.', apres: 5 },
            },
            {
                nom: 'Match',
                resume: '3 « quart-temps » de 15/15 : exactement le rythme d’un match de basket.',
                duree: 45,
                echauffement: [...ECHAUFFEMENT_COURSE, '8 min de course facile à 8,5 km/h'],
                blocs: [
                    bloc('Quart-temps', 3, 120, [course('c-15-15', '3 × 6 min de 15/15', 3, '12 × (15 s à 13–14 km/h + 15 s à 7 km/h), 2 min de marche entre', ['Un rond = un quart-temps de 6 min', 'Sur tapis c’est dur à régler : fais-le dehors, ou au vélo / rameur'])]),
                    bloc('Course facile', 1, 0, [course('c-fond', 'Course facile', 1, '8 min à 8,5–9 km/h', ['Tu récupères en courant'])]),
                ],
                retourAuCalme: RETOUR_COURSE,
                progression: 'Garde la qualité des 15 s vite jusqu’au 3e quart-temps.',
                monter: 'Niveau 6 quand le 3e quart-temps est aussi rapide que le 1er.',
                defi: { titre: 'Test du basketteur : 3 quart-temps de 15/15 sans ralentir', detail: 'Le 3e quart-temps aussi rapide que le 1er : tu tiens un match entier.', apres: 5 },
            },
            {
                nom: 'Top forme',
                resume: '30 min continues (environ 5 km) + sprints : ta forme de basketteur. Les 10 km de fin d’année deviennent possibles.',
                duree: 50,
                echauffement: ECHAUFFEMENT_COURSE,
                blocs: [
                    bloc('Course continue', 1, 0, [course('c-fond', '30 min de course continue', 6, '6 × 5 min à 9–10 km/h', ['Coche un rond toutes les 5 minutes'])]),
                    bloc('Sprints', 1, 0, [course('c-acceleration', '8 × (15 s sprint + 45 s marche)', 8, '15 s à 14–15 km/h, puis 45 s de marche', ['Sprint relâché, gros mouvement de bras'])]),
                ],
                retourAuCalme: RETOUR_COURSE,
                progression: 'Alterne : une semaine ce niveau, une semaine le niveau 5. Bonus : allonge la course continue de 5 min par mois.',
                monter: 'Dernier niveau ! Bonus de fin d’année : allonger la course jusqu’aux 10 km.',
                defi: { titre: '🏅 Courir 10 km sans t’arrêter', detail: 'L’objectif de l’année, à ton allure (moins de 2 h ; 1 h à 1 h 10 en bonus). Avant de tenter : une sortie de 45 min, puis une de 60 min.', apres: 8 },
            },
        ],
    },
    {
        code: 'D',
        lieu: 'maison',
        emoji: '🤸',
        degrade: ['#2b0a45', '#8b2fd6'],
        titre: 'Skills : équilibre et gainage',
        court: 'Skills (salle ou maison) : handstand, front lever, L-sit, endurance',
        couleur: '#cc44ff',
        focus: 'Les figures : équilibre sur les mains jusqu’au handstand, front lever à la barre, L-sit, et un circuit d’endurance. À la salle ou à la maison (une barre de traction suffit).',
        niveaux: [
            {
                nom: 'Équilibre',
                resume: 'Corbeau, montée au mur, suspension active et gainage : les bases de toutes les figures.',
                duree: 40,
                echauffement: [ECHAUFFEMENT_POIGNETS, 'Rotations des épaules, 20 jumping jacks, 5 pompes'],
                blocs: [
                    bloc('Équilibre', 4, 60, [KD.corbeau, avec(KD.handstandMur, 4, '10–20 s')]),
                    bloc('Barre', 3, 60, [KD.suspension]),
                    bloc('Gainage', 3, 45, [tenue(D.hollow, 3, '20–30 s'), KD.arch]),
                    bloc('Épaules', 3, 45, [reps(D.pike, 3, '8–10'), D.facePull]),
                    bloc('Endurance', 1, 0, [KD.circuit]),
                ],
                retourAuCalme: ['Étirements poignets, épaules et dos (2 min)'],
                progression: 'Corbeau et mur : +2 à 3 s par séance. Le hollow : +5 s par semaine.',
                monter: 'Niveau 2 quand tu tiens 20 s de corbeau.',
                defi: { titre: '20 s de corbeau', detail: 'En équilibre sur les mains, genoux sur les coudes, pieds décollés. La 1re étape du handstand.', apres: 6, figure: fig('handstand', 1) },
            },
            {
                nom: 'Mur',
                resume: 'Handstand ventre au mur, front lever groupé et L-sit groupé : tu commences les vraies figures.',
                duree: 40,
                echauffement: [ECHAUFFEMENT_POIGNETS, 'Rotations des épaules, 20 jumping jacks, 20 s de corbeau'],
                blocs: [
                    bloc('Handstand au mur', 4, 75, [KD.handstandMur]),
                    bloc('Front lever', 4, 75, [KD.frontGroupe]),
                    bloc('L-sit + gainage', 3, 45, [KB.lsitGroupe, tenue(D.hollow, 3, '30 s')]),
                    bloc('Épaules', 3, 45, [reps(D.pompesSurelevees, 3, 'max − 2'), D.facePull]),
                    bloc('Endurance', 1, 0, [KD.circuit]),
                ],
                retourAuCalme: ['Étirements poignets, épaules et dos (2 min)'],
                progression: 'Mur : rapproche les mains du mur, corps de plus en plus droit. Front lever : +2 s par séance.',
                monter: 'Niveau 3 quand tu tiens 30 s ventre au mur.',
                defi: { titre: '30 s ventre au mur', detail: 'Corps droit, bras tendus, sans t’effondrer dans les épaules.', apres: 8, figure: fig('handstand', 2) },
            },
            {
                nom: 'Avancé',
                resume: 'Plus long au mur et premiers essais libres, front lever avancé, pompes en équilibre partielles.',
                duree: 40,
                echauffement: [ECHAUFFEMENT_POIGNETS, 'Rotations des épaules, 20 jumping jacks, 20 s ventre au mur'],
                blocs: [
                    bloc('Handstand', 4, 75, [avec(KD.handstandMur, 4, '45–60 s'), avec(KD.handstandLibre, 4, '4 essais libres')]),
                    bloc('Front lever', 4, 75, [KD.frontAvance]),
                    bloc('Force épaules', 3, 75, [KD.pompesEquilibre]),
                    bloc('L-sit + gainage', 3, 45, [KB.lsitUneJambe, KD.arch]),
                    bloc('Endurance', 1, 0, [KD.circuit]),
                ],
                retourAuCalme: ['Étirements poignets, épaules et dos (2 min)'],
                progression: 'Essais libres : compte les secondes du meilleur essai et note-le.',
                monter: 'Niveau 4 quand tu tiens 60 s ventre au mur.',
                defi: { titre: '60 s ventre au mur', detail: 'Une minute complète, corps gainé.', apres: 10, figure: fig('handstand', 3) },
            },
            {
                nom: 'Libre',
                resume: 'Handstand libre, front lever une jambe et L-sit tendu : les figures complètes.',
                duree: 40,
                echauffement: [ECHAUFFEMENT_POIGNETS, 'Rotations des épaules, 20 jumping jacks, 30 s ventre au mur'],
                blocs: [
                    bloc('Handstand libre', 6, 60, [KD.handstandLibre]),
                    bloc('Front lever', 4, 75, [KD.frontUneJambe]),
                    bloc('Force épaules', 3, 75, [avec(KD.pompesEquilibre, 3, '5 (plus bas)')]),
                    bloc('L-sit', 4, 45, [KD.lsit, KD.arch]),
                ],
                retourAuCalme: ['Étirements poignets, épaules et dos (2 min)'],
                progression: 'Handstand libre : un essai de plus par séance, puis des tenues plus longues.',
                monter: 'Dernier niveau : vise 30 s libres, puis la pompe en équilibre complète.',
                defi: { titre: '🏅 30 s de handstand libre', detail: 'Sans mur, sans marcher sur les mains. L’objectif final de l’équilibre.', apres: 12, figure: fig('handstand', 5) },
            },
        ],
    },
]

// ---------- Accès ----------

export const SEANCES_SALLE = PROGRAMME.filter((s) => s.lieu === 'salle')
export const SEANCE_MAISON = PROGRAMME.find((s) => s.lieu === 'maison') as SeanceBase

/** Tous les exercices de tous les niveaux (pour l'historique et les conseils). */
export const TOUS_LES_EXERCICES: Exercice[] = (() => {
    const vus = new Map<string, Exercice>()
    for (const s of PROGRAMME) for (const n of s.niveaux) for (const b of n.blocs) for (const e of b.exercices) if (!vus.has(e.id)) vus.set(e.id, e)
    // Exercices des anciennes versions du programme : gardés pour l'historique et les courbes.
    for (const e of [...Object.values(A), ...Object.values(B), ...Object.values(D), ...Object.values(KA), ...Object.values(KB), ...Object.values(KD)]) if (!vus.has(e.id)) vus.set(e.id, e)
    return [...vus.values()]
})()

const CLE_NIVEAUX = 'muscu.niveaux'
export type NiveauxChoisis = Partial<Record<CodeSeance, { n: number; depuis?: string }>>

export function lireNiveaux(): NiveauxChoisis {
    try {
        const brut = localStorage.getItem(CLE_NIVEAUX)
        return brut ? (JSON.parse(brut) as NiveauxChoisis) : {}
    } catch {
        return {}
    }
}
export function ecrireNiveaux(n: NiveauxChoisis): void {
    try {
        localStorage.setItem(CLE_NIVEAUX, JSON.stringify(n))
    } catch {
        // stockage indisponible
    }
}

/** La séance au niveau demandé (par défaut : le niveau choisi par Daniel, gardé sur l'appareil). */
export function seanceParCode(code: string, niveau?: number): SeanceProgramme {
    const base = PROGRAMME.find((s) => s.code === code) ?? PROGRAMME[0]
    const voulu = niveau ?? lireNiveaux()[base.code]?.n ?? 1
    const n = Math.min(base.niveaux.length, Math.max(1, Math.round(voulu) || 1))
    return { ...base, ...base.niveaux[n - 1], niveau: n, nbNiveaux: base.niveaux.length }
}

/** Durée de la séance en minutes (les courses ont leur propre durée selon l'étape). */
export function dureeDe(s: SeanceProgramme, reglage: number): number {
    return s.duree ?? reglage
}
