// Barre du chrono de repos (27/11/2026) : calculée depuis l'heure de fin, donc juste même après avoir fermé
// l'app ou éteint l'écran. Sonne (bip + vibration) si l'app est ouverte ; sinon c'est la notification qui sonne.
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { activerNotifications, notificationsDisponibles } from './push'
import { abonnerMinuteur, ajusterRepos, arreterRepos, minuteurEnCours, oublierRepos, reprogrammer, restantMs, sonner } from './minuteur'

export const useMinuteur = () => useSyncExternalStore(abonnerMinuteur, minuteurEnCours)

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export default function ChronoRepos({ sonnerieProgrammee }: { sonnerieProgrammee: boolean | null }) {
    const m = useMinuteur()
    const [, setTic] = useState(0)
    const [push, setPush] = useState<boolean | null>(sonnerieProgrammee)
    const sonne = useRef<string | null>(null)

    useEffect(() => setPush(sonnerieProgrammee), [sonnerieProgrammee])

    useEffect(() => {
        if (!m) return
        const id = window.setInterval(() => setTic((t) => t + 1), 250)
        const visible = () => setTic((t) => t + 1)
        document.addEventListener('visibilitychange', visible)
        return () => {
            window.clearInterval(id)
            document.removeEventListener('visibilitychange', visible)
        }
    }, [m])

    const reste = m ? restantMs(m) : 0
    const fini = !!m && reste <= 0
    const depuis = m ? Date.now() - m.fin : 0

    // Fin du repos pendant que l'app est à l'écran : ça sonne. Repos fini depuis longtemps : on range la barre.
    useEffect(() => {
        if (!m || !fini) return
        if (sonne.current !== m.id && document.visibilityState === 'visible' && depuis < 4000) {
            sonne.current = m.id
            sonner()
        }
        if (depuis > 15000) oublierRepos()
    })

    if (!m) return null
    const sec = Math.ceil(reste / 1000)
    const peutNotifier = notificationsDisponibles()

    return (
        <div className={`mu-repos${fini ? ' fini' : ''}`} role="timer" aria-live={fini ? 'assertive' : 'off'}>
            <div className="mu-repos-barre" style={{ width: `${fini ? 100 : (reste / (m.total * 1000)) * 100}%` }} />
            <div className="mu-repos-gauche">
                <span className="mu-repos-texte">
                    {fini ? (
                        'C’EST REPARTI !'
                    ) : (
                        <>
                            <small>REPOS</small> {mmss(sec)}
                        </>
                    )}
                </span>
                {!fini && push === false && peutNotifier && (
                    <button
                        className="mu-repos-notif"
                        onClick={async () => {
                            if ((await activerNotifications()) === 'actif') setPush(await reprogrammer())
                        }}
                    >
                        🔔 Activer pour sonner écran éteint
                    </button>
                )}
                {!fini && push === true && <span className="mu-repos-info">🔔 sonnera même écran éteint</span>}
            </div>
            <div className="mu-repos-boutons">
                {!fini && (
                    <>
                        <button onClick={() => ajusterRepos(-15).then(setPush)} aria-label="15 secondes de moins">
                            −15
                        </button>
                        <button onClick={() => ajusterRepos(15).then(setPush)} aria-label="15 secondes de plus">
                            +15
                        </button>
                    </>
                )}
                <button onClick={() => (fini ? oublierRepos() : arreterRepos())}>{fini ? 'OK' : 'Passer ›'}</button>
            </div>
        </div>
    )
}
