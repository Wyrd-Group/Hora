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

const TermsOfService = ({ onClose }) => {
  return (
    <LegalModal onClose={onClose} title="Terms of Service">
      <P>
        Please read these Terms of Service carefully before using AEGIS Empire. By accessing or
        using the platform, you agree to be bound by these terms.
      </P>

      <Section title="Acceptance">
        <P>
          By using AEGIS Empire, you agree to these Terms of Service and our Privacy Policy. If you
          do not agree, you must not use the platform.
        </P>
      </Section>

      <Section title="The Service">
        <P>
          AEGIS Empire is an educational finance simulation platform. It is designed for learning
          purposes only and does not constitute real trading, real financial advice, or real
          investment activity of any kind.
        </P>
      </Section>

      <Section title="Accounts">
        <P>
          You may create one account per person. You are responsible for maintaining the
          confidentiality of your login credentials and for all activity that occurs under your
          account.
        </P>
      </Section>

      <Section title="Virtual Currency">
        <P>
          Aegis Points (AP) and all other virtual currencies within AEGIS Empire have no real-world
          monetary value. Virtual currency purchases are non-refundable except as required by
          applicable law.
        </P>
      </Section>

      <Section title="Subscriptions">
        <P>
          Subscription plans auto-renew at the end of each billing cycle unless cancelled. You may
          cancel your subscription at any time. Subscriptions are managed via Stripe. Refund
          eligibility is subject to applicable consumer protection laws.
        </P>
      </Section>

      <Section title="Prohibited Conduct">
        <P>
          You agree not to: cheat or manipulate game systems, exploit bugs or vulnerabilities
          (report them instead), harass, abuse, or threaten other users, reverse engineer,
          decompile, or disassemble any part of the platform, or use automated tools or bots to
          interact with the service.
        </P>
      </Section>

      <Section title="Intellectual Property">
        <P>
          All content, code, designs, graphics, and educational materials on AEGIS Empire are owned
          by Quadratic and protected by intellectual property laws. You may not reproduce,
          distribute, or create derivative works without explicit written permission.
        </P>
      </Section>

      <Section title="Disclaimers">
        <P>
          AEGIS Empire is provided "as is" and "as available" without warranties of any kind, either
          express or implied. We do not guarantee uninterrupted access to the service.
        </P>
      </Section>

      <Section title="Limitation of Liability">
        <P>
          AEGIS Empire and its operators are not liable for any losses, damages, or decisions arising
          from your use of the simulated trading environment. The platform is for educational
          purposes only.
        </P>
      </Section>

      <Section title="Termination">
        <P>
          We reserve the right to suspend or terminate your account at any time for violations of
          these terms, abuse of the platform, or any conduct we deem harmful to the community.
        </P>
      </Section>

      <Section title="Changes">
        <P>
          We may update these Terms of Service from time to time. Continued use of the platform
          after changes are posted constitutes your acceptance of the revised terms.
        </P>
      </Section>

      <Section title="Governing Law">
        <P>
          These terms shall be governed by and construed in accordance with the laws of the
          jurisdiction in which the operator is established. Any disputes shall be resolved in the
          competent courts of that jurisdiction.
        </P>
      </Section>

      <Section title="Contact">
        <P>
          For questions about these terms, contact us at support@aegis-empire.com.
        </P>
      </Section>

      <p className="text-[9px] text-[#9C8E7E] mt-6 mb-2">Last updated: April 2026</p>
    </LegalModal>
  );
};

export default TermsOfService;
