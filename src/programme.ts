// Programme de salle — Basic-Fit Saint-Herblain Atlantis (ouvert tous les jours 6h00–22h30).
// 3 séances de 30 min : A haut du corps, B bas du corps + abdos, C cardio.
// Exercices sur machines guidées et poulies (réglables à sa taille, muscles indiqués
// sur chaque machine), avec une alternative si la machine est prise.

export type Exercice = {
    id: string
    nom: string
    machine: string
    series: number
    reps: string
    repos?: string
    consignes: string[]
    alternative?: string
    charge?: boolean // false pour les exercices sans charge (planche, cardio)
}

export type Bloc = { titre: string; info?: string; exercices: Exercice[] }

export type SeanceProgramme = {
    code: 'A' | 'B' | 'C'
    titre: string
    court: string
    couleur: string
    focus: string
    echauffement: string[]
    blocs: Bloc[]
    retourAuCalme: string[]
}

export const SALLE = {
    nom: 'Basic-Fit Saint-Herblain Atlantis',
    horaires: 'Tous les jours, 6h00–22h30',
}

export const PROGRAMME: SeanceProgramme[] = [
    {
        code: 'A',
        titre: 'Haut du corps',
        court: 'Haut du corps (pecs, dos, épaules, bras)',
        couleur: '#4d9fff',
        focus: 'Musculation : pectoraux, dos, épaules, biceps et triceps.',
        echauffement: [
            '4 min de rameur ou de vélo, tranquille (effort 4/10)',
            "Rotations d'épaules et 1 série légère de 15 reps sur la première machine",
        ],
        blocs: [
            {
                titre: 'Superset 1',
                info: 'Enchaîne les deux exercices, puis 60 s de repos. 3 tours.',
                exercices: [
                    {
                        id: 'a-chest-press',
                        nom: 'Développé assis',
                        machine: 'Chest press (machine pectoraux)',
                        series: 3,
                        reps: '10–12',
                        consignes: [
                            'Poignées à hauteur du milieu de la poitrine',
                            'Dos collé au dossier, pousse sans verrouiller les coudes',
                        ],
                        alternative: 'Développé couché aux haltères sur banc',
                    },
                    {
                        id: 'a-lat-pulldown',
                        nom: 'Tirage vertical',
                        machine: 'Lat pulldown (poulie haute, barre large)',
                        series: 3,
                        reps: '10–12',
                        consignes: [
                            'Tire la barre vers le haut de la poitrine, pas derrière la nuque',
                            'Serre les omoplates en bas, remonte lentement',
                        ],
                        alternative: 'Tractions assistées si la machine existe',
                    },
                ],
            },
            {
                titre: 'Superset 2',
                info: 'Enchaîne les deux exercices, puis 60 s de repos. 3 tours.',
                exercices: [
                    {
                        id: 'a-shoulder-press',
                        nom: 'Développé épaules',
                        machine: 'Shoulder press (machine épaules)',
                        series: 3,
                        reps: '10–12',
                        consignes: ['Poignées à hauteur des épaules au départ', 'Ne cambre pas le bas du dos'],
                        alternative: 'Développé haltères assis, dossier relevé',
                    },
                    {
                        id: 'a-seated-row',
                        nom: 'Tirage horizontal',
                        machine: 'Seated row (rowing assis, machine ou poulie basse)',
                        series: 3,
                        reps: '10–12',
                        consignes: ['Poitrine sortie, tire les coudes vers l’arrière', 'Pas d’élan avec le buste'],
                        alternative: 'Rowing un bras à l’haltère',
                    },
                ],
            },
            {
                titre: 'Superset 3 (bras)',
                info: 'Enchaîne les deux exercices, puis 45 s de repos. 2 à 3 tours.',
                exercices: [
                    {
                        id: 'a-curl-poulie',
                        nom: 'Curl biceps',
                        machine: 'Poulie basse avec barre droite',
                        series: 3,
                        reps: '12–15',
                        consignes: ['Coudes fixes le long du corps', 'Descente lente sur 2 secondes'],
                        alternative: 'Curl haltères debout',
                    },
                    {
                        id: 'a-triceps-corde',
                        nom: 'Extension triceps',
                        machine: 'Poulie haute avec corde',
                        series: 3,
                        reps: '12–15',
                        consignes: ['Coudes collés au corps', 'Écarte la corde en bas du mouvement'],
                        alternative: 'Dips assistés ou extension haltère au-dessus de la tête',
                    },
                ],
            },
        ],
        retourAuCalme: ['2 min d’étirements pectoraux, dos et épaules'],
    },
    {
        code: 'B',
        titre: 'Bas du corps + abdos',
        court: 'Bas du corps et abdos',
        couleur: '#00c46a',
        focus: 'Musculation : cuisses, fessiers, ischios, mollets et gainage.',
        echauffement: ['4 min de vélo (effort 4/10)', '10 squats à vide et 10 fentes alternées'],
        blocs: [
            {
                titre: 'Superset 1',
                info: 'Enchaîne les deux exercices, puis 60 s de repos. 3 tours.',
                exercices: [
                    {
                        id: 'b-leg-press',
                        nom: 'Presse à cuisses',
                        machine: 'Leg press',
                        series: 3,
                        reps: '10–12',
                        consignes: [
                            'Pieds largeur d’épaules au milieu du plateau',
                            'Bas du dos collé au siège, ne verrouille pas les genoux',
                        ],
                        alternative: 'Squat goblet avec un haltère',
                    },
                    {
                        id: 'b-leg-curl',
                        nom: 'Leg curl',
                        machine: 'Leg curl (ischios, assis ou allongé)',
                        series: 3,
                        reps: '10–12',
                        consignes: ['Genou aligné avec l’axe de la machine', 'Remonte lentement'],
                        alternative: 'Soulevé de terre jambes tendues léger aux haltères',
                    },
                ],
            },
            {
                titre: 'Superset 2',
                info: 'Enchaîne les deux exercices, puis 60 s de repos. 3 tours.',
                exercices: [
                    {
                        id: 'b-leg-extension',
                        nom: 'Leg extension',
                        machine: 'Leg extension (quadriceps)',
                        series: 3,
                        reps: '12',
                        consignes: ['Marque 1 seconde jambes tendues en haut', 'Descente contrôlée'],
                        alternative: 'Fentes avant aux haltères',
                    },
                    {
                        id: 'b-mollets',
                        nom: 'Mollets',
                        machine: 'Presse à cuisses, pointes de pieds en bas du plateau',
                        series: 3,
                        reps: '15',
                        consignes: ['Amplitude complète, montée et descente lentes'],
                        alternative: 'Mollets debout sur une marche avec un haltère',
                    },
                ],
            },
            {
                titre: 'Gainage',
                info: 'Enchaîne les deux exercices, puis 45 s de repos. 2 à 3 tours.',
                exercices: [
                    {
                        id: 'b-crunch',
                        nom: 'Crunch',
                        machine: 'Machine abdominaux (ou poulie haute avec corde, à genoux)',
                        series: 3,
                        reps: '12–15',
                        consignes: ['Enroule le dos, souffle en contractant', 'Pas de traction avec les bras'],
                        alternative: 'Crunch au sol sur tapis',
                    },
                    {
                        id: 'b-planche',
                        nom: 'Planche',
                        machine: 'Tapis, zone d’étirement',
                        series: 3,
                        reps: '30–45 s',
                        consignes: ['Corps aligné, fesses serrées, ne creuse pas le dos'],
                        charge: false,
                    },
                ],
            },
        ],
        retourAuCalme: ['2 min d’étirements cuisses, fessiers et mollets'],
    },
    {
        code: 'C',
        titre: 'Cardio',
        court: 'Cardio (fractionné + marche inclinée)',
        couleur: '#ff5a36',
        focus: 'Cardio, endurance et réduction du taux de gras.',
        echauffement: ['5 min de vélo ou de tapis en augmentant progressivement (effort 3 → 5/10)'],
        blocs: [
            {
                titre: 'Fractionné',
                info: 'Vélo, rameur ou elliptique (zone cardio Matrix).',
                exercices: [
                    {
                        id: 'c-fractionne',
                        nom: '8 × (1 min rapide + 1 min lent)',
                        machine: 'Vélo, rameur ou elliptique',
                        series: 8,
                        reps: '1 min à 8/10 puis 1 min à 3/10',
                        consignes: [
                            'Rapide = tu ne peux plus parler, mais tu tiens la minute',
                            'Lent = tu récupères en continuant de pédaler',
                        ],
                        charge: false,
                    },
                ],
            },
            {
                titre: 'Endurance',
                exercices: [
                    {
                        id: 'c-marche-inclinee',
                        nom: 'Marche inclinée',
                        machine: 'Tapis de course',
                        series: 1,
                        reps: '6 min, pente 8–10 %, 5 km/h',
                        consignes: ['Ne te tiens pas aux barres', 'Tu dois pouvoir parler (effort 6/10)'],
                        charge: false,
                    },
                ],
            },
        ],
        retourAuCalme: ['2 min de marche lente', '1 à 2 min d’étirements'],
    },
]

export function seanceParCode(code: string): SeanceProgramme {
    return PROGRAMME.find((s) => s.code === code) ?? PROGRAMME[0]
}
