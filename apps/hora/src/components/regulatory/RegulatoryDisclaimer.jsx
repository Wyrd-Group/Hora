// ============================================================================
// RegulatoryDisclaimer — three variants: compact, lesson, cover
// ============================================================================
// Use compact inline next to specific values pulled from jurisdictional_facts.
// Use lesson at the top of any lesson that contains jurisdictional content.
// Use cover on public distributions (PDF cover, "About this curriculum" page).
// ============================================================================

import React from 'react';
import { formatVerifiedDate } from '../../lib/regulatory/factStore';

/**
 * Compact inline disclaimer. Shown next to or under a single regulated value.
 *
 * Props:
 *   country           – ISO 2-letter country code, e.g. 'FR'
 *   authority         – "HMRC", "IRS", "impots.gouv.fr"
 *   sourceUrl         – canonical source URL
 *   lastVerifiedAt    – ISO timestamp
 */
export function RegulatoryDisclaimerCompact({
  country,
  authority,
  sourceUrl,
  lastVerifiedAt,
}) {
  return (
    <div
      className="text-xs text-stone-400 italic flex flex-wrap items-center gap-1 mt-1"
      role="note"
      aria-label="Regulatory source information"
    >
      <span aria-hidden>🔄</span>
      <span>
        Updated <time dateTime={lastVerifiedAt ?? undefined}>{formatVerifiedDate(lastVerifiedAt)}</time>
      </span>
      {authority && (
        <>
          <span>·</span>
          {sourceUrl ? (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-amber-300"
            >
              {authority}
            </a>
          ) : (
            <span>{authority}</span>
          )}
        </>
      )}
      {country && (
        <>
          <span>·</span>
          <span>Verify with your {country} tax authority before acting.</span>
        </>
      )}
    </div>
  );
}

/**
 * Lesson-level regulatory notice. Renders as a callout at the top of any
 * lesson whose content includes jurisdictional_facts interpolations.
 *
 * Props:
 *   country           – user's active country
 *   factsCount        – number of live-verified facts used in this lesson
 *   newestFetchedAt   – ISO timestamp of most recent verification
 */
export function RegulatoryDisclaimerLesson({
  country,
  factsCount,
  newestFetchedAt,
}) {
  return (
    <aside
      className="card-glass border-l-4 border-amber-400/70 rounded-lg px-4 py-3 my-4"
      role="note"
      aria-label="Regulatory information notice"
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl leading-none" aria-hidden>⚖️</div>
        <div className="flex-1 text-sm">
          <h4 className="font-semibold text-amber-200 mb-1">Regulatory Information Notice</h4>
          <p className="text-stone-300 leading-relaxed">
            Tax rates, contribution limits, and regulatory details in this lesson are
            {' '}<strong>updated automatically</strong> from official {country ?? 'national'} government
            and regulator sources. While we aim for accuracy,{' '}
            <strong>automated research can err and laws change</strong>.
          </p>
          <p className="text-stone-300 leading-relaxed mt-1">
            Always verify specific numbers with your national tax authority, or consult
            a licensed professional, before making financial decisions.
          </p>
          <p className="text-xs text-stone-400 italic mt-2">
            {factsCount > 0 && <>This lesson renders <strong>{factsCount}</strong> live-verified value{factsCount === 1 ? '' : 's'}.{' '}</>}
            {newestFetchedAt && <>Last verified: <time dateTime={newestFetchedAt}>{formatVerifiedDate(newestFetchedAt)}</time>.</>}
          </p>
        </div>
      </div>
    </aside>
  );
}

/**
 * Cover-page / full legal disclaimer. Used on PDF cover, "About" modal,
 * onboarding flow.
 */
export function RegulatoryDisclaimerCover({ generationDate }) {
  return (
    <section
      className="card-glass rounded-lg p-6 my-6 border border-amber-400/30"
      role="note"
      aria-label="Full regulatory disclaimer"
    >
      <h3 className="text-lg font-semibold text-amber-200 mb-3 flex items-center gap-2">
        <span aria-hidden>⚖️</span> Regulatory Information Disclaimer
      </h3>
      <div className="space-y-3 text-sm text-stone-300 leading-relaxed">
        <p>
          This curriculum contains jurisdiction-specific information (tax rates,
          contribution limits, regulatory thresholds) updated as of{' '}
          <strong>{formatVerifiedDate(generationDate)}</strong>. Content is provided
          for <strong>educational purposes only</strong> and does not constitute financial,
          tax, or legal advice.
        </p>
        <p>
          Jurisdictional figures are maintained by an automated research system that
          periodically fetches official government and regulator sources. Every value
          is reviewed by a human before publication. However:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Automated research can err.</strong> Extraction from source documents may contain transcription or interpretation mistakes.</li>
          <li><strong>Laws change.</strong> Specific figures may have been updated after our last review cycle.</li>
          <li><strong>Your situation is unique.</strong> Personal circumstances, residency rules, and filing status affect what actually applies to you.</li>
        </ul>
        <p className="pt-2 border-t border-stone-700/50">
          <strong>Always verify all specific numbers</strong> (tax brackets, contribution
          caps, filing deadlines, contribution limits) with the relevant national
          authority or a licensed financial, tax, or legal professional before
          making decisions based on this material. No warranty is made as to
          accuracy, timeliness, or completeness.
        </p>
      </div>
    </section>
  );
}

export default {
  Compact: RegulatoryDisclaimerCompact,
  Lesson: RegulatoryDisclaimerLesson,
  Cover: RegulatoryDisclaimerCover,
};
