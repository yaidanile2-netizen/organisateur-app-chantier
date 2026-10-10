// Programme de la semaine : 4 séances de 30 min.
// En salle — Basic-Fit Saint-Herblain Atlantis (ouvert tous les jours 6h00–22h30) :
//   A haut du corps, B bas du corps + abdos, C cardio — machines guidées et poulies,
//   avec une alternative si la machine est prise.
// À la maison — D, avec les élastiques et au poids du corps : les muscles que les
//   séances en salle ne travaillent pas (ou peu), repris du programme élastiques de Daniel.

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

export type CodeSeance = 'A' | 'B' | 'C' | 'D'

export type SeanceProgramme = {
    code: CodeSeance
    lieu: 'salle' | 'maison'
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
        lieu: 'salle',
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
        lieu: 'salle',
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
        lieu: 'salle',
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
    {
        code: 'D',
        lieu: 'maison',
        titre: 'Maison : épaules, posture, fessiers',
        court: 'À la maison (élastiques) : épaules, posture, fessiers, gainage',
        couleur: '#cc44ff',
        focus:
            'Ce que la salle ne travaille pas assez : épaules (côté et arrière), trapèzes, moyen fessier, lombaires, obliques et avant-bras.',
        echauffement: ['Rotations des bras et des épaules (1 min)', '20 jumping jacks et 10 squats à vide'],
        blocs: [
            {
                titre: 'Superset 1 (épaules et posture)',
                info: 'Enchaîne les deux exercices, puis 45 s de repos. 3 tours.',
                exercices: [
                    {
                        id: 'd-elevations-laterales',
                        nom: 'Élévations latérales',
                        machine: 'Élastique sous les pieds',
                        series: 3,
                        reps: '15',
                        consignes: ['Bras presque tendus, monte jusqu’à l’horizontale', 'Ne hausse pas les épaules'],
                        charge: false,
                    },
                    {
                        id: 'd-face-pull',
                        nom: 'Face pull',
                        machine: 'Élastique accroché à hauteur du visage (poignée de porte)',
                        series: 3,
                        reps: '15',
                        consignes: ['Tire vers le front, coudes hauts', 'Serre les omoplates 1 seconde'],
                        charge: false,
                    },
                ],
            },
            {
                titre: 'Superset 2 (trapèzes et pectoraux)',
                info: 'Enchaîne les deux exercices, puis 45 s de repos. 3 tours.',
                exercices: [
                    {
                        id: 'd-haussements',
                        nom: 'Haussements d’épaules',
                        machine: 'Élastique sous les pieds',
                        series: 3,
                        reps: '15',
                        consignes: ['Monte les épaules vers les oreilles, tiens 1 seconde', 'Bras tendus'],
                        charge: false,
                    },
                    {
                        id: 'd-pompes',
                        nom: 'Pompes',
                        machine: 'Poids du corps (sur les genoux si besoin)',
                        series: 3,
                        reps: 'max − 2',
                        consignes: ['Corps gainé, poitrine près du sol', 'Arrête-toi 2 répétitions avant l’échec'],
                        charge: false,
                    },
                ],
            },
            {
                titre: 'Superset 3 (fessiers)',
                info: 'Enchaîne les deux exercices, puis 45 s de repos. 3 tours.',
                exercices: [
                    {
                        id: 'd-pont-fessier',
                        nom: 'Pont fessier',
                        machine: 'Au sol, élastique au-dessus des genoux',
                        series: 3,
                        reps: '15',
                        consignes: ['Pousse dans les talons, serre les fessiers en haut 1 seconde', 'Ne cambre pas'],
                        charge: false,
                    },
                    {
                        id: 'd-abduction',
                        nom: 'Pas latéraux',
                        machine: 'Élastique autour des chevilles ou au-dessus des genoux',
                        series: 3,
                        reps: '12 de chaque côté',
                        consignes: ['Genoux légèrement fléchis, garde l’élastique tendu'],
                        charge: false,
                    },
                ],
            },
            {
                titre: 'Gainage et avant-bras',
                info: '2 tours, 30 s de repos.',
                exercices: [
                    {
                        id: 'd-superman',
                        nom: 'Superman',
                        machine: 'Allongé sur le ventre, au sol',
                        series: 2,
                        reps: '12',
                        consignes: ['Décolle bras et jambes, tiens 2 secondes', 'Regard vers le sol'],
                        charge: false,
                    },
                    {
                        id: 'd-gainage-lateral',
                        nom: 'Gainage latéral',
                        machine: 'Au sol, sur l’avant-bras',
                        series: 2,
                        reps: '30 s par côté',
                        consignes: ['Hanches hautes, corps aligné'],
                        charge: false,
                    },
                    {
                        id: 'd-finger-grip',
                        nom: 'Finger grip',
                        machine: 'Élastique autour des doigts (ou serre une balle)',
                        series: 2,
                        reps: '20 s',
                        consignes: ['Ouvre et ferme la main en continu'],
                        charge: false,
                    },
                ],
            },
        ],
        retourAuCalme: ['2 min d’étirements épaules, fessiers et dos'],
    },
]

export const SEANCES_SALLE = PROGRAMME.filter((s) => s.lieu === 'salle')
export const SEANCE_MAISON = PROGRAMME.find((s) => s.lieu === 'maison') as SeanceProgramme

export function seanceParCode(code: string): SeanceProgramme {
    return PROGRAMME.find((s) => s.code === code) ?? PROGRAMME[0]
}
