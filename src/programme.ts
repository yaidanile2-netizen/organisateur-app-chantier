// Programme de la semaine, orienté vers l'objectif de Daniel : courir 10 km sans s'arrêter
// d'ici fin juin 2027 (fin de l'année à l'IUT), tout en continuant la muscu.
//   A muscu complète (salle, 45 min) · B endurance, la course qui allonge (salle / dehors)
//   C fractionné, la course qui rend plus rapide (salle / dehors) · D renfo du coureur (maison)
// Chaque séance a ses niveaux ; ceux de B sont les étapes vers les 10 km.
// En salle — Basic-Fit Saint-Herblain Atlantis (ouvert tous les jours 6h00–22h30) :
//   A haut du corps, B bas du corps + abdos, C cardio (course + marche sur tapis).
// À la maison — D, élastiques et poids du corps : épaules, posture, fessiers, gainage.
// Daniel choisit lui-même le niveau de chaque séance dans l'onglet Muscu (« trop facile →
// niveau suivant »). Les exercices gardent le même id d'un niveau à l'autre quand ils
// reviennent, pour garder l'historique des charges.

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
    duree?: number // minutes de séance, si différent du réglage (courses)
}

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

// ---------- Exercices : courses (séances B et C) ----------
// Point de départ : la formule habituelle de Daniel, 3 × (5 min de marche à 5 km/h + 5 min de
// course lente à 8-10 km/h). B allonge la course jusqu'aux 10 km, C apprend à courir plus vite.

const MUSCLES_COURSE: Muscle[] = ['cardio', 'quadriceps', 'mollets', 'fessiers']
const OU_COURIR = 'Tapis (pente 1 %) ou dehors'
function endurance(nom: string, nb: number, reps: string, consignes: string[]): Exercice {
    return ex('e-endurance', nom, OU_COURIR, 'cardio', MUSCLES_COURSE, nb, reps, [
        ...consignes,
        'Allure facile : tu dois pouvoir parler par phrases (effort 5-6/10)',
        'Note la distance totale à la fin (compteur du tapis ou montre)',
    ], { mesure: 'km', alternative: 'Vélo à la même durée si une douleur apparaît aux genoux ou aux tibias' })
}
function fractionne(nom: string, nb: number, reps: string, consignes: string[]): Exercice {
    return ex('f-fractionne', nom, OU_COURIR, 'cardio', MUSCLES_COURSE, nb, reps, [
        ...consignes,
        'Coche un rond à chaque répétition terminée',
    ], { mesure: 'km', alternative: 'Vélo : mêmes durées, en jouant sur la résistance' })
}
function marche(id: string, minutes: number, pente: string, vitesse: string): Exercice {
    return ex(id, 'Marche inclinée', 'Tapis de course', 'cardio', ['cardio', 'fessiers', 'mollets'], 1, `${minutes} min, pente ${pente}, ${vitesse}`, [
        'Ne te tiens pas aux barres',
        'Tu dois pouvoir parler (effort 6/10)',
    ])
}
const ECHAUFFEMENT_COURSE = ['5 min de marche, de 5 à 6,5 km/h', 'Montées de genoux et talons-fesses sur place (1 min)']
const RETOUR_COURSE = ['5 min de marche lente (4,5-5 km/h)', 'Étirements mollets, cuisses, fessiers (30 s chacun)']

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

const COULEURS = {
    A: { degrade: ['#0b2a6b', '#1e5bd8'] as [string, string], couleur: '#4d9fff' },
    B: { degrade: ['#063b26', '#0f9a5c'] as [string, string], couleur: '#00c46a' },
    C: { degrade: ['#4a0d05', '#d9481e'] as [string, string], couleur: '#ff5a36' },
    D: { degrade: ['#2b0a45', '#8b2fd6'] as [string, string], couleur: '#cc44ff' },
}

export const OBJECTIF_KM = 10
export const OBJECTIF_DATE = '2027-06-30'

