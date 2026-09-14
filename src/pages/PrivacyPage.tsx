import { Link } from 'react-router-dom'

import { Brand } from '../ui/Brand.tsx'

export function PrivacyPage() {
  return (
    <div className="public-shell">
      <header className="public-header">
        <Brand />
        <Link className="public-sign-in" to="/">
          Back to home
        </Link>
      </header>
      <main className="privacy-page">
        <p className="eyebrow">Privacy notice</p>
        <h1>How LiftIt handles your information.</h1>
        <p className="intro">
          This notice applies to the LiftIt public beta. It was last updated on
          14 September 2026.
        </p>

        <section>
          <h2>Who this service is for</h2>
          <p>
            LiftIt is a UK-first service for people aged 16 and over. It is not
            designed for children under 16. Registration is open, but you must
            confirm that you meet this age requirement during onboarding.
          </p>
        </section>

        <section>
          <h2>Information we collect</h2>
          <p>
            We collect your email address, authentication records, preferred
            name, weekly workout goal, unit preference and account timestamps.
            We also store the routines, exercises, sets, weights, repetitions,
            rest settings and workout history that you choose to record. Height
            and body weight are optional.
          </p>
          <p>
            Basic technical and security logs may include timestamps, browser
            request details and IP addresses. LiftIt does not use advertising
            analytics and does not sell personal information.
          </p>
        </section>

        <section>
          <h2>Why we use it</h2>
          <p>
            Account and operational information is used to create and secure
            your account, deliver the service, send required account messages,
            answer support requests and prevent abuse. This processing is
            necessary to provide the service you request and for our legitimate
            interests in keeping it reliable and secure.
          </p>
          <p>
            Workout and optional body information can reveal information about
            health. Where it qualifies as special-category data, we rely on your
            explicit consent under UK GDPR Article 9(2)(a). The onboarding box
            is unticked by default and the consent time and notice version are
            recorded. You can withdraw consent at any time, although LiftIt
            cannot provide its workout-tracking service without storing workout
            data. Withdrawal does not affect earlier lawful processing.
          </p>
        </section>

        <section>
          <h2>Service providers</h2>
          <p>
            Supabase processes authentication and database information. Vercel
            hosts and delivers the website. Resend delivers account email and
            receives messages sent to the support address. These providers act
            as processors for the service and may process necessary technical
            logs under their own security and retention controls.
          </p>
        </section>

        <section>
          <h2>Retention and deletion</h2>
          <p>
            We keep account and workout information while your account is active
            or as needed to provide the beta, meet legal obligations, resolve
            disputes and protect the service. To delete your account, email
            <a href="mailto:support@lift-it.site"> support@lift-it.site</a> from
            your registered address. We verify the request, delete the Supabase
            Auth user and allow the linked application data to cascade-delete.
            Processor backups and security logs expire under the relevant
            provider retention schedules.
          </p>
        </section>

        <section>
          <h2>Security</h2>
          <p>
            LiftIt uses TLS in transit, Supabase-managed encryption at rest, Row
            Level Security and scoped database functions. Passwords are handled
            by Supabase Auth and are not stored in LiftIt profile tables. Access
            is limited to the service configuration and providers needed to run
            the beta. No internet service can promise absolute security.
          </p>
        </section>

        <section>
          <h2>Your rights</h2>
          <p>
            Depending on the circumstances, UK data-protection law may give you
            rights to access, correct, erase, restrict or receive your personal
            information, object to processing, and withdraw consent. Contact
            <a href="mailto:support@lift-it.site"> support@lift-it.site</a> from
            your registered address to make a request. You may also complain to
            the UK Information Commissioner&apos;s Office.
          </p>
        </section>

        <section>
          <h2>Contact</h2>
          <p>
            Questions, rights requests, consent withdrawal and verified account
            deletion requests can be sent to
            <a href="mailto:support@lift-it.site"> support@lift-it.site</a>.
          </p>
        </section>
      </main>
      <footer className="public-footer compact-public-footer">
        <p>LiftIt public beta</p>
        <Link to="/">Home</Link>
      </footer>
    </div>
  )
}
