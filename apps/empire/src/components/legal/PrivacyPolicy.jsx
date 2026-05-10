import React from 'react';
import LegalModal from './LegalModal';

const Section = ({ title, children }) => (
  <>
    <h3 className="text-[11px] tracking-[0.2em] uppercase text-cyan-400/70 font-bold mt-6 mb-2">
      {title}
    </h3>
    {children}
  </>
);

const P = ({ children }) => (
  <p className="text-[10px] text-[#E8E0D0]/70 leading-relaxed mb-3">{children}</p>
);

const PrivacyPolicy = ({ onClose }) => {
  return (
    <LegalModal onClose={onClose} title="Privacy Policy">
      <P>
        This Privacy Policy explains how AEGIS Empire ("we", "us", "our") collects, uses, and
        protects your personal information when you use our platform.
      </P>

      <Section title="Data We Collect">
        <P>
          We collect the following information: email address, display name, gameplay telemetry
          (trades, progress, achievements), and device information (browser type, operating system,
          screen resolution).
        </P>
      </Section>

      <Section title="How We Use Data">
        <P>
          Your data is used for account management and authentication, game progress
          synchronisation across devices, analytics to improve the platform experience, and
          personalising educational content delivery.
        </P>
      </Section>

      <Section title="Third-Party Services">
        <P>
          We use the following third-party services: Supabase (database and authentication), Stripe
          (payment processing for subscriptions and purchases), Sentry (error tracking and
          performance monitoring), and AdMob (advertising on mobile platforms). Each service has its
          own privacy policy governing how your data is handled.
        </P>
      </Section>

      <Section title="Data Storage">
        <P>
          Your data is stored securely on Supabase cloud infrastructure. We also use localStorage on
          your device for offline game state persistence and faster load times. You can clear
          localStorage at any time through your browser settings.
        </P>
      </Section>

      <Section title="Your Rights (GDPR)">
        <P>
          Under the General Data Protection Regulation, you have the right to: access your personal
          data, rectify inaccurate data, request deletion of your data, export your data in a
          portable format, and withdraw consent for data processing at any time. To exercise any of
          these rights, contact us at the email below.
        </P>
      </Section>

      <Section title="Data Retention">
        <P>
          We retain your account data for as long as your account is active. Upon account deletion,
          all personal data is permanently removed from our systems within 30 days.
        </P>
      </Section>

      <Section title="Cookies">
        <P>
          We use localStorage to persist game state and preferences. Optional analytics cookies may
          be used with your explicit consent. You can manage cookie preferences at any time through
          the cookie consent banner.
        </P>
      </Section>

      <Section title="Children">
        <P>
          AEGIS Empire is not intended for use by individuals under the age of 13. We do not
          knowingly collect personal information from children under 13. If you believe a child has
          provided us with personal data, please contact us immediately.
        </P>
      </Section>

      <Section title="Contact">
        <P>
          For privacy-related inquiries, contact us at support@aegis-empire.com.
        </P>
      </Section>

      <p className="text-[9px] text-[#9C8E7E] mt-6 mb-2">Last updated: April 2026</p>
    </LegalModal>
  );
};

export default PrivacyPolicy;
