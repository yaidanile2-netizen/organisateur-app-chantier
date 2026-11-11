import MontreMuscu from './MontreMuscu'
import ExoIllustration from './ExoIllustration'
import { aUneIllustration, legendeDe } from './illustrations'
import { BoutonRepli } from './Repliable'
import { useRepli } from './repli'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import './muscu.css'
import { envoyerMuscu, getCoursEntre, getTachesEntre, modifierTache, type EtatMuscu, type ExoFait, type Ressenti, type SeanceFaite, type Tache } from './api'
import ProfilMuscu from './ProfilMuscu'
import ProgressionMuscu from './ProgressionMuscu'
import { enregistrerProfil, lireProfil, recommandation, type Profil } from './profil'
import {
    RESSENTIS,
    avecCharge,
    avisNiveau,
    cleDefi,
    cleNiveau,
    defisDepuis,
    ecrireDefis,
    lireDefis,
    seancesAuNiveau,
    type DefisReussis,
    niveauxDepuis,
    conseilPour,
    ecrireCache,
    fmtKg,
    lireCache,
    mettreEnAttente,
    passesDe,
    synchroniser,
    versKg,
    cleFigure,
    exercicePerso,
    idPerso,
    retenirPerso,
    uniteCourte,
    uniteDe,
    type MesurePerso,
} from './suiviMuscu'
import BodyMap from './BodyMap'
import {
    MATERIEL,
    MUSCLES,
    OBJECTIF_DATE,
    OBJECTIF_KM,
    FIGURES,
    PROGRAMME,
    TOUS_LES_EXERCICES,
    dureeDe,
    SALLE,
    ecrireNiveaux,
    lireNiveaux,
    seanceParCode,
    type NiveauxChoisis,
    type Bloc,
    type CodeSeance,
    type Exercice,
    type FigureId,
    type Muscle,
} from './programme'
import {
    MARQUEUR,
    codeDeTache,
    creneauManuel,
    creneauxPourDeplacer,
    debutDeSemaine,
    descriptionSeance,
    lireReglages,
    type Creneau,
} from './sport'

const VERSION_PROGRAMME = { cle: 'programme-v', valeur: 2 }

/** Pas des boutons − / + pour ce qu'on note. */
const pasDe = (e: Exercice) => (e.mesure === 'km' ? 0.5 : e.mesure === 'reps' ? 1 : e.mesure === 'sec' ? 5 : 2.5)

const enTexte = (c: Record<string, number>) => Object.fromEntries(Object.entries(c).map(([k, v]) => [k, String(v)]))

// Séries cochées de la séance en cours : gardées sur l'appareil.
function lire<T>(cle: string, defaut: T): T {
    try {
        const brut = localStorage.getItem(cle)
        return brut ? (JSON.parse(brut) as T) : defaut
    } catch {
        return defaut
    }
}
function ecrire(cle: string, valeur: unknown): void {
    try {
        localStorage.setItem(cle, JSON.stringify(valeur))
    } catch {
        // stockage indisponible
    }
}

const JOURS_COURTS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const jourLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })
const jourCourt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric' })
const hm = (d: Date) => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

