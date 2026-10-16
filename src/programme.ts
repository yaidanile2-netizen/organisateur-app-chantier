// Programme de la semaine : 4 séances, la muscu d'abord.
//   A haut du corps (salle) · B bas du corps + abdos (salle) · C cardio athlétique (salle / dehors)
//   D maison (épaules, posture, fessiers, gainage).
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
    mesure?: 'km' // course : on note la distance parcourue (km) au lieu d'une charge
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
export type Defi = { titre: string; detail: string; apres: number }

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

// ---------- Les séances, par niveau ----------

export const OBJECTIF_KM = 10 // bonus de fin d'année
export const OBJECTIF_DATE = '2027-06-30'

export const PROGRAMME: SeanceBase[] = [
    {
        code: 'A',
        lieu: 'salle',
        emoji: '💪',
        degrade: ['#0b2a6b', '#1e5bd8'],
        titre: 'Haut du corps',
        court: 'Haut du corps (pecs, dos, épaules, bras)',
        couleur: '#4d9fff',
        focus: 'Musculation : pectoraux, dos, épaules, biceps et triceps.',
        niveaux: [
            {
                nom: 'Machines guidées',
                resume: 'Les grands mouvements sur machines, pour apprendre la technique sans risque.',
                echauffement: ['5 min de rameur (effort 4/10)', 'Rotations d’épaules, puis 1 série légère de 15 reps au chest press'],
                blocs: [
                    bloc('Pousser + tirer', 3, 75, [A.chestPress, A.latPulldown]),
                    bloc('Épaules + dos', 3, 75, [A.shoulderPress, A.seatedRow]),
                    bloc('Pecs + arrière d’épaules', 3, 60, [A.pecDeck, A.oiseauMachine]),
                    bloc('Bras', 3, 45, [A.curlPoulie, A.tricepsCorde]),
                ],
                retourAuCalme: ['2 min d’étirements pectoraux, dos et épaules'],
                progression: 'Toutes les séries réussies en haut de la fourchette ? +2,5 kg la prochaine fois.',
                monter: 'Niveau 2 quand tout te semble facile 2 séances de suite (souvent après 4 à 6 semaines).',
                defi: { titre: 'Chest press et tirage vertical : 3 × 12 propres', detail: 'Avec ta charge actuelle, les 3 séries de 12 sans tricher (dos collé, descente lente) sur les deux machines.', apres: 8 },
            },
            {
                nom: 'Haltères',
                resume: 'Les haltères obligent chaque bras à se stabiliser seul : plus de muscles travaillent.',
                echauffement: ['5 min de rameur (effort 4/10)', 'Rotations d’épaules et 10 pompes', '1 série de 12 au développé couché avec des haltères légers'],
                blocs: [
                    bloc('Développé couché', 4, 90, [A.dcHalteres]),
                    bloc('Dos + épaules', 3, 75, [A.tirageSerre, A.militaireHalteres]),
                    bloc('Rowing', 3, 60, [A.rowingHaltere]),
                    bloc('Épaules 3D', 3, 45, [A.elevLatHalteres, A.facePull]),
                    bloc('Bras', 3, 45, [A.curlIncline, A.tricepsNuque]),
                ],
                retourAuCalme: ['2 min d’étirements pectoraux, dos et épaules'],
                progression: 'Haltères : passe à la paire suivante quand tu fais le haut de la fourchette sur toutes les séries.',
                monter: 'Niveau 3 quand tu es à l’aise techniquement avec les haltères et que tout est facile 2 séances de suite.',
                defi: { titre: 'Développé couché haltères : 4 × 10 avec 2 × 14 kg', detail: 'Environ 40 % de ton poids au total. Omoplates serrées, descente jusqu’à la poitrine.', apres: 10 },
            },
            {
                nom: 'Barre et force',
                resume: 'Barre, tractions et dips : moins de répétitions, plus lourd, pour gagner en force.',
                echauffement: ['5 min de rameur (effort 4/10)', 'Rotations d’épaules et 10 pompes', 'Montée au développé couché : 10 reps barre seule, puis 5 reps à 60 % de ta charge'],
                blocs: [
                    bloc('Développé couché', 4, 120, [A.dcBarre]),
                    bloc('Tractions', 4, 90, [A.tractionsAssistees]),
                    bloc('Incliné + rowing', 3, 90, [A.inclineHalteres, A.rowingBarre]),
                    bloc('Épaules + dips', 3, 60, [A.elevLatPoulie, A.dips]),
                    bloc('Bras + posture', 3, 45, [A.curlEz, A.facePull]),
                ],
                retourAuCalme: ['2 min d’étirements pectoraux, dos et épaules'],
                progression: 'Barre : +2,5 kg dès que les 4 séries sont faites en haut de la fourchette. Tractions : −2,5 kg d’assistance.',
                monter: 'Dernier niveau : continue d’ajouter du poids. Quand les tractions se font sans assistance, on pourra ajouter un niveau 4.',
                defi: { titre: '🏅 1 traction stricte, sans assistance', detail: 'Bras tendus en bas, menton au-dessus de la barre, sans élan. Le défi ultime du haut du corps.', apres: 12 },
            },
        ],
    },
    {
        code: 'B',
        lieu: 'salle',
        emoji: '🦵',
        degrade: ['#063b26', '#0f9a5c'],
        titre: 'Bas du corps + abdos',
        court: 'Bas du corps et abdos',
        couleur: '#00c46a',
        focus: 'Musculation : cuisses, fessiers, ischios, mollets et gainage. Des jambes fortes = plus d’explosivité et moins de blessures.',
        niveaux: [
            {
                nom: 'Machines + squat',
                resume: 'Les machines pour charger les jambes, et le squat goblet pour apprendre le mouvement roi.',
                echauffement: ['5 min de vélo (effort 4/10)', '10 squats à vide et 10 fentes alternées'],
                blocs: [
                    bloc('Squat goblet', 3, 75, [B.gobletSquat]),
                    bloc('Presse + ischios', 3, 75, [B.legPress, B.legCurl]),
                    bloc('Cuisses + mollets', 3, 60, [B.legExtension, B.mollets]),
                    bloc('Fessiers', 2, 45, [B.abducteurs]),
                    bloc('Gainage', 3, 45, [B.crunch, B.planche]),
                ],
                retourAuCalme: ['2 min d’étirements cuisses, fessiers et mollets'],
                progression: 'Machines : +2,5 kg (presse : +5 kg) quand toutes les séries sont réussies et faciles.',
                monter: 'Niveau 2 quand le squat goblet est propre avec un haltère lourd et que tout est facile 2 séances de suite.',
                defi: { titre: 'Squat goblet : 3 × 10 avec un haltère de 20 kg', detail: 'Cuisses au moins parallèles au sol, talons au sol, dos droit.', apres: 8 },
            },
            {
                nom: 'Poids libres',
                resume: 'Squat guidé, soulevé de terre roumain et fentes : les jambes travaillent avec l’équilibre.',
                echauffement: ['5 min de vélo (effort 4/10)', '10 squats à vide, 10 fentes, 10 ponts fessiers', '1 série légère de 10 à la Smith machine'],
                blocs: [
                    bloc('Squat', 4, 90, [B.squatSmith]),
                    bloc('Ischios', 3, 75, [B.sdtHalteres, avec(B.legCurl, 3, '10–12')]),
                    bloc('Fentes', 3, 75, [B.fentesMarchees]),
                    bloc('Fessiers + mollets', 3, 60, [B.hipThrust, B.molletsDebout]),
                    bloc('Abdos', 3, 45, [B.releveGenoux, B.pallof]),
                ],
                retourAuCalme: ['2 min d’étirements cuisses, fessiers et mollets'],
                progression: 'Squat et hip thrust : +2,5 à 5 kg quand toutes les séries sont réussies. Haltères : paire suivante.',
                monter: 'Niveau 3 quand le squat guidé est solide (environ ton poids sur la barre) et que tout est facile 2 séances de suite.',
                defi: { titre: 'Squat à la Smith : 4 × 8 avec ton poids du corps', detail: 'Environ 67 kg sur la barre, cuisses parallèles à chaque répétition.', apres: 10 },
            },
            {
                nom: 'Barre et force',
                resume: 'Squat barre libre, soulevé de terre roumain et fentes bulgares : le vrai programme force.',
                echauffement: ['5 min de vélo (effort 4/10)', '10 squats à vide, 10 fentes, 10 ponts fessiers', 'Montée au squat : 10 reps barre seule, puis 5 reps à 60 % de ta charge'],
                blocs: [
                    bloc('Squat barre', 4, 120, [B.squatBarre]),
                    bloc('Soulevé de terre roumain', 3, 90, [B.sdtBarre]),
                    bloc('Fentes bulgares', 3, 75, [B.fentesBulgares]),
                    bloc('Fessiers + ischios', 3, 60, [avec(B.hipThrust, 3, '8–10'), avec(B.legCurl, 3, '10')]),
                    bloc('Abdos', 3, 45, [B.releveJambes, B.crunchPoulie]),
                ],
                retourAuCalme: ['2 min d’étirements cuisses, fessiers et mollets'],
                progression: 'Squat et soulevé : +2,5 kg dès que les séries sont faites en haut de la fourchette.',
                monter: 'Dernier niveau : continue d’ajouter du poids, les séances restent efficaces très longtemps.',
                defi: { titre: '🏅 Squat barre : 5 répétitions avec ton poids du corps', detail: 'Barre libre, cuisses parallèles, barres de sécurité du rack bien réglées.', apres: 12 },
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
                nom: 'Fond',
                resume: 'Ta formule course + marche, avec un peu plus de course : la base du souffle.',
                duree: 45,
                echauffement: ECHAUFFEMENT_COURSE,
                blocs: [
                    bloc('Course + marche', 1, 0, [course('c-fond', '4 × (5 min course + 2 min marche)', 4, '5 min à 8–9 km/h, puis 2 min de marche à 5,5 km/h', ['Course facile : tu peux parler par phrases (effort 6/10)', 'Coche un rond à chaque bloc'])]),
                    bloc('Finition en côte', 1, 0, [marche('c-marche-inclinee', 6, '10 %', '5 km/h')]),
                ],
                retourAuCalme: RETOUR_COURSE,
                progression: '+0,5 km/h sur la course quand les 4 blocs passent bien.',
                monter: 'Niveau 2 quand tu tiens 4 × 5 min à 9 km/h sans finir épuisé.',
                defi: { titre: 'Courir 15 min sans t’arrêter', detail: 'À 8,5 km/h, sans marcher. Tu dois finir en pouvant encore parler.', apres: 4 },
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
        emoji: '🏠',
        degrade: ['#2b0a45', '#8b2fd6'],
        titre: 'Maison : épaules, posture, fessiers',
        court: 'À la maison (élastiques) : épaules, posture, fessiers, gainage',
        couleur: '#cc44ff',
        focus: 'Ce que la salle ne travaille pas assez : épaules (côté et arrière), trapèzes, moyen fessier, mollets, lombaires, obliques et avant-bras.',
        niveaux: [
            {
                nom: 'Élastiques',
                resume: 'Épaules, posture et fessiers avec les élastiques.',
                duree: 35,
                echauffement: ['Rotations des bras et des épaules (1 min)', '20 jumping jacks et 10 squats à vide'],
                blocs: [
                    bloc('Épaules et posture', 3, 45, [D.elevLat, D.facePull]),
                    bloc('Trapèzes et pectoraux', 3, 45, [D.haussements, D.pompes]),
                    bloc('Fessiers', 3, 45, [D.pontFessier, D.pasLateraux]),
                    bloc('Gainage et avant-bras', 2, 30, [D.superman, D.gainageLateral, D.fingerGrip]),
                ],
                retourAuCalme: ['2 min d’étirements épaules, fessiers et dos'],
                progression: 'Quand c’est facile : élastique plus dur, ou +1 pompe par séance.',
                monter: 'Niveau 2 quand tu fais 15 pompes propres et que les élastiques sont faciles.',
                defi: { titre: '15 pompes propres d’affilée', detail: 'Corps gainé, poitrine près du sol à chaque répétition.', apres: 6 },
            },
            {
                nom: 'Poids du corps +',
                resume: 'Rowing, pompes piquées, fentes bulgares et mollets : plus de muscles, et des jambes plus réactives.',
                duree: 35,
                echauffement: ['Rotations des bras et des épaules (1 min)', '30 jumping jacks, 10 squats, 5 pompes'],
                blocs: [
                    bloc('Pousser + tirer', 4, 45, [avec(D.pompes, 4, 'max − 2'), D.rowingElastique]),
                    bloc('Épaules', 3, 45, [D.pike, D.elevLat]),
                    bloc('Jambes', 3, 45, [D.bulgare, D.mollets]),
                    bloc('Fessiers + posture', 3, 30, [D.pontUneJambe, D.facePull]),
                    bloc('Gainage', 2, 30, [D.deadBug, avec(D.gainageLateral, 2, '40 s par côté'), D.fingerGrip]),
                ],
                retourAuCalme: ['2 min d’étirements épaules, fessiers et dos'],
                progression: '+1 ou 2 reps par série à chaque séance, puis élastique plus dur.',
                monter: 'Niveau 3 quand tu fais 10 pompes piquées et 12 fentes bulgares par jambe.',
                defi: { titre: '10 pompes piquées + 12 fentes bulgares par jambe', detail: 'Dans la même séance, technique propre.', apres: 8 },
            },
            {
                nom: 'Athlétique',
                resume: 'Pompes surélevées, sauts, Y-T-W et hollow : fort et explosif, comme sur un terrain.',
                duree: 35,
                echauffement: ['Rotations des bras et des épaules (1 min)', '30 jumping jacks, 10 squats, 5 pompes'],
                blocs: [
                    bloc('Pousser + tirer', 4, 60, [D.pompesSurelevees, avec(D.rowingElastique, 4, '10–12 (élastique fort)')]),
                    bloc('Explosivité', 3, 60, [D.squatSaute, D.molletsUneJambe]),
                    bloc('Épaules', 3, 45, [avec(D.pike, 3, '8–10, pieds sur une chaise'), D.ytw]),
                    bloc('Fessiers', 3, 45, [avec(D.pontUneJambe, 3, '12, épaules sur le canapé'), D.pasLateraux]),
                    bloc('Gainage', 3, 30, [D.hollow, avec(D.gainageLateral, 3, '45 s par côté')]),
                ],
                retourAuCalme: ['2 min d’étirements épaules, fessiers et dos'],
                progression: 'Charge un sac à dos (livres, bouteilles) pour les mollets, et un élastique plus fort.',
                monter: 'Dernier niveau : ajoute du poids dans le sac à dos petit à petit.',
                defi: { titre: '🏅 25 pompes d’affilée', detail: 'Le défi final de la séance maison.', apres: 10 },
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
    for (const e of [...Object.values(A), ...Object.values(B), ...Object.values(D)]) if (!vus.has(e.id)) vus.set(e.id, e)
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
