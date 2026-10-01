import { rpcRow } from '../lib/rpc-row.ts'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../auth/auth-context.ts'
import { useProfile } from './profile-context.ts'
import type { Profile } from './profile.ts'
import { ThemePicker } from '../ui/ThemePicker.tsx'
import { UnitToggle } from '../ui/UnitToggle.tsx'
import {
  convertWeightText,
  displayWeight,
  parseWeight,
} from '../units/weight.ts'
import { formatDate } from '../lib/date.ts'
import type { WeightUnit } from '../units/weight.ts'
import { validateProfile } from '../lib/form-validation.ts'
export function ProfilePage({ onboarding = false }: { onboarding?: boolean }) {
  const { client, state } = useAuth()
  const { profile, setProfile } = useProfile()
  const [name, setName] = useState(profile.preferred_name ?? '')
  const [goal, setGoal] = useState(String(profile.weekly_goal ?? 4))
  const [height, setHeight] = useState(profile.height_cm?.toString() ?? '')
  const [weight, setWeight] = useState('')
  const [unit, setUnit] = useState<WeightUnit>(profile.preferred_weight_unit)
  const [weightId, setWeightId] = useState(() => crypto.randomUUID())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [consent, setConsent] = useState(false)
  const [history, setHistory] = useState<
    { id: string; weight_kg: number; logged_at: string }[] | null
  >(null)
  const [historyError, setHistoryError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!client || onboarding) return
    let active = true
    void client
      .from('weight_logs')
      .select('id, weight_kg, logged_at')
      .eq('user_id', profile.id)
      .order('logged_at', { ascending: false })
      .limit(30)
      .then(({ data, error }) => {
        if (!active) return
        if (error) setHistoryError(true)
        else setHistory(data ?? [])
      })
    return () => {
      active = false
    }
  }, [client, profile.id, onboarding, attempt])
  async function save(event: FormEvent) {
    event.preventDefault()
    if (!client || busy) return
    setBusy(true)
    setError('')
    setSaved(false)
    const profileValidation = validateProfile({ name, goal, height })
    if (profileValidation) {
      setError(profileValidation)
      setBusy(false)
      return
    }
    const weightKg = weight === '' ? null : parseWeight(weight, unit)
    if (weight !== '' && (weightKg === null || weightKg <= 0)) {
      setError('Enter a body weight greater than zero.')
      setBusy(false)
      return
    }
    if (onboarding && !consent) {
      setError(
        'Confirm that you are at least 16 and explicitly consent before continuing.',
      )
      setBusy(false)
      return
    }
    try {
      const request = {
        p_name: name.trim(),
        p_goal: Number(goal),
        p_height: height === '' ? null : Number(height),
        p_weight: weightKg,
        p_weight_id: weightId,
        p_unit: unit,
        p_consent: onboarding && consent,
      }
      let response = await client.rpc('save_profile', request)
      if (
        response.status === 401 &&
        state.status === 'ready' &&
        state.session
      ) {
        const { error: sessionError } = await client.auth.setSession({
          access_token: state.session.access_token,
          refresh_token: state.session.refresh_token,
        })
        if (!sessionError) response = await client.rpc('save_profile', request)
      }
      if (response.error) {
        if (response.status === 401) {
          setError(
            'Your sign-in expired. Open LiftIt in your browser and sign in again. Your entries are still here.',
          )
          return
        }
        throw response.error
      }
      setProfile(rpcRow<Profile>(response.data))
      setWeight('')
      setWeightId(crypto.randomUUID())
      setSaved(true)
      setAttempt((a) => a + 1)
    } catch {
      setError(
        'Unable to save your profile. Your entries are still here. Please retry.',
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="profile-page">
      <p className="eyebrow">
        {onboarding ? 'Make LiftIt yours' : 'Your account'}
      </p>
      <h1>{onboarding ? 'Build your routine.' : 'Profile'}</h1>
      <p className="intro">
        Choose your weekly gym-day goal. Height and body weight are optional and
        can be added later.
      </p>
      <div className="profile-unit-row">
        <div>
          <strong>Preferred weight unit</strong>
          <span>Used for workouts, progress and body weight.</span>
        </div>
        <UnitToggle
          value={unit}
          onChange={(next) => {
            setWeight((current) => convertWeightText(current, unit, next))
            setUnit(next)
          }}
        />
      </div>
      <form onSubmit={save} className="panel">
        <fieldset disabled={busy} className="field-grid">
          <label>
            Preferred name
            <input
              required
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="given-name"
              pattern=".*\S.*"
            />
          </label>
          <label>
            Gym days per week
            <select value={goal} onChange={(e) => setGoal(e.target.value)}>
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <label>
            Height (cm, optional)
            <input
              type="number"
              min="0.01"
              max="999.99"
              step="0.01"
              inputMode="decimal"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
            />
          </label>
          <label>
            {onboarding ? 'Body weight' : 'New weight entry'} ({unit}, optional)
            <input
              type="number"
              min="0.01"
              max="9999.99"
              step="0.01"
              inputMode="decimal"
              value={weight}
              onChange={(e) => {
                setWeight(e.target.value)
                setWeightId(crypto.randomUUID())
              }}
            />
          </label>
          {onboarding && (
            <label className="consent-label">
              <input
                type="checkbox"
                required
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <span>
                I confirm I am at least 16, have read the{' '}
                <a href="/privacy" target="_blank" rel="noreferrer">
                  privacy notice
                </a>
                , and explicitly consent to LiftIt storing my workout and any
                optional body information to provide the service.
              </span>
            </label>
          )}
          <button disabled={busy}>
            {busy
              ? 'Saving...'
              : onboarding
                ? 'Save and continue'
                : 'Save profile'}
          </button>
          <div className="form-feedback">
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            {saved && <p role="status">Profile saved.</p>}
          </div>
        </fieldset>
      </form>
      {!onboarding && (
        <>
          <section className="panel">
            <h2>Appearance</h2>
            <ThemePicker />
          </section>
          <section className="panel">
            <h2>Body-weight history</h2>
            {historyError ? (
              <>
                <p role="alert">Unable to load weight history.</p>
                <button
                  onClick={() => {
                    setHistoryError(false)
                    setAttempt((a) => a + 1)
                  }}
                >
                  Retry history
                </button>
              </>
            ) : !history ? (
              <p role="status">Loading history...</p>
            ) : !history.length ? (
              <p>No measurements yet. Add one whenever you want.</p>
            ) : (
              <ul className="plain-list">
                {history.map((row) => (
                  <li key={row.id}>
                    <time dateTime={row.logged_at}>
                      {formatDate(row.logged_at)}
                    </time>
                    <strong>
                      {displayWeight(row.weight_kg, unit)} {unit}
                    </strong>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </section>
  )
}
