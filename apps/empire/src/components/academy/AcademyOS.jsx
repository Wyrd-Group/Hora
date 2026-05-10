import React from 'react';
import CurriculumShell from '../curriculum/CurriculumShell';

/**
 * AcademyOS — now delegates entirely to the new CurriculumShell.
 * Preserves the same outer chrome (CRT overlay, backdrop) so App.jsx needs no changes.
 */
export default function AcademyOS() {
  return (
    <div className="fixed inset-0 pt-24 md:pt-28 z-20 backdrop-blur-xl bg-[#060a12]/95 flex flex-col">
      {/* CRT scanline overlay */}
      <div className="pointer-events-none fixed inset-0 z-50 opacity-[0.03]" style={{
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.08) 2px, rgba(255,255,255,0.08) 4px)',
      }} />
      <CurriculumShell />
    </div>
  );
}