function memeJour(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function dansCombien(d: Date): string {
    const auj = new Date()
    auj.setHours(0, 0, 0, 0)
    const j = new Date(d)
    j.setHours(0, 0, 0, 0)
    const n = Math.round((j.getTime() - auj.getTime()) / 86400000)
    if (n <= 0) return "aujourd'hui"
    if (n === 1) return 'demain'
    return `dans ${n} jours`
}

// Heures de séance (pas de trajet) à partir de la tâche.
function horaireSeance(t: Tache): { debut: Date; fin: Date } {
    const code = codeDeTache(t)
    const s = seanceParCode(code ?? 'A')
    const r = lireReglages()
    const depart = new Date(t.date_debut || Date.now())
    const trajet = s.lieu === 'salle' ? r.trajetSalle : 0
    const debut = new Date(depart.getTime() + trajet * 60000)
    return { debut, fin: new Date(debut.getTime() + dureeDe(s, r.duree) * 60000) }
}

function musclesDe(exos: Exercice[]): Muscle[] {
    return [...new Set(exos.flatMap((e) => e.muscles))]
}

const sansAccents = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

/** Les exercices du catalogue, une seule fois par nom (pour l'ajout d'un exercice en plus). */
const CATALOGUE = (() => {
    const vus = new Set<string>()
    return TOUS_LES_EXERCICES.filter((e) => e.series > 0 && !e.id.endsWith('-emom') && !vus.has(sansAccents(e.nom)) && vus.add(sansAccents(e.nom)))
})()

const BLOC_EXTRA: Bloc = { titre: 'En plus', tours: 1, repos: 0, exercices: [] }

const MESURES_PERSO: { v: MesurePerso; libelle: string }[] = [
    { v: 'reps', libelle: 'Reps' },
    { v: 'kg', libelle: 'Kg' },
    { v: 'sec', libelle: 'Secondes' },
    { v: 'km', libelle: 'Km' },
    { v: 'aucune', libelle: 'Rien' },
]

type Ajout = { texte: string; choisi: Exercice | null; series: number; mesure: MesurePerso; erreur: string | null }

/** Le défi de séance qui correspond à une étape de figure (s'il y en a un). */
function lienFigure(id: FigureId, etape: number): { code: CodeSeance; niveau: number } | null {
    for (const s of PROGRAMME)
        for (const [i, nv] of s.niveaux.entries()) if (nv.defi?.figure?.id === id && nv.defi.figure.etape === etape) return { code: s.code, niveau: i + 1 }
    return null
}

type Deplacement = {
    tache: Tache
    chargement: boolean
    options: { jour: Date; creneau: Creneau | null }[]
    date: string
    heure: string
    erreur: string | null
}

export default function MuscuView() {
    const [decalage, setDecalage] = useState(0)
    const [taches, setTaches] = useState<Tache[]>([])
    const [chargement, setChargement] = useState(true)
    const [code, setCode] = useState<CodeSeance>('A')
    const [semaineOuverte, basculerSemaine] = useRepli('muscu.semaine')
    const [detailOuvert, basculerDetail] = useRepli('muscu.seance')
    const [deplacement, setDeplacement] = useState<Deplacement | null>(null)
    const [suivi, setSuivi] = useState<EtatMuscu>(() => lireCache())
    const [synchro, setSynchro] = useState<'chargement' | 'ok' | 'hors-ligne'>('chargement')
    const [charges, setCharges] = useState<Record<string, string>>(() => enTexte(lireCache().charges))
    const [series, setSeries] = useState<Record<string, boolean[]>>(() => lire('muscu.series', {}))
    const [bilan, setBilan] = useState<ExoFait[] | null>(null)
    const [profil, setProfil] = useState<Profil>(() => lireProfil())
    const minuteurs = useRef<Record<string, number>>({})
    const [conseils, setConseils] = useState<string | null>(null)
    const [zoom, setZoom] = useState<string | null>(null)
    const [repos, setRepos] = useState<{ restant: number; total: number } | null>(null)
    const [message, setMessage] = useState<string | null>(null)
    const [niveaux, setNiveaux] = useState<NiveauxChoisis>(() => lireNiveaux())
    const [defis, setDefis] = useState<DefisReussis>(() => lireDefis())
    const [extras, setExtras] = useState<Partial<Record<CodeSeance, Exercice[]>>>(() => lire('muscu.extras', {}))
    const [ajout, setAjout] = useState<Ajout | null>(null)
    const [figureOuverte, setFigureOuverte] = useState<FigureId | null>(null)

    const lundi = useMemo(() => {
        const l = debutDeSemaine(new Date())
        l.setDate(l.getDate() + 7 * decalage)
        return l
    }, [decalage])
    const dimanche = useMemo(() => {
        const d = new Date(lundi)
        d.setDate(d.getDate() + 6)
        d.setHours(23, 59, 59, 999)
        return d
    }, [lundi])

    async function chargerSemaine(choisirProchaine = false) {
        setChargement(true)
        try {
            const t = (await getTachesEntre(lundi, dimanche))
                .filter((x) => x.description?.includes(MARQUEUR) && x.statut !== 'annule')
                .sort((a, b) => (a.date_debut || '').localeCompare(b.date_debut || ''))
            setTaches(t)
            if (choisirProchaine) {
                const prochaine = t.find((x) => x.statut !== 'fait' && new Date(x.date_fin || x.date_debut || 0) >= new Date())
                const c = prochaine && codeDeTache(prochaine)
                if (c) setCode(c)
            }
        } catch {
            setTaches([])
        } finally {
            setChargement(false)
        }
    }

    useEffect(() => {
        synchroniser()
            .then((recu) => {
                let etat = recu
                setSuivi(etat)
                setCharges(enTexte(etat.charges))
                let n = niveauxDepuis(etat.charges, lireNiveaux())
                // Passage à la callisthénie (nov. 2026) : A, B et D repartent du niveau 1, une seule fois pour tous les appareils.
                if ((etat.charges[VERSION_PROGRAMME.cle] ?? 0) < VERSION_PROGRAMME.valeur) {
                    const depuis = new Date().toISOString()
                    n = { ...n, A: { n: 1, depuis }, B: { n: 1, depuis }, D: { n: 1, depuis } }
                    const envoi = { 'niveau-a': 1, 'niveau-b': 1, 'niveau-d': 1, [VERSION_PROGRAMME.cle]: VERSION_PROGRAMME.valeur }
                    etat = { ...etat, charges: { ...etat.charges, ...envoi } }
                    setSuivi(etat)
                    ecrireCache(etat)
                    for (const [id, kg] of Object.entries(envoi)) envoyerMuscu({ action: 'charge', id, kg }).catch(() => mettreEnAttente({ charges: { [id]: kg } }))
                }
                ecrireNiveaux(n)
                setNiveaux(n)
                const d = defisDepuis(etat.charges, lireDefis())
                ecrireDefis(d)
                setDefis(d)
                setSynchro('ok')
            })
            .catch(() => setSynchro('hors-ligne'))
    }, [])

    useEffect(() => {
        chargerSemaine(decalage === 0)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lundi])

    useEffect(() => {
        if (!message) return
        const id = window.setTimeout(() => setMessage(null), 6000)
        return () => window.clearTimeout(id)
    }, [message])

    useEffect(() => {
        if (!repos || repos.restant <= 0) return
        const id = window.setTimeout(() => {
            if (repos.restant === 1 && 'vibrate' in navigator) navigator.vibrate([200, 100, 200])
            setRepos((r) => (r && r.restant > 1 ? { ...r, restant: r.restant - 1 } : null))
        }, 1000)
        return () => window.clearTimeout(id)
    }, [repos])

    const seance = seanceParCode(code, niveaux[code]?.n)
    const prevus = seance.blocs.flatMap((b) => b.exercices)
    const extrasSeance = (extras[code] ?? []).filter((e) => !prevus.some((p) => p.id === e.id))
    const exercices = [...prevus, ...extrasSeance]
    const avis = avisNiveau(code, seance.niveau, seance.nbNiveaux, niveaux[code]?.depuis, suivi.seances, prevus.map((e) => e.id))
    const faitesAuNiveau = seancesAuNiveau(code, niveaux[code]?.depuis, prevus.map((e) => e.id), suivi.seances).length
    const defiReussi = defiFait(code, seance.niveau)
    const total = exercices.reduce((n, e) => n + e.series, 0)
    const faites = exercices.reduce((n, e) => n + (series[e.id] || []).filter(Boolean).length, 0)
    const pourcent = total ? Math.round((faites / total) * 100) : 0
    const prochaine = taches.find((x) => x.statut !== 'fait' && new Date(x.date_fin || x.date_debut || 0) >= new Date())

    function changerCharge(id: string, valeur: string) {
        setCharges((c) => ({ ...c, [id]: valeur }))
        const kg = versKg(valeur)
        const nouvelles = { ...suivi.charges }
        if (kg === null) delete nouvelles[id]
        else nouvelles[id] = kg
        const etat = { ...suivi, charges: nouvelles }
        setSuivi(etat)
        ecrireCache(etat)
        // Envoi groupé : on attend que la valeur arrête de bouger.
        window.clearTimeout(minuteurs.current[id])
        minuteurs.current[id] = window.setTimeout(() => {
            envoyerMuscu({ action: 'charge', id, kg })
                .then(() => setSynchro('ok'))
                .catch(() => {
                    mettreEnAttente({ charges: { [id]: kg } })
                    setSynchro('hors-ligne')
                })
        }, 900)
    }

    /** Enregistre des « charges » spéciales (niveaux, défis) sur l'appareil et en ligne. */
    function majCharges(nouvelles: Record<string, number>) {
        setSuivi((prec) => {
            const etat = { ...prec, charges: { ...prec.charges, ...nouvelles } }
            ecrireCache(etat)
            return etat
        })
        for (const [id, kg] of Object.entries(nouvelles))
            envoyerMuscu({ action: 'charge', id, kg })
                .then(() => setSynchro('ok'))
                .catch(() => {
                    mettreEnAttente({ charges: { [id]: kg } })
                    setSynchro('hors-ligne')
                })
    }

    function changerNiveau(n: number, c: CodeSeance = code) {
        const actuel = seanceParCode(c, niveaux[c]?.n).niveau
        if (n === actuel) return
        setNiveaux((prec) => {
            const nouveaux = { ...prec, [c]: { n, depuis: new Date().toISOString() } }
            ecrireNiveaux(nouveaux)
            return nouveaux
        })
        if (c === code) {
            setConseils(null)
            setZoom(null)
        }
        majCharges({ [cleNiveau(c)]: n })
    }

    /** Défi d'un niveau réussi : par le défi lui-même, ou par l'étape de figure qui lui correspond. */
    function defiFait(c: CodeSeance, niveau: number): string | undefined {
        const s = seanceParCode(c, niveau)
        const f = s.defi?.figure
        return defis[cleDefi(c, niveau)] ?? (f ? defis[cleFigure(f.id, f.etape)] : undefined)
    }

    function etapeFaite(id: FigureId, etape: number): boolean {
        if (defis[cleFigure(id, etape)] !== undefined) return true
        const lien = lienFigure(id, etape)
        return lien !== null && defis[cleDefi(lien.code, lien.niveau)] !== undefined
    }

    function noterReussite(cles: string[]) {
        const date = new Date().toISOString()
        setDefis((prec) => {
            const nouveaux = { ...prec, ...Object.fromEntries(cles.map((k) => [k, date])) }
            ecrireDefis(nouveaux)
            return nouveaux
        })
        majCharges(Object.fromEntries(cles.map((k) => [k, 1])))
    }

    function reussirDefi(c: CodeSeance = code) {
        const s = seanceParCode(c, niveaux[c]?.n)
        const d = s.defi
        if (!d) return
        const dernier = s.niveau >= s.nbNiveaux
        if (!window.confirm(`Tu as réussi le défi « ${d.titre.replace('🏅 ', '')} » ?${dernier ? '' : ` Tu passes au niveau ${s.niveau + 1} de la séance ${c}.`}`)) return
        noterReussite([cleDefi(c, s.niveau), ...(d.figure ? [cleFigure(d.figure.id, d.figure.etape)] : [])])
        if (!dernier) changerNiveau(s.niveau + 1, c)
        setMessage(dernier ? `🏅 Objectif réussi : ${d.titre.replace('🏅 ', '')}. Énorme, bravo !` : `🎉 Défi réussi ! Bienvenue au niveau ${s.niveau + 1} de la séance ${c}.`)
    }

    function validerEtape(id: FigureId, etape: number) {
        const f = FIGURES.find((x) => x.id === id)
        if (!f) return
        // Si l'étape est le défi du niveau actuel d'une séance, on passe aussi au niveau suivant.
        const lien = lienFigure(id, etape)
        if (lien && seanceParCode(lien.code, niveaux[lien.code]?.n).niveau === lien.niveau) return reussirDefi(lien.code)
        const e = f.etapes[etape - 1]
        if (!window.confirm(`Tu as réussi « ${e.titre} » ?`)) return
        noterReussite([cleFigure(id, etape)])
        setMessage(etape === f.etapes.length ? `🏅 ${f.nom} maîtrisé ! Énorme, bravo !` : `🎉 Étape réussie : ${e.titre}.`)
    }

    function ouvrirSeance(c: CodeSeance) {
        setCode(c)
        setConseils(null)
        basculerDetail(true)
        window.setTimeout(() => document.querySelector('.mu-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
    }

    // --- Exercices faits en plus du programme ---

    function ajouterExtra() {
        if (!ajout) return
        let e: Exercice
        if (ajout.choisi) {
            e = { ...ajout.choisi, series: ajout.series }
        } else {
            const nom = ajout.texte.trim()
            if (!nom) return setAjout({ ...ajout, erreur: 'Écris le nom de l’exercice.' })
            const id = idPerso(nom)
            retenirPerso(id, nom, ajout.mesure)
            e = { ...(exercicePerso(id, { nom, mesure: ajout.mesure }) as Exercice), series: ajout.series }
        }
        if (exercices.some((x) => x.id === e.id)) return setAjout({ ...ajout, erreur: 'Cet exercice est déjà dans la séance.' })
        const n = { ...extras, [code]: [...extrasSeance, e] }
        setExtras(n)
        ecrire('muscu.extras', n)
        setAjout(null)
    }

    function retirerExtra(id: string) {
        const n = { ...extras, [code]: extrasSeance.filter((e) => e.id !== id) }
        setExtras(n)
        ecrire('muscu.extras', n)
        const s = { ...series }
        delete s[id]
        setSeries(s)
        ecrire('muscu.series', s)
    }

    function ajusterCharge(id: string, delta: number) {
        const actuelle = parseFloat((charges[id] || '0').replace(',', '.')) || 0
        changerCharge(id, String(Math.max(0, Math.round((actuelle + delta) * 2) / 2)))
    }

    function basculerSerie(bloc: Bloc, e: Exercice, i: number) {
        const actuelles = series[e.id] ? [...series[e.id]] : Array(e.series).fill(false)
        actuelles[i] = !actuelles[i]
        const s = { ...series, [e.id]: actuelles }
        setSeries(s)
        ecrire('muscu.series', s)
        // Tour terminé (tous les exercices du bloc cochés pour cette série) : repos automatique.
        if (actuelles[i] && bloc.repos > 0) {
            const tourFini = bloc.exercices.every((x) => (x.id === e.id ? actuelles : s[x.id] || [])[i])
            if (tourFini) setRepos({ restant: bloc.repos, total: bloc.repos })
        }
    }

    async function marquerFaite(t: Tache) {
        try {
            await modifierTache({ id: t.id, statut: 'fait' })
            await chargerSemaine()
        } catch {
            setMessage("Impossible de mettre à jour l'agenda pour l'instant.")
        }
    }

    function terminer() {
        setBilan(
            exercices.flatMap((e) => {
                const faitesExo = (series[e.id] || []).filter(Boolean).length
                if (faitesExo === 0) return []
                const ressenti: Ressenti = faitesExo >= e.series ? 'bien' : 'dur'
                return [{ id: e.id, faites: faitesExo, total: e.series, kg: uniteDe(e) ? versKg(charges[e.id]) : null, ressenti }]
            })
        )
        setRepos(null)
        window.setTimeout(() => document.querySelector('.mu-bilan')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
    }

    function noter(id: string, ressenti: Ressenti) {
        setBilan((b) => (b ? b.map((e) => (e.id === id ? { ...e, ressenti } : e)) : b))
    }

    async function enregistrerBilan() {
        if (!bilan) return
        const date = new Date().toISOString()
        const exos = bilan
        const locale: SeanceFaite = { id: `local-${Date.now()}`, code, date, exercices: exos }
        const provisoire = { ...suivi, seances: [locale, ...suivi.seances] }
        setSuivi(provisoire)
        ecrireCache(provisoire)
        setBilan(null)
        try {
            const etat = await envoyerMuscu({ action: 'seance', code, date, exercices: exos, charges: {} })
            setSuivi(etat)
            ecrireCache(etat)
            setSynchro('ok')
        } catch {
            mettreEnAttente({ seances: [{ code, date, exercices: exos }] })
            setSynchro('hors-ligne')
        }
        const s = { ...series }
        for (const e of exercices) delete s[e.id]
        setSeries(s)
        ecrire('muscu.series', s)
        const sansExtras = { ...extras, [code]: [] }
        setExtras(sansExtras)
        ecrire('muscu.extras', sansExtras)
        const duJour = taches.find(
            (t) => t.date_debut && memeJour(new Date(t.date_debut), new Date()) && codeDeTache(t) === code && t.statut !== 'fait'
        )
        if (duJour) {
            await marquerFaite(duJour)
            setMessage(`Séance ${code} terminée et cochée dans ton agenda. Bravo 💪`)
        } else {
            setMessage(`Séance ${code} terminée. Bravo 💪`)
        }
    }

    async function supprimerSeance(h: SeanceFaite) {
        if (!window.confirm(`Retirer la séance ${h.code} du ${new Date(h.date).toLocaleDateString('fr-FR')} ?`)) return
        try {
            const etat = await envoyerMuscu({ action: 'supprimer', id: h.id })
            setSuivi(etat)
            ecrireCache(etat)
        } catch {
            setMessage('Impossible de retirer cette séance pour l’instant.')
        }
    }

    async function ouvrirDeplacement(t: Tache) {
        const c = codeDeTache(t) ?? 'A'
        const debut = new Date(t.date_debut || Date.now())
        const pad = (n: number) => String(n).padStart(2, '0')
        const { debut: debutSeance } = horaireSeance(t)
        setDeplacement({
            tache: t,
            chargement: true,
            options: [],
            date: `${debut.getFullYear()}-${pad(debut.getMonth() + 1)}-${pad(debut.getDate())}`,
            heure: `${pad(debutSeance.getHours())}:${pad(debutSeance.getMinutes())}`,
            erreur: null,
        })
        try {
            const [cours, toutes] = await Promise.all([getCoursEntre(lundi, dimanche), getTachesEntre(lundi, dimanche)])
            const autres = toutes.filter((x) => x.id !== t.id)
            const options = creneauxPourDeplacer(seanceParCode(c), lundi, cours, autres, lireReglages())
            setDeplacement((d) => (d && d.tache.id === t.id ? { ...d, chargement: false, options } : d))
        } catch (err) {
            setDeplacement((d) =>
                d ? { ...d, chargement: false, erreur: err instanceof Error ? err.message : 'Erreur de chargement.' } : d
            )
        }
    }

    async function deplacerVers(cr: Creneau) {
        if (!deplacement) return
        try {
            await modifierTache({
                id: deplacement.tache.id,
                date_debut: cr.depart.toISOString(),
                date_fin: cr.retour.toISOString(),
                description: descriptionSeance(cr),
            })
            setDeplacement(null)
            setMessage(`Séance ${cr.seance.code} déplacée au ${jourLong.format(cr.debut)} à ${hm(cr.debut)}.`)
            await chargerSemaine()
        } catch (err) {
            setDeplacement((d) => (d ? { ...d, erreur: err instanceof Error ? err.message : 'Erreur.' } : d))
        }
    }

    function deplacerManuel() {
        if (!deplacement) return
        const c = codeDeTache(deplacement.tache) ?? 'A'
        const debut = new Date(`${deplacement.date}T${deplacement.heure}`)
        if (isNaN(debut.getTime())) return
        deplacerVers(creneauManuel(seanceParCode(c), debut, lireReglages()))
    }

    function carteExo(bloc: Bloc, e: Exercice, extra = false) {
            const faitesExo = series[e.id] || []
            const ouvert = conseils === e.id
            const passes = passesDe(e.id, suivi.seances)
            const dernier = passes[0]
            const conseil = conseilPour(e, passes, versKg(charges[e.id]))
            const reco = recommandation(e, profil, new Date())
            return (
                <div key={e.id} className={`mu-exo${extra ? ' mu-exo-extra' : ''}`}>
                    <div className="mu-exo-haut">
                        {aUneIllustration(e.id) ? (
                            <button
                                className={`mu-exo-ill${zoom === e.id ? ' actif' : ''}`}
                                onClick={() => setZoom(zoom === e.id ? null : e.id)}
                                aria-label={`Voir l’exercice ${e.nom} en grand`}
                                aria-expanded={zoom === e.id}
                            >
                                <ExoIllustration id={e.id} titre={`${e.nom} : ${legendeDe(e.id)}`} />
                            </button>
                        ) : (
                            <span className="mu-exo-icone" title={MATERIEL[e.materiel].libelle}>
                                {MATERIEL[e.materiel].emoji}
                            </span>
                        )}
                        <div className="mu-exo-nom">
                            <b>{e.nom.toUpperCase()}</b>
                            <span>{e.machine}</span>
                            <span className="mu-cible">
                                {e.reps ? `${e.series > 1 ? `${e.series} × ` : ''}${e.reps}` : `${e.series} série${e.series > 1 ? 's' : ''}`}
                            </span>
                        </div>
                        {extra && (
                            <button className="mu-exo-retirer" onClick={() => retirerExtra(e.id)} aria-label={`Retirer ${e.nom} de la séance`}>
                                ×
                            </button>
                        )}
                    </div>
                    {zoom === e.id && (
                        <figure className="mu-exo-zoom">
                            <ExoIllustration id={e.id} grand titre={`${e.nom} : ${legendeDe(e.id)}`} />
                            <figcaption>
                                <b>{legendeDe(e.id)}</b>
                                <span>
                                    {MATERIEL[e.materiel].emoji} {e.machine}
                                </span>
                            </figcaption>
                        </figure>
                    )}
                    <div className="mu-exo-bas">
                        <div className="mu-series">
                            {Array.from({ length: e.series }, (_, i) => (
                                <button
                                    key={i}
                                    className={`mu-serie ${faitesExo[i] ? 'fait' : ''}`}
                                    onClick={() => basculerSerie(bloc, e, i)}
                                    aria-label={`Série ${i + 1}`}
                                >
                                    {faitesExo[i] ? '✓' : i + 1}
                                </button>
                            ))}
                        </div>
                        {avecCharge(e) ? (
                            <div className="mu-charge">
                                <button onClick={() => ajusterCharge(e.id, -2.5)} aria-label="Moins">
                                    −
                                </button>
                                <input
                                    type="number"
                                    inputMode="decimal"
                                    step="0.5"
                                    min="0"
                                    placeholder="0"
                                    value={charges[e.id] ?? ''}
                                    onChange={(ev) => changerCharge(e.id, ev.target.value)}
                                    aria-label={`Charge pour ${e.nom}`}
                                />
                                <span>{e.parHaltere ? 'kg/haltère' : e.assistance ? 'kg aide' : 'kg'}</span>
                                <button onClick={() => ajusterCharge(e.id, 2.5)} aria-label="Plus">
                                    +
                                </button>
                            </div>
                        ) : e.mesure ? (
                            <div className="mu-charge">
                                <button onClick={() => ajusterCharge(e.id, -pasDe(e))} aria-label="Moins">
                                    −
                                </button>
                                <input
                                    type="number"
                                    inputMode="decimal"
                                    step={pasDe(e)}
                                    min="0"
                                    placeholder="0"
                                    value={charges[e.id] ?? ''}
                                    onChange={(ev) => changerCharge(e.id, ev.target.value)}
                                    aria-label={e.mesure === 'km' ? `Distance parcourue pour ${e.nom}` : e.mesure === 'reps' ? `Meilleure série (reps) pour ${e.nom}` : `Meilleure tenue (secondes) pour ${e.nom}`}
                                />
                                <span>{e.mesure === 'km' ? 'km' : e.mesure === 'reps' ? 'reps max' : 's max'}</span>
                                <button onClick={() => ajusterCharge(e.id, pasDe(e))} aria-label="Plus">
                                    +
                                </button>
                            </div>
                        ) : null}
                    </div>
                    {reco?.type === 'charge' && !dernier && (
                        <div className="mu-passe">
                            <span className="mu-reco">
                                🎯 Pour toi : {reco.min === reco.max ? `≈ ${fmtKg(reco.min)}` : `${fmtKg(reco.min)}–${fmtKg(reco.max)}`} kg
                                {e.parHaltere ? ' par haltère' : e.assistance ? ' d’assistance' : ''}
                                {versKg(charges[e.id]) === null && (
                                    <button onClick={() => changerCharge(e.id, String(reco.min))}>Utiliser {fmtKg(reco.min)} kg</button>
                                )}
                            </span>
                        </div>
                    )}
                    {reco?.type === 'texte' && (
                        <div className="mu-passe">
                            <span className="mu-reco-texte">{reco.texte}</span>
                        </div>
                    )}
                    {dernier && (
                        <div className="mu-passe">
                            <span>
                                Dernière fois : {dernier.kg !== null ? `${fmtKg(dernier.kg)} ${uniteCourte(e)} · ` : ''}
                                {dernier.faites}/{dernier.total} · {RESSENTIS[dernier.ressenti].emoji}
                            </span>
                            {conseil && (
                                <span className={`mu-conseil ${conseil.sens}`}>
                                    {conseil.sens === 'monte' ? '⬆' : conseil.sens === 'descend' ? '⬇' : '='} {conseil.texte}
                                    {conseil.kg !== undefined && versKg(charges[e.id]) !== conseil.kg && (
                                        <button onClick={() => changerCharge(e.id, String(conseil.kg))}>Appliquer</button>
                                    )}
                                </span>
                            )}
                        </div>
                    )}
                    {e.consignes.length > 0 && (
                        <button className="mu-conseils-lien" onClick={() => setConseils(ouvert ? null : e.id)}>
                            {ouvert ? '▾ Masquer les conseils' : '▸ Conseils'} · {e.muscles.map((m) => MUSCLES[m]).join(', ')}
                        </button>
                    )}
                    {ouvert && (
                        <div className="mu-conseils">
                            <ul>
                                {e.consignes.map((c) => (
                                    <li key={c}>{c}</li>
                                ))}
                            </ul>
                            {e.alternative && <p>🔁 Si c’est pris : {e.alternative}</p>}
                        </div>
                    )}
                </div>
            )
    }

    const parJour = Array.from({ length: 7 }, (_, i) => {
        const jour = new Date(lundi)
        jour.setDate(lundi.getDate() + i)
        return { jour, seances: taches.filter((t) => t.date_debut && memeJour(new Date(t.date_debut), jour)) }
    })

    return (
        <div className="mu">
            {/* En-tête */}
            <section className="mu-hero">
                <div>
                    <h1 className="mu-titre">MUSCU</h1>
                    <p className="mu-sous">
                        {SALLE.nom} · {SALLE.horaires}
                    </p>
                </div>
                {prochaine && prochaine.date_debut && (
                    <div className="mu-prochaine" style={{ '--c': seanceParCode(codeDeTache(prochaine) ?? 'A').couleur } as React.CSSProperties}>
                        <span className="mu-prochaine-label">PROCHAINE SÉANCE · {dansCombien(new Date(prochaine.date_debut)).toUpperCase()}</span>
                        <span className="mu-prochaine-texte">
                            {seanceParCode(codeDeTache(prochaine) ?? 'A').emoji} Séance {codeDeTache(prochaine)} ·{' '}
                            {jourLong.format(horaireSeance(prochaine).debut)} à {hm(horaireSeance(prochaine).debut)}
                        </span>
                    </div>
                )}
            </section>

            {/* Planning de la semaine */}
            <section className={`mu-carte repliable${semaineOuverte ? '' : ' replie'}`}>
                <div className="mu-entete-ligne">
                    <button className="mu-fleche" onClick={() => setDecalage((d) => Math.max(0, d - 1))} disabled={decalage === 0} aria-label="Semaine précédente">
                        ‹
                    </button>
                    <h2 className="mu-h2">
                        <BoutonRepli ouvert={semaineOuverte} onClick={() => basculerSemaine()}>
                            {decalage === 0 ? 'CETTE SEMAINE' : 'SEMAINE PROCHAINE'}
                        </BoutonRepli>
                    </h2>
                    <button className="mu-fleche" onClick={() => setDecalage((d) => Math.min(1, d + 1))} disabled={decalage === 1} aria-label="Semaine suivante">
                        ›
                    </button>
                </div>

                {semaineOuverte && (
                    <>
                <div className="mu-semaine">
                    {parJour.map(({ jour, seances }, i) => {
                        const auj = memeJour(jour, new Date())
                        return (
                            <div key={i} className={`mu-jour ${auj ? 'auj' : ''}`}>
                                <span className="mu-jour-lettre">{JOURS_COURTS[i]}</span>
                                <span className="mu-jour-date">{jour.getDate()}</span>
                                {seances.length === 0 ? (
                                    <span className="mu-jour-vide">·</span>
                                ) : (
                                    seances.map((t) => {
                                        const s = seanceParCode(codeDeTache(t) ?? 'A')
                                        return (
                                            <button
                                                key={t.id}
                                                className={`mu-pastille ${t.statut === 'fait' ? 'fait' : ''}`}
                                                style={{ '--c': s.couleur } as React.CSSProperties}
                                                onClick={() => {
                                                    setCode(s.code)
                                                    basculerDetail(true)
                                                }}
                                                title={`Séance ${s.code}`}
                                            >
                                                {t.statut === 'fait' ? '✓' : s.emoji}
                                                <b>{s.code}</b>
                                            </button>
                                        )
                                    })
                                )}
                            </div>
                        )
                    })}
                </div>

                {chargement ? (
                    <p className="mu-gris">Chargement…</p>
                ) : taches.length === 0 ? (
                    <p className="mu-gris">Aucune séance programmée cette semaine — utilise « Séances de sport » dans l’onglet Agenda.</p>
                ) : (
                    <table className="mu-table">
                        <thead>
                            <tr>
                                <th>Séance</th>
                                <th>Quand</th>
                                <th>Lieu</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {taches.map((t) => {
                                const s = seanceParCode(codeDeTache(t) ?? 'A')
                                const { debut, fin } = horaireSeance(t)
                                const ouvert = deplacement?.tache.id === t.id
                                return (
                                    <Fragment key={t.id}>
                                        <tr className={t.statut === 'fait' ? 'fait' : ''}>
                                            <td>
                                                <span className="mu-badge" style={{ '--c': s.couleur } as React.CSSProperties}>
                                                    {s.code}
                                                </span>{' '}
                                                {s.emoji}
                                            </td>
                                            <td>
                                                <b>{jourCourt.format(debut)}</b>
                                                <br />
                                                {hm(debut)}–{hm(fin)}
                                            </td>
                                            <td>{s.lieu === 'maison' ? '🏠 Maison' : '🏋️ Salle'}</td>
                                            <td className="mu-actions-cellule">
                                                {t.statut === 'fait' ? (
                                                    <span className="mu-ok">✓ Faite</span>
                                                ) : (
                                                    <>
                                                        <button className="mu-mini" onClick={() => (ouvert ? setDeplacement(null) : ouvrirDeplacement(t))}>
                                                            {ouvert ? 'Fermer' : '📅 Déplacer'}
                                                        </button>
                                                        <button className="mu-mini mu-mini-ok" onClick={() => marquerFaite(t)}>
                                                            ✓
                                                        </button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                        {ouvert && deplacement && (
                                            <tr className="mu-dep-ligne">
                                                <td colSpan={4}>
                                                    <div className="mu-dep">
                                                        <p className="mu-dep-titre">
                                                            Déplacer la séance {s.code} {s.lieu === 'maison' ? '(à la maison)' : '(en salle, trajets compris)'} :
                                                        </p>
                                                        {deplacement.chargement ? (
                                                            <p className="mu-gris">Recherche des créneaux libres…</p>
                                                        ) : (
                                                            <div className="mu-dep-grille">
                                                                {deplacement.options.map(({ jour, creneau }) => (
                                                                    <button
                                                                        key={jour.toISOString()}
                                                                        className="mu-dep-jour"
                                                                        disabled={!creneau}
                                                                        onClick={() => creneau && deplacerVers(creneau)}
                                                                    >
                                                                        <span>{jourCourt.format(jour)}</span>
                                                                        <b>{creneau ? hm(creneau.debut) : '—'}</b>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                        <div className="mu-dep-manuel">
                                                            <span>Ou choisis :</span>
                                                            <input
                                                                type="date"
                                                                value={deplacement.date}
                                                                onChange={(e) => setDeplacement({ ...deplacement, date: e.target.value })}
                                                            />
                                                            <input
                                                                type="time"
                                                                value={deplacement.heure}
                                                                onChange={(e) => setDeplacement({ ...deplacement, heure: e.target.value })}
                                                            />
                                                            <button className="mu-mini mu-mini-ok" onClick={deplacerManuel}>
                                                                OK
                                                            </button>
                                                        </div>
                                                        {deplacement.erreur && <p className="mu-erreur">{deplacement.erreur}</p>}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                )
                            })}
                        </tbody>
                    </table>
                )}
                    </>
                )}
            </section>

            {/* Objectifs muscu : les figures de callisthénie, étape par étape */}
            {(() => {
                const toutes = FIGURES.reduce((n, f) => n + f.etapes.length, 0)
                const reussies = FIGURES.reduce((n, f) => n + f.etapes.filter((_, i) => etapeFaite(f.id, i + 1)).length, 0)
                return (
                    <div className="mu-carte mu-objectif mu-figures" style={{ '--c': '#ffb020' } as React.CSSProperties}>
                        <div className="mu-objectif-tete">
                            <span className="mu-objectif-titre">🏆 MES OBJECTIFS : LES FIGURES</span>
                            <span className="mu-objectif-delai">
                                {reussies}/{toutes} étapes
                            </span>
                        </div>
                        <ul className="mu-figures-liste">
                            {FIGURES.map((f) => {
                                const faites = f.etapes.map((_, i) => etapeFaite(f.id, i + 1))
                                const n = faites.filter(Boolean).length
                                const prochaine = faites.findIndex((x) => !x)
                                const ouverte = figureOuverte === f.id
                                const s = seanceParCode(f.seance, niveaux[f.seance]?.n)
                                return (
                                    <li key={f.id} className={`mu-figure${ouverte ? ' ouverte' : ''}${prochaine === -1 ? ' finie' : ''}`}>
                                        <button className="mu-figure-tete" aria-expanded={ouverte} onClick={() => setFigureOuverte(ouverte ? null : f.id)}>
                                            <span className="mu-figure-emoji">{f.emoji}</span>
                                            <span className="mu-figure-nom">
                                                <b>{f.nom}</b>
                                                <small>{prochaine === -1 ? '🏅 Maîtrisé !' : f.etapes[prochaine].titre}</small>
                                            </span>
                                            <span className="mu-objectif-barre mu-figure-barre" aria-label={`${n} étapes sur ${f.etapes.length}`}>
                                                {faites.map((ok, i) => (
                                                    <span key={i} className={ok ? 'fait' : i === prochaine ? 'actuel' : ''} />
                                                ))}
                                            </span>
                                        </button>
                                        {ouverte && (
                                            <div className="mu-figure-detail">
                                                <ol className="mu-jalons">
                                                    {f.etapes.map((e, i) => (
                                                        <li key={e.titre} className={faites[i] ? 'fait' : i === prochaine ? 'actuel' : ''}>
                                                            <span className="mu-jalon-puce">{faites[i] ? '✓' : i + 1}</span>
                                                            <span className="mu-jalon-texte">
                                                                {e.titre}
                                                                {i === prochaine && <small> · {e.detail}</small>}
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ol>
                                                <div className="mu-figure-actions">
                                                    {prochaine !== -1 && (
                                                        <button className="mu-defi-btn" onClick={() => validerEtape(f.id, prochaine + 1)}>
                                                            ✅ J’ai réussi : {f.etapes[prochaine].titre}
                                                        </button>
                                                    )}
                                                    <button className="mu-btn-sec" onClick={() => ouvrirSeance(f.seance)}>
                                                        {s.emoji} Séance {f.seance} · niv. {s.niveau}
                                                    </button>
                                                </div>
                                                <p className="mu-gris">Se travaille en {f.ou}.</p>
                                            </div>
                                        )}
                                    </li>
                                )
                            })}
                        </ul>
                    </div>
                )
            })()}

            {/* Objectif de l'année : 10 km, et les défis du cardio comme étapes */}
            {(() => {
                const c = seanceParCode('C', niveaux.C?.n)
                const record = Math.max(0, ...suivi.seances.flatMap((x) => x.exercices.filter((e) => (e.id === 'c-fond' || e.id === 'c-depart' || e.id === 'e-endurance') && e.kg).map((e) => e.kg as number)))
                const semaines = Math.max(0, Math.ceil((new Date(OBJECTIF_DATE).getTime() - Date.now()) / (7 * 24 * 3600 * 1000)))
                const idsC = c.blocs.flatMap((b) => b.exercices.map((e) => e.id))
                const faitesC = seancesAuNiveau('C', niveaux.C?.depuis, idsC, suivi.seances).length
                const fini = defis[cleDefi('C', c.nbNiveaux)] !== undefined
                // Séances cardio encore conseillées avant de pouvoir tenter les 10 km (1 cardio par semaine).
                const reste = Math.max(0, (c.defi?.apres ?? 0) - faitesC) + c.niveaux.slice(c.niveau).reduce((n, nv) => n + (nv.defi?.apres ?? 0), 0)
                const prevue = new Date(Date.now() + reste * 7 * 24 * 3600 * 1000)
                const dansLesTemps = prevue.getTime() <= new Date(OBJECTIF_DATE).getTime()
                return (
                    <div className="mu-carte mu-objectif" style={{ '--c': c.couleur } as React.CSSProperties}>
                        <div className="mu-objectif-tete">
                            <span className="mu-objectif-titre">🏅 OBJECTIF DE L’ANNÉE : {OBJECTIF_KM} KM SANS S’ARRÊTER</span>
                            <span className="mu-objectif-delai">avant le 30 juin · {semaines} sem.</span>
                        </div>
                        <ol className="mu-jalons">
                            {c.niveaux.map((nv, i) => {
                                const n = i + 1
                                const ok = defis[cleDefi('C', n)] !== undefined || n < c.niveau
                                const actuel = n === c.niveau && !ok
                                return (
                                    <li key={nv.nom} className={ok ? 'fait' : actuel ? 'actuel' : ''}>
                                        <span className="mu-jalon-puce">{ok ? '✓' : n}</span>
                                        <span className="mu-jalon-texte">
                                            {nv.defi?.titre.replace('🏅 ', '') ?? nv.nom}
                                            {actuel && nv.defi && (
                                                <small>
                                                    {' '}
                                                    · {Math.min(faitesC, nv.defi.apres)}/{nv.defi.apres} séances
                                                </small>
                                            )}
                                        </span>
                                    </li>
                                )
                            })}
                        </ol>
                        <p className="mu-objectif-texte">
                            {fini
                                ? '🏅 Objectif atteint : tu as couru 10 km. Bravo !'
                                : reste === 0
                                  ? '💪 Tu peux tenter les 10 km quand tu te sens prêt.'
                                  : `${dansLesTemps ? '✅ Dans les temps' : '⚠️ Un peu juste'} : à 1 cardio par semaine, tu pourras tenter les 10 km vers ${prevue.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}.`}
                            {record > 0 ? ` Plus longue course : ${fmtKg(record)} km.` : ''}
                        </p>
                    </div>
                )
            })()}

            {/* Choix de la séance */}
            <div className="mu-cartes-seances">
                {PROGRAMME.map((base) => {
                    const s = seanceParCode(base.code, niveaux[base.code]?.n)
                    return (
                        <button
                            key={s.code}
                            className={`mu-carte-seance ${s.code === code ? 'actif' : ''}`}
                            style={{ '--c': s.couleur } as React.CSSProperties}
                            onClick={() => {
                                setCode(s.code)
                                setConseils(null)
                                basculerDetail(true)
                            }}
                        >
                            <span className="mu-cs-emoji">{s.emoji}</span>
                            <span className="mu-cs-code">{s.code}</span>
                            <span className="mu-cs-titre">{s.titre.replace(/^Maison : /, '')}</span>
                            <span className="mu-cs-meta">
                                {dureeDe(s, lireReglages().duree)} MIN · NIV. {s.niveau}/{s.nbNiveaux}
                            </span>
                        </button>
                    )
                })}
            </div>

            {/* Détail de la séance */}
            <section
                className={`mu-detail repliable${detailOuvert ? '' : ' replie'}`}
                style={{ '--c': seance.couleur } as React.CSSProperties}
            >
                <div className="mu-detail-hero">
                    <div className="mu-detail-texte">
                        <span className="mu-detail-lieu">{seance.lieu === 'maison' ? '🏠 MAISON OU 🏋️ SALLE' : '🏋️ EN SALLE'}</span>
                        <h2 className="mu-detail-titre">
                            <BoutonRepli ouvert={detailOuvert} onClick={() => basculerDetail()}>
                                {seance.emoji} SÉANCE {seance.code}
                            </BoutonRepli>
                        </h2>
                        <p className="mu-detail-sous">{seance.titre.replace(/^Maison : /, '')}</p>
                        <p className="mu-detail-niveau">
                            NIVEAU {seance.niveau}/{seance.nbNiveaux} · {seance.nom.toUpperCase()}
                        </p>
                        <div className="mu-anneau" style={{ '--p': `${pourcent}%` } as React.CSSProperties}>
                            <span>
                                {faites}/{total}
                                <small>séries</small>
                            </span>
                        </div>
                    </div>
                    <BodyMap muscles={musclesDe(exercices)} couleur={seance.couleur} />
                </div>
                {detailOuvert && (
                    <>
                <div className="mu-niveaux">
                    <div className="mu-niveaux-choix" role="radiogroup" aria-label="Niveau de la séance">
                        {seance.niveaux.map((nv, i) => (
                            <button
                                key={nv.nom}
                                role="radio"
                                aria-checked={seance.niveau === i + 1}
                                className={seance.niveau === i + 1 ? 'actif' : i + 1 < seance.niveau ? 'passe' : ''}
                                onClick={() => changerNiveau(i + 1)}
                            >
                                <b>{i + 1}</b>
                                <span>{nv.nom}</span>
                            </button>
                        ))}
                    </div>
                    <p className="mu-niveaux-resume">{seance.resume}</p>
                    {seance.defi && (
                        <div className={`mu-defi${defiReussi !== undefined ? ' reussi' : ''}`}>
                            <span className="mu-defi-label">
                                {seance.niveau >= seance.nbNiveaux ? '🏅 OBJECTIF FINAL' : `🎯 DÉFI POUR LE NIVEAU ${seance.niveau + 1}`}
                            </span>
                            <b>{seance.defi.titre.replace('🏅 ', '')}</b>
                            <p>{seance.defi.detail}</p>
                            {defiReussi !== undefined ? (
                                <p className="mu-defi-ok">
                                    ✅ Réussi{defiReussi ? ` le ${new Date(defiReussi).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}` : ''}
                                    {seance.niveau < seance.nbNiveaux && (
                                        <button className="mu-defi-suivant" onClick={() => changerNiveau(seance.niveau + 1)}>
                                            Passer au niveau {seance.niveau + 1} ›
                                        </button>
                                    )}
                                </p>
                            ) : (
                                <>
                                    <div className="mu-defi-compte">
                                        <div className="mu-defi-jauge">
                                            <span style={{ width: `${Math.min(100, (faitesAuNiveau / seance.defi.apres) * 100)}%` }} />
                                        </div>
                                        <small>
                                            {Math.min(faitesAuNiveau, seance.defi.apres)}/{seance.defi.apres} séances conseillées
                                        </small>
                                    </div>
                                    <p className="mu-defi-quand">
                                        {faitesAuNiveau >= seance.defi.apres
                                            ? '💪 Tu as fait assez de séances : tente le défi dès que tu te sens prêt !'
                                            : `Encore ${seance.defi.apres - faitesAuNiveau} séance${seance.defi.apres - faitesAuNiveau > 1 ? 's' : ''} conseillée${seance.defi.apres - faitesAuNiveau > 1 ? 's' : ''} avant de tenter (tu peux essayer avant si tu te sens prêt).`}
                                    </p>
                                    <button className="mu-defi-btn" onClick={() => reussirDefi()}>
                                        {seance.niveau >= seance.nbNiveaux ? '🏅 J’ai réussi l’objectif' : '✅ J’ai réussi le défi'}
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                    {avis?.sens === 'descend' ? (
                        <p className={`mu-niveaux-avis ${avis.sens}`}>
                            🧱 {avis.texte}
                            <button onClick={() => changerNiveau(seance.niveau - 1)}>Niveau {seance.niveau - 1}</button>
                        </p>
                    ) : (
                        <p className="mu-niveaux-aide">Tu peux aussi changer de niveau à la main : tes charges sont gardées.</p>
                    )}
                </div>
                <div className="mu-muscles">
                    {musclesDe(exercices).map((m) => (
                        <span key={m} className="mu-muscle">
                            {MUSCLES[m]}
                        </span>
                    ))}
                </div>

                <div className="mu-etape">
                    <span className="mu-etape-num">1</span>
                    <div>
                        <b>ÉCHAUFFEMENT</b>
                        {seance.echauffement.map((l) => (
                            <p key={l}>{l}</p>
                        ))}
                    </div>
                </div>

                {seance.blocs.map((bloc, bi) => (
                    <div key={bloc.titre} className="mu-bloc">
                        <div className="mu-bloc-tete">
                            <span className="mu-etape-num">{bi + 2}</span>
                            <b>{bloc.titre.toUpperCase()}</b>
                            <span className="mu-tags">
                                {bloc.tours > 1 && <span className="mu-tag">{bloc.tours} TOURS</span>}
                                {bloc.repos > 0 && <span className="mu-tag">⏱ {bloc.repos} S</span>}
                            </span>
                        </div>
                        {bloc.exercices.length > 1 && bloc.tours > 1 && (
                            <p className="mu-bloc-info">Enchaîne les exercices sans pause, puis repos.</p>
                        )}
                        {bloc.exercices.map((e) => carteExo(bloc, e))}
                    </div>
                ))}

                <div className="mu-bloc mu-extras">
                    <div className="mu-bloc-tete">
                        <span className="mu-etape-num">+</span>
                        <b>EXERCICES EN PLUS</b>
                        {extrasSeance.length > 0 && (
                            <span className="mu-tags">
                                <span className="mu-tag">{extrasSeance.length}</span>
                            </span>
                        )}
                    </div>
                    {extrasSeance.length === 0 && !ajout && (
                        <p className="mu-bloc-info">Tu as fait un exercice qui n’est pas dans la liste ? Ajoute-le : ses séries comptent dans la séance et dans ton historique.</p>
                    )}
                    {extrasSeance.map((e) => carteExo(BLOC_EXTRA, e, true))}
                    {ajout ? (
                        <div className="mu-ajout">
                            <label className="mu-ajout-label" htmlFor="mu-ajout-nom">
                                Quel exercice ?
                            </label>
                            <input
                                id="mu-ajout-nom"
                                className="mu-ajout-nom"
                                type="text"
                                autoComplete="off"
                                placeholder="Ex. : tractions, gainage, corde à sauter…"
                                value={ajout.choisi ? ajout.choisi.nom : ajout.texte}
                                onChange={(ev) => setAjout({ ...ajout, texte: ev.target.value, choisi: null, erreur: null })}
                                autoFocus
                            />
                            {!ajout.choisi && ajout.texte.trim().length >= 2 && (() => {
                                const q = sansAccents(ajout.texte.trim())
                                const trouves = CATALOGUE.filter((x) => sansAccents(`${x.nom} ${x.machine}`).includes(q) && !exercices.some((p) => p.id === x.id)).slice(0, 6)
                                return trouves.length > 0 ? (
                                    <div className="mu-ajout-choix">
                                        {trouves.map((x) => (
                                            <button key={x.id} onClick={() => setAjout({ ...ajout, choisi: x, series: x.series, erreur: null })}>
                                                <b>{x.nom}</b>
                                                <small>{x.machine}</small>
                                            </button>
                                        ))}
                                    </div>
                                ) : null
                            })()}
                            <div className="mu-ajout-ligne">
                                <span>Séries</span>
                                <div className="mu-charge">
                                    <button onClick={() => setAjout({ ...ajout, series: Math.max(1, ajout.series - 1) })} aria-label="Une série de moins">
                                        −
                                    </button>
                                    <b className="mu-ajout-nb">{ajout.series}</b>
                                    <button onClick={() => setAjout({ ...ajout, series: Math.min(10, ajout.series + 1) })} aria-label="Une série de plus">
                                        +
                                    </button>
                                </div>
                            </div>
                            {ajout.choisi ? (
                                <p className="mu-gris">
                                    Exercice du catalogue{uniteDe(ajout.choisi) ? ` · tu noteras : ${uniteDe(ajout.choisi)}` : ''}.{' '}
                                    <button className="mu-lien" onClick={() => setAjout({ ...ajout, choisi: null })}>
                                        Changer
                                    </button>
                                </p>
                            ) : (
                                <div className="mu-ajout-ligne">
                                    <span>Je note</span>
                                    <div className="mu-ajout-mesures" role="radiogroup" aria-label="Ce que tu notes">
                                        {MESURES_PERSO.map((m) => (
                                            <button key={m.v} role="radio" aria-checked={ajout.mesure === m.v} className={ajout.mesure === m.v ? 'actif' : ''} onClick={() => setAjout({ ...ajout, mesure: m.v })}>
                                                {m.libelle}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {ajout.erreur && <p className="mu-erreur">{ajout.erreur}</p>}
                            <div className="mu-boutons">
                                <button className="mu-btn-sec" onClick={() => setAjout(null)}>
                                    ANNULER
                                </button>
                                <button className="mu-btn" onClick={ajouterExtra}>
                                    AJOUTER
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button className="mu-ajout-btn" onClick={() => setAjout({ texte: '', choisi: null, series: 3, mesure: 'reps', erreur: null })}>
                            ➕ Ajouter un exercice fait en plus
                        </button>
                    )}
                </div>

                <div className="mu-etape">
                    <span className="mu-etape-num">✓</span>
                    <div>
                        <b>RETOUR AU CALME</b>
                        {seance.retourAuCalme.map((l) => (
                            <p key={l}>{l}</p>
                        ))}
                    </div>
                </div>

                <p className="mu-progression">
                    📈 {seance.progression}
                    <br />
                    🎯 {seance.monter}
                </p>

                {bilan ? (
                    <div className="mu-bilan">
                        <h3>BILAN DE LA SÉANCE</h3>
                        <p className="mu-gris">
                            {bilan.length > 0
                                ? `Comment c’était pour chaque exercice ? Ça sert à te dire quand progresser (charge, reps ou niveau).`
                                : 'Aucune série cochée : la séance sera notée sans détail. La prochaine fois, touche les ronds de séries pendant la séance.'}
                        </p>
                        <table className="mu-table mu-table-bilan">
                            <tbody>
                                {bilan.map((b) => {
                                    const exo = exercices.find((x) => x.id === b.id)
                                    return (
                                        <tr key={b.id}>
                                            <td>
                                                <b>{exo?.nom ?? b.id}</b>
                                                <small>
                                                    {b.faites}/{b.total} séries{b.kg !== null ? ` · ${fmtKg(b.kg)} ${uniteCourte(exo)}` : ''}
                                                    {exo && extrasSeance.includes(exo) ? ' · en plus' : ''}
                                                </small>
                                            </td>
                                            <td className="mu-droite">
                                                <div className="mu-ressenti">
                                                    {(['dur', 'bien', 'facile'] as const).map((r) => (
                                                        <button
                                                            key={r}
                                                            className={`${r} ${b.ressenti === r ? 'actif' : ''}`}
                                                            onClick={() => noter(b.id, r)}
                                                            aria-label={RESSENTIS[r].libelle}
                                                            title={RESSENTIS[r].libelle}
                                                        >
                                                            {RESSENTIS[r].emoji}
                                                        </button>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                        <div className="mu-boutons">
                            <button className="mu-btn-sec" onClick={() => setBilan(null)}>
                                RETOUR
                            </button>
                            <button className="mu-btn" onClick={enregistrerBilan}>
                                ENREGISTRER
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="mu-boutons">
                        <button className="mu-btn-sec" onClick={() => setRepos({ restant: 60, total: 60 })}>
                            ⏱ REPOS 60 S
                        </button>
                        <button className="mu-btn" onClick={terminer}>
                            SÉANCE TERMINÉE
                        </button>
                    </div>
                )}
                    </>
                )}
            </section>

            <ProfilMuscu
                profil={profil}
                aujourdhui={new Date()}
                onChange={(p) => {
                    setProfil(p)
                    enregistrerProfil(p)
                }}
            />

            <MontreMuscu />

            <ProgressionMuscu seances={suivi.seances} lundi={debutDeSemaine(new Date())} synchro={synchro} onSupprimer={supprimerSeance} />

            {message && (
                <div className={`mu-toast${repos ? ' haut' : ''}`} role="status" onClick={() => setMessage(null)}>
                    {message}
                </div>
            )}

            {repos && (
                <div className="mu-repos" role="timer">
                    <div className="mu-repos-barre" style={{ width: `${(repos.restant / repos.total) * 100}%` }} />
                    <span className="mu-repos-texte">
                        REPOS · {Math.floor(repos.restant / 60)}:{String(repos.restant % 60).padStart(2, '0')}
                    </span>
                    <button onClick={() => setRepos(null)}>Passer ›</button>
                </div>
            )}
        </div>
    )
}
