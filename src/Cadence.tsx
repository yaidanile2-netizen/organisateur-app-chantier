// Rythme du cardio (23/11/2026, idée de Daniel) : un point qui émet une onde à chaque fois que le pied droit
// touche le sol (course, marche) ou que la pédale droite passe en bas (vélo). Bip et vibration en option,
// écran gardé allumé pendant que ça tourne. Le rythme se règle par zone (facile, vite…) et reste en mémoire.
import { useEffect, useRef, useState } from 'react'
import type { Exercice } from './programme'

type Mode = 'course' | 'velo' | 'marche'
type Zone = { nom: string; bpm: number; mode: Mode }

// Repères : course facile ≈ 160-170 pas/min (pied droit : 80-85/min), vite ≈ 180 pas/min (90/min) ;
// marche rapide ≈ 115 pas/min (57/min) ; vélo en endurance 80-90 tours/min, relances 100-110.
const FACILE: Zone = { nom: 'Course facile', bpm: 82, mode: 'course' }
const VITE: Zone = { nom: 'Vite', bpm: 90, mode: 'course' }
const LENT: Zone = { nom: 'Récup en trottinant', bpm: 80, mode: 'course' }
const MARCHE: Zone = { nom: 'Marche', bpm: 57, mode: 'marche' }
const VELO: Zone = { nom: 'Vélo facile', bpm: 85, mode: 'velo' }

export function zonesDe(e: Exercice): Zone[] | null {
    if (e.materiel !== 'cardio') return null
    const id = e.id
    if (id === 'v-rythme') return [VELO, { nom: 'Soutenu', bpm: 90, mode: 'velo' }]
    if (id === 'v-cadence') return [VELO, { nom: 'Relance vite', bpm: 105, mode: 'velo' }]
    if (id === 'v-acceleration') return [VELO, { nom: 'Fort', bpm: 95, mode: 'velo' }]
    if (id.startsWith('v-')) return [VELO]
    if (id === 'c-marche-inclinee') return [MARCHE]
    if (id === 'c-acceleration') return [VITE, MARCHE]
    if (id === 'c-30-30' || id === 'c-15-15') return [VITE, LENT]
    if (id === 'c-depart' || id === 'c-fond') return [FACILE, MARCHE]
    if (id.startsWith('c-')) return [FACILE]
    return null
}

const lireBpm = (cle: string, defaut: number) => {
    try {
        const v = Number(localStorage.getItem(cle))
        return v >= 30 && v <= 140 ? v : defaut
    } catch {
        return defaut
    }
}

let audio: AudioContext | null = null
/** Sur iPhone, le son doit être « débloqué » pendant un toucher. */
function deverrouillerSon() {
    try {
        audio ??= new AudioContext()
        audio.resume().catch(() => {})
    } catch {
        // pas de son possible
    }
}
function bip(fort: boolean) {
    try {
        audio ??= new AudioContext()
        const o = audio.createOscillator()
        const g = audio.createGain()
        o.frequency.value = fort ? 1046 : 784
        g.gain.setValueAtTime(0.0001, audio.currentTime)
        g.gain.exponentialRampToValueAtTime(0.35, audio.currentTime + 0.005)
        g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.09)
        o.connect(g).connect(audio.destination)
        o.start()
        o.stop(audio.currentTime + 0.1)
    } catch {
        // pas de son possible
    }
}