export const PROGRAMME: SeanceBase[] = [
    {
        code: 'A',
        lieu: 'salle',
        emoji: '💪',
        ...COULEURS.A,
        titre: 'Muscu complète',
        court: 'Muscu complète (haut du corps + jambes)',
        focus: 'Tout le corps en une séance : pectoraux, dos, épaules, bras et jambes. Des jambes fortes = moins de blessures en course.',
        niveaux: [
            {
                nom: 'Machines guidées',
                resume: 'Les grands mouvements sur machines : la technique d’abord, sans risque.',
                echauffement: ['5 min de rameur (effort 4/10)', 'Rotations d’épaules et de hanches, 10 squats à vide'],
                blocs: [
                    bloc('Jambes + dos', 3, 75, [B.legPress, A.latPulldown]),
                    bloc('Pecs + ischios', 3, 75, [A.chestPress, B.legCurl]),
                    bloc('Épaules + dos', 3, 60, [A.shoulderPress, A.seatedRow]),
                    bloc('Bras', 2, 45, [A.curlPoulie, A.tricepsCorde]),
                ],
                retourAuCalme: ['3 min d’étirements : pectoraux, dos, cuisses'],
                progression: 'Toutes les séries réussies en haut de la fourchette ? +2,5 kg (presse : +5 kg) la prochaine fois.',
                monter: 'Niveau 2 quand tout te semble facile 2 séances de suite (souvent après 4 à 6 semaines).',
            },
            {
                nom: 'Poids libres',
                resume: 'Haltères et squat goblet : chaque côté se stabilise seul, plus de muscles travaillent.',
                echauffement: ['5 min de rameur (effort 4/10)', 'Rotations d’épaules et de hanches, 10 squats à vide, 10 pompes'],
                blocs: [
                    bloc('Squat goblet', 4, 90, [avec(B.gobletSquat, 4, '8–10')]),
                    bloc('Pousser + tirer', 3, 75, [A.dcHalteres, A.rowingHaltere]),
                    bloc('Ischios + dos', 3, 75, [B.sdtHalteres, A.tirageSerre]),
                    bloc('Épaules', 3, 60, [A.militaireHalteres, A.facePull]),
                    bloc('Bras', 2, 45, [A.curlIncline, A.tricepsNuque]),
                ],
                retourAuCalme: ['3 min d’étirements : pectoraux, dos, cuisses'],
                progression: 'Haltères : paire suivante quand tu fais le haut de la fourchette sur toutes les séries.',
                monter: 'Niveau 3 quand la technique est propre partout et que tout est facile 2 séances de suite.',
            },
            {
                nom: 'Barre et force',
                resume: 'Squat, développé couché, tractions : moins de répétitions, plus lourd.',
                echauffement: [
                    '5 min de rameur (effort 4/10)',
                    'Rotations, 10 squats à vide, 10 pompes',
                    'Montée au squat : 10 reps barre seule, puis 5 reps à 60 % de ta charge',
                ],
                blocs: [
                    bloc('Squat barre', 4, 120, [B.squatBarre]),
                    bloc('Développé couché', 4, 120, [A.dcBarre]),
                    bloc('Tirer + ischios', 3, 90, [A.tractionsAssistees, avec(B.sdtBarre, 3, '8')]),
                    bloc('Incliné + rowing', 3, 75, [A.inclineHalteres, A.rowingBarre]),
                    bloc('Épaules + dips', 2, 60, [A.elevLatPoulie, A.dips]),
                ],
                retourAuCalme: ['3 min d’étirements : pectoraux, dos, cuisses'],
                progression: 'Barre : +2,5 kg dès que les séries sont faites en haut de la fourchette. Tractions : −2,5 kg d’assistance.',
                monter: 'Dernier niveau : continue d’ajouter du poids petit à petit.',
            },
        ],
    },
    {
        code: 'B',
        lieu: 'salle',
        emoji: '🏃',
        ...COULEURS.B,
        titre: 'Endurance · vers 10 km',
        court: 'Endurance : la course qui s’allonge vers les 10 km',
        focus: 'La séance la plus importante pour l’objectif : allure facile, et un peu plus long à chaque étape.',
        niveaux: [
            {
                nom: 'Ta formule',
                resume: 'Ta séance habituelle, avec un peu plus de course : 25 min de course au total.',
                duree: 45,
                echauffement: ECHAUFFEMENT_COURSE,
                blocs: [bloc('Course + marche', 1, 0, [endurance('5 × (5 min course + 2 min marche)', 5, '5 min à 8–8,5 km/h, puis 2 min de marche à 5,5 km/h', [])])],
                retourAuCalme: RETOUR_COURSE,
                progression: 'Garde la même vitesse : c’est la durée qui compte, pas la vitesse.',
                monter: 'Étape 2 quand les 5 blocs passent sans être essoufflé.',
            },
            {
                nom: '8 min',
                resume: 'Blocs de course de 8 minutes : 32 min de course.',
                duree: 50,
                echauffement: ECHAUFFEMENT_COURSE,
                blocs: [bloc('Course + marche', 1, 0, [endurance('4 × (8 min course + 2 min marche)', 4, '8 min à 8–8,5 km/h, puis 2 min de marche', [])])],
                retourAuCalme: RETOUR_COURSE,
                progression: 'Même vitesse qu’à l’étape 1. Si c’est dur, ralentis plutôt que de marcher.',
                monter: 'Étape 3 quand les 4 blocs passent bien.',
            },
            {
                nom: '12 min',
                resume: 'Blocs de 12 minutes : tu cours 36 min, avec seulement 2 pauses.',
                duree: 52,
                echauffement: ECHAUFFEMENT_COURSE,
                blocs: [bloc('Course + marche', 1, 0, [endurance('3 × (12 min course + 2 min marche)', 3, '12 min à 8–8,5 km/h, puis 2 min de marche', [])])],
                retourAuCalme: RETOUR_COURSE,
                progression: 'Respire calmement : inspire sur 2-3 foulées, expire sur 2-3 foulées.',
                monter: 'Étape 4 quand les 3 blocs passent bien.',
            },
            {
                nom: '2 × 20 min',
                resume: '2 blocs de 20 minutes : 40 min de course, une seule pause.',
                duree: 55,
                echauffement: ECHAUFFEMENT_COURSE,
                blocs: [bloc('Course + marche', 1, 0, [endurance('2 × (20 min course + 3 min marche)', 4, '4 × 10 min : 20 min à 8–8,5 km/h, 3 min de marche, puis 20 min', ['Coche un rond toutes les 10 minutes'])])],
                retourAuCalme: RETOUR_COURSE,
                progression: 'Si le 2e bloc est trop dur, coupe-le en 2 × 10 min.',
                monter: 'Étape 5 quand les 2 × 20 min passent.',
            },
            {
                nom: '5 km',
                resume: '🎯 1er grand palier : 35 min sans marcher, environ 5 km.',
                duree: 50,
                echauffement: ECHAUFFEMENT_COURSE,
                blocs: [bloc('Course continue', 1, 0, [endurance('35 min sans t’arrêter', 7, '7 × 5 min à 8–8,5 km/h, sans marcher', ['Coche un rond toutes les 5 minutes'])])],
                retourAuCalme: RETOUR_COURSE,
                progression: 'Réussi une fois ? Refais-le 2 fois avant de monter, pour que ça devienne facile.',
                monter: 'Étape 6 quand tu cours 35 min 2 fois de suite sans souffrir.',
            },
            {
                nom: '45 min',
                resume: '45 min de course continue : environ 6,5 km.',
                duree: 60,
                echauffement: ECHAUFFEMENT_COURSE,
                blocs: [bloc('Course continue', 1, 0, [endurance('45 min sans t’arrêter', 9, '9 × 5 min à 8–8,5 km/h', ['Bois quelques gorgées à mi-séance si besoin', 'Coche un rond toutes les 5 minutes'])])],
                retourAuCalme: RETOUR_COURSE,
                progression: 'L’allure doit rester facile : si tu ne peux plus parler, ralentis de 0,5 km/h.',
                monter: 'Étape 7 quand les 45 min passent 2 fois.',
            },
            {
                nom: '55 min',
                resume: '55 min continues : environ 7,5 km. Tu y es presque.',
                duree: 70,
                echauffement: ECHAUFFEMENT_COURSE,
                blocs: [bloc('Course continue', 1, 0, [endurance('55 min sans t’arrêter', 11, '11 × 5 min à 8–8,5 km/h', ['Prends une bouteille d’eau', 'Coche un rond toutes les 5 minutes'])])],
                retourAuCalme: RETOUR_COURSE,
                progression: 'Pense à manger des glucides (riz, pâtes, pain) la veille et 2 h avant.',
                monter: 'Étape 8 quand les 55 min passent 2 fois.',
            },
            {
                nom: '65 min',
                resume: '65 min continues : environ 9 km.',
                duree: 80,
                echauffement: ECHAUFFEMENT_COURSE,
                blocs: [bloc('Course continue', 1, 0, [endurance('65 min sans t’arrêter', 13, '13 × 5 min à 8–8,5 km/h', ['Bouteille d’eau, et une banane 1 h avant', 'Coche un rond toutes les 5 minutes'])])],
                retourAuCalme: RETOUR_COURSE,
                progression: 'Garde 1 séance plus courte (étape 6) dans la semaine si tu es fatigué.',
                monter: 'Étape 9 quand les 65 min passent bien.',
            },
            {
                nom: '10 km 🏅',
                resume: '🏅 L’objectif : 10 km sans t’arrêter, à ton allure (environ 1h10-1h15).',
                duree: 90,
                echauffement: ECHAUFFEMENT_COURSE,
                blocs: [bloc('10 km', 1, 0, [endurance('10 km sans t’arrêter', 10, '10 × 1 km à ton allure facile', ['Coche un rond à chaque kilomètre', 'Pars lentement : les 2 premiers km doivent être faciles'])])],
                retourAuCalme: RETOUR_COURSE,
                progression: 'Objectif atteint ? Bonus : passer sous 1h10, puis sous 1h, grâce aux séances C.',
                monter: 'Tu as réussi le programme. Prochain défi possible : un 10 km officiel !',
            },
        ],
    },
    {
        code: 'C',
        lieu: 'salle',
        emoji: '⚡',
        ...COULEURS.C,
        titre: 'Fractionné',
        court: 'Fractionné : courir plus vite, plus facilement',
        focus: 'Améliore ton souffle (VMA) : à la même vitesse, la course devient plus facile. C’est ce qui rendra les 10 km agréables.',
        niveaux: [
            {
                nom: 'Accélérations',
                resume: '1 min un peu plus vite, 2 min de marche : on apprend à monter dans les tours.',
                duree: 45,
                echauffement: [...ECHAUFFEMENT_COURSE, '5 min de course très facile à 7,5–8 km/h'],
                blocs: [
                    bloc('Fractionné', 1, 0, [fractionne('8 × (1 min vite + 2 min marche)', 8, '1 min à 9,5–10 km/h, puis 2 min de marche à 5,5 km/h', ['Vite = effort 7-8/10, tu peux dire quelques mots'])]),
                    bloc('Finition en côte', 1, 0, [marche('c-marche-inclinee', 6, '10 %', '5 km/h')]),
                ],
                retourAuCalme: RETOUR_COURSE,
                progression: '+0,5 km/h sur les minutes vites quand les 8 passent bien.',
                monter: 'Niveau 2 quand les 8 minutes vites passent à 10 km/h.',
            },
            {
                nom: '1 min 30',
                resume: 'Des passages plus longs, et la récup se fait en trottinant.',
                duree: 45,
                echauffement: [...ECHAUFFEMENT_COURSE, '5 min de course très facile à 7,5–8 km/h'],
                blocs: [
                    bloc('Fractionné', 1, 0, [fractionne('8 × (1 min 30 vite + 1 min 30 trot)', 8, '1 min 30 à 10–10,5 km/h, puis 1 min 30 à 7 km/h', ['Trot = course très lente, si c’est trop dur marche 30 s puis repars'])]),
                    bloc('Finition en côte', 1, 0, [marche('c-marche-2', 5, '10 %', '5 km/h')]),
                ],
                retourAuCalme: RETOUR_COURSE,
                progression: 'Garde la vitesse jusqu’à la 8e répétition avant de l’augmenter.',
                monter: 'Niveau 3 quand la récup se fait en trottinant du début à la fin.',
            },
            {
                nom: '3 min',
                resume: '3 minutes rapides : le cœur apprend à tenir un effort fort.',
                duree: 45,
                echauffement: [...ECHAUFFEMENT_COURSE, '6 min de course facile à 8 km/h'],
                blocs: [bloc('Fractionné', 1, 0, [fractionne('6 × (3 min vite + 2 min trot)', 6, '3 min à 10–10,5 km/h, puis 2 min à 7 km/h', ['Régularité : la 6e doit être aussi rapide que la 1re'])])],
                retourAuCalme: RETOUR_COURSE,
                progression: '+0,5 km/h quand les 6 répétitions restent régulières.',
                monter: 'Niveau 4 quand les 6 × 3 min passent à 10,5 km/h.',
            },
            {
                nom: 'Allure 10 km',
                resume: 'Des blocs de 5 min à l’allure visée pour tes 10 km « bonus » (1h à 1h10).',
                duree: 50,
                echauffement: [...ECHAUFFEMENT_COURSE, '8 min de course facile à 8 km/h'],
                blocs: [bloc('Allure 10 km', 1, 0, [fractionne('4 × (5 min allure 10 km + 2 min trot)', 4, '5 min à 9,5–10 km/h, puis 2 min à 7,5 km/h', ['Allure 10 km = soutenue mais tenable longtemps (effort 7/10)'])])],
                retourAuCalme: RETOUR_COURSE,
                progression: 'Tiens l’allure régulière : tu apprends le rythme de ton futur 10 km.',
                monter: 'Niveau 5 quand les 4 blocs passent sans ralentir.',
            },
            {
                nom: 'Tempo',
                resume: 'De longs blocs à allure soutenue : 24 min au rythme « course ».',
                duree: 50,
                echauffement: [...ECHAUFFEMENT_COURSE, '8 min de course facile à 8 km/h'],
                blocs: [bloc('Tempo', 1, 0, [fractionne('3 × (8 min tempo + 2 min trot)', 3, '8 min à 10 km/h, puis 2 min à 7,5 km/h', ['Effort 7/10 : tu ne parles plus que par mots'])])],
                retourAuCalme: RETOUR_COURSE,
                progression: '+0,5 km/h quand les 3 blocs passent.',
                monter: 'Niveau 6 quand les 3 × 8 min passent à 10 km/h ou plus.',
            },
            {
                nom: 'Allure 1 h',
                resume: '2 × 15 min à 10 km/h : le rythme pour faire 10 km en 1 h (le bonus).',
                duree: 55,
                echauffement: [...ECHAUFFEMENT_COURSE, '8 min de course facile à 8 km/h'],
                blocs: [bloc('Allure 1 h', 1, 0, [fractionne('2 × (15 min à 10 km/h + 3 min trot)', 6, '3 × 5 min à 10 km/h, 3 min trot, puis encore 3 × 5 min', ['Coche un rond toutes les 5 minutes à 10 km/h'])])],
                retourAuCalme: RETOUR_COURSE,
                progression: 'Quand c’est facile : 2 × 20 min, puis 30 min d’affilée à 10 km/h.',
                monter: 'Dernier niveau : si tu tiens 30 min à 10 km/h, le 10 km en 1 h est à ta portée.',
            },
        ],
    },
    {
        code: 'D',
        lieu: 'maison',
        emoji: '🏠',
        ...COULEURS.D,
        titre: 'Renfo du coureur',
        court: 'Renfo du coureur à la maison (jambes, gainage, posture)',
        focus: 'Ce qui protège un coureur : mollets et tendons, fessiers (stabilité du genou), gainage, et la posture du haut du corps.',
        niveaux: [
            {
                nom: 'Bases',
                resume: 'Les fondations du coureur, au poids du corps et aux élastiques.',
                duree: 35,
                echauffement: ['Rotations des chevilles, des hanches et des épaules (1 min)', '20 jumping jacks'],
                blocs: [
                    bloc('Jambes', 3, 45, [D.squat, D.mollets]),
                    bloc('Fessiers', 3, 45, [D.pontFessier, D.pasLateraux]),
                    bloc('Posture', 3, 30, [D.facePull, D.elevLat]),
                    bloc('Gainage', 2, 30, [D.planche, D.gainageLateral, D.superman]),
                ],
                retourAuCalme: ['2 min d’étirements : mollets, fessiers, dos'],
                progression: '+2 reps par série à chaque séance, puis élastique plus dur.',
                monter: 'Niveau 2 quand tout passe facilement (15 reps propres partout).',
            },
            {
                nom: 'Une jambe',
                resume: 'Exercices sur une jambe : comme en course, où tu es toujours sur un seul pied.',
                duree: 35,
                echauffement: ['Rotations des chevilles, des hanches et des épaules (1 min)', '30 jumping jacks, 10 squats'],
                blocs: [
                    bloc('Jambes', 3, 45, [D.bulgare, D.molletsUneJambe]),
                    bloc('Fessiers', 3, 45, [D.pontUneJambe, D.pasLateraux]),
                    bloc('Dos + posture', 3, 30, [D.rowingElastique, D.facePull]),
                    bloc('Gainage', 2, 30, [D.deadBug, avec(D.gainageLateral, 2, '40 s par côté')]),
                ],
                retourAuCalme: ['2 min d’étirements : mollets, fessiers, dos'],
                progression: '+1 ou 2 reps par série à chaque séance.',
                monter: 'Niveau 3 quand tu fais 12 fentes bulgares et 12 mollets par jambe.',
            },
            {
                nom: 'Explosif',
                resume: 'Sauts et charges : des jambes plus réactives, une foulée plus économique.',
                duree: 35,
                echauffement: ['Rotations des chevilles, des hanches et des épaules (1 min)', '30 jumping jacks, 10 squats, 10 fentes'],
                blocs: [
                    bloc('Explosivité', 3, 60, [D.squatSaute]),
                    bloc('Jambes', 3, 45, [avec(D.bulgare, 3, '10 par jambe, sac à dos chargé'), avec(D.molletsUneJambe, 3, '12 par jambe, sac à dos')]),
                    bloc('Fessiers', 3, 45, [avec(D.pontUneJambe, 3, '12, épaules sur le canapé'), D.pasLateraux]),
                    bloc('Posture', 3, 30, [D.ytw, D.rowingElastique]),
                    bloc('Gainage', 3, 30, [D.hollow, avec(D.gainageLateral, 3, '45 s par côté')]),
                ],
                retourAuCalme: ['2 min d’étirements : mollets, fessiers, dos'],
                progression: 'Ajoute du poids dans le sac à dos petit à petit.',
                monter: 'Dernier niveau : continue d’alourdir le sac.',
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
