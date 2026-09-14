import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const metadata = [
  {
    match: /^\/$/,
    title: 'Workout tracker',
    description:
      'Build routines, log live workouts and follow clear progression with LiftIt.',
  },
  {
    match: /^\/app$/,
    title: 'Dashboard',
    description: 'Your LiftIt workout dashboard.',
  },
  {
    match: /^\/privacy$/,
    title: 'Privacy',
    description: 'How LiftIt collects, uses and protects personal information.',
  },
  { match: /^\/login$/, title: 'Sign in', description: 'Sign in to LiftIt.' },
  {
    match: /^\/register$/,
    title: 'Create account',
    description: 'Create your LiftIt account.',
  },
  {
    match: /^\/forgot-password$/,
    title: 'Reset password',
    description: 'Reset your LiftIt password.',
  },
  {
    match: /^\/update-password$/,
    title: 'Choose password',
    description: 'Choose a new LiftIt password.',
  },
  {
    match: /^\/auth\/callback$/,
    title: 'Account confirmation',
    description: 'Complete your LiftIt account request.',
  },
  {
    match: /^\/onboarding$/,
    title: 'Set up profile',
    description: 'Set up your LiftIt workout profile.',
  },
  {
    match: /^\/profile$/,
    title: 'Profile',
    description: 'Manage your LiftIt profile and preferences.',
  },
  {
    match: /^\/workouts$/,
    title: 'Workouts',
    description: 'Manage your LiftIt workout routines.',
  },
  {
    match: /^\/workouts\/new$/,
    title: 'New workout',
    description: 'Create a LiftIt workout routine.',
  },
  {
    match: /^\/workouts\/[^/]+\/edit$/,
    title: 'Edit workout',
    description: 'Edit your LiftIt workout routine.',
  },
  {
    match: /^\/sessions\/[^/]+$/,
    title: 'Active workout',
    description: 'Log your active LiftIt workout.',
  },
]

export function PageMetadata() {
  const { pathname } = useLocation()

  useEffect(() => {
    const page = metadata.find(({ match }) => match.test(pathname)) ?? {
      title: 'Page unavailable',
      description: 'The requested LiftIt page is unavailable.',
    }
    document.title = `${page.title} | LiftIt`
    document
      .querySelector<HTMLMetaElement>('meta[name="description"]')
      ?.setAttribute('content', page.description)
    document
      .querySelector<HTMLMetaElement>('meta[property="og:title"]')
      ?.setAttribute('content', `${page.title} | LiftIt`)
    document
      .querySelector<HTMLMetaElement>('meta[property="og:description"]')
      ?.setAttribute('content', page.description)
    document
      .querySelector<HTMLMetaElement>('meta[name="twitter:title"]')
      ?.setAttribute('content', `${page.title} | LiftIt`)
    document
      .querySelector<HTMLMetaElement>('meta[name="twitter:description"]')
      ?.setAttribute('content', page.description)
  }, [pathname])

  return null
}