export default function Cadence({ e }: { e: Exercice }) {
    const zones = zonesDe(e)
    const [ouvert, setOuvert] = useState(false)
    const [iz, setIz] = useState(0)
    const zone = zones?.[Math.min(iz, (zones?.length ?? 1) - 1)]
    const cle = `cadence.${e.id}.${zone?.nom ?? ''}`
    const [bpm, setBpm] = useState(() => (zone ? lireBpm(cle, zone.bpm) : 80))
    const [joue, setJoue] = useState(false)
    const [son, setSon] = useState(() => lireBpm('cadence.son', 0) === 1)
    const [vibre, setVibre] = useState(false)
    const [battement, setBattement] = useState(0)
    const verrou = useRef<{ release: () => Promise<void> } | null>(null)

    useEffect(() => {
        if (zone) setBpm(lireBpm(cle, zone.bpm))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cle])

    // Le métronome : une onde par battement (pied droit / pédale droite).
    useEffect(() => {
        if (!joue) return
        const periode = 60000 / bpm
        let suivant = performance.now()
        let id = 0
        const tic = () => {
            const t = performance.now()
            if (t >= suivant) {
                setBattement((b) => b + 1)
                if (son) bip(true)
                if (vibre && 'vibrate' in navigator) navigator.vibrate(40)
                suivant += periode
                if (t - suivant > periode) suivant = t + periode // l'onglet était en pause
            }
            id = requestAnimationFrame(tic)
        }
        id = requestAnimationFrame(tic)
        return () => cancelAnimationFrame(id)
    }, [joue, bpm, son, vibre])

    // Écran gardé allumé pendant le métronome (si le téléphone le permet).
    useEffect(() => {
        if (!joue) return
        const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }
        nav.wakeLock
            ?.request('screen')
            .then((v) => (verrou.current = v))
            .catch(() => {})
        return () => {
            verrou.current?.release().catch(() => {})
            verrou.current = null
        }
    }, [joue])

    if (!zones || !zone) return null

    function regler(v: number) {
        const n = Math.max(30, Math.min(140, v))
        setBpm(n)
        try {
            localStorage.setItem(cle, String(n))
        } catch {
            // stockage indisponible
        }
    }

    const quoi =
        zone.mode === 'velo'
            ? `Pédale droite en bas à chaque onde · ${bpm} tours/min`
            : `Pied droit au sol à chaque onde · ${bpm} par minute (${bpm * 2} pas/min)`

    if (!ouvert)
        return (
            <button className="cad-ouvrir" onClick={() => setOuvert(true)}>
                🎵 Rythme {zone.mode === 'velo' ? 'de pédalage' : 'de course'} · {bpm}/min
            </button>
        )

    return (
        <div className="cad">
            {zones.length > 1 && (
                <div className="cad-zones" role="group" aria-label="Allure">
                    {zones.map((z, i) => (
                        <button key={z.nom} className={i === iz ? 'actif' : ''} onClick={() => setIz(i)}>
                            {z.nom}
                        </button>
                    ))}
                </div>
            )}
            <button className={`cad-scene${joue ? ' joue' : ''}`} onClick={() => {
                    if (son) deverrouillerSon()
                    setJoue((j) => !j)
                }} aria-label={joue ? 'Arrêter le rythme' : 'Lancer le rythme'}>
                {joue && <span key={battement} className="cad-onde" style={{ animationDuration: `${Math.min(1.4, 120 / bpm)}s` }} />}
                {joue && <span key={`p${battement}`} className="cad-point bat" />}
                {!joue && <span className="cad-point" />}
                <span className="cad-icone">{zone.mode === 'velo' ? '🚴' : zone.mode === 'marche' ? '🚶' : '🏃'}</span>
                <span className="cad-play">{joue ? '⏸' : '▶'}</span>
            </button>
            <p className="cad-quoi">{quoi}</p>
            <div className="cad-reglage">
                <button onClick={() => regler(bpm - 1)} aria-label="Plus lent">
                    −
                </button>
                <b>{bpm}</b>
                <button onClick={() => regler(bpm + 1)} aria-label="Plus rapide">
                    +
                </button>
                <button className="cad-defaut" onClick={() => regler(zone.bpm)}>
                    Conseillé : {zone.bpm}
                </button>
            </div>
            <div className="cad-options">
                <label>
                    <input
                        type="checkbox"
                        checked={son}
                        onChange={(ev) => {
                            if (ev.target.checked) deverrouillerSon()
                            setSon(ev.target.checked)
                            try {
                                localStorage.setItem('cadence.son', ev.target.checked ? '1' : '0')
                            } catch {
                                // stockage indisponible
                            }
                        }}
                    />{' '}
                    🔊 Bip
                </label>
                {'vibrate' in navigator && (
                    <label>
                        <input type="checkbox" checked={vibre} onChange={(ev) => setVibre(ev.target.checked)} /> 📳 Vibrer
                    </label>
                )}
                <button className="btn-link" onClick={() => { setJoue(false); setOuvert(false) }}>
                    Fermer
                </button>
            </div>
            <p className="cad-aide">
                {zone.mode === 'velo'
                    ? 'Garde la même résistance et suis l’onde : si tu n’arrives pas à suivre, baisse la résistance, pas le rythme.'
                    : 'Petits pas rapides : cale ton pied droit sur l’onde. Si tu t’essouffles, ralentis la vitesse du tapis, garde le rythme des pas.'}
            </p>
        </div>
    )
}
