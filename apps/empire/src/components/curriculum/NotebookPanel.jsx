import React, { useState, useMemo } from 'react';
import { useCurriculumStore } from '../../store/curriculumStore';
import { courses } from '../../data/courses';

/**
 * NotebookPanel — Student notes per lesson, search, delete.
 */

// Build a quick lookup: lessonId → { lessonTitle, courseTitle }
const lessonMeta = {};
for (const c of courses) {
  for (const l of c.lessons) {
    lessonMeta[l.id] = { lessonTitle: l.title, courseTitle: c.title };
  }
}

export default function NotebookPanel() {
  const { notebook, addNotebookEntry, removeNotebookEntry, currentCourseId } = useCurriculumStore();
  const [search, setSearch] = useState('');
  const [newNote, setNewNote] = useState('');
  const [addingFor, setAddingFor] = useState(''); // lessonId to add note for

  const filtered = useMemo(() => {
    if (!search.trim()) return [...notebook].reverse();
    const q = search.toLowerCase();
    return [...notebook]
      .reverse()
      .filter(n => n.text.toLowerCase().includes(q) || (lessonMeta[n.lessonId]?.lessonTitle ?? '').toLowerCase().includes(q));
  }, [notebook, search]);

  const handleAdd = () => {
    if (!newNote.trim() || !addingFor) return;
    addNotebookEntry(addingFor, newNote.trim());
    setNewNote('');
    setAddingFor('');
  };

  // Get all available lessons for the "add note" dropdown
  const allLessons = useMemo(() => {
    const list = [];
    for (const c of courses) {
      for (const l of c.lessons) {
        list.push({ id: l.id, label: `${c.title} → ${l.title}` });
      }
    }
    return list;
  }, []);

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-4 md:p-6">
      {/* Search */}
      <div className="flex gap-2 mb-4 shrink-0">
        <input
          type="text"
          placeholder="Search notes..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 max-w-md bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2 text-xs font-mono text-tactical-text placeholder:text-tactical-text/30 focus:outline-none focus:border-[#00e5ff]/40"
        />
        <span className="text-[10px] font-mono text-tactical-text/30 self-center">{notebook.length} notes</span>
      </div>

      {/* Add note form */}
      <div className="shrink-0 mb-4 border border-white/[0.06] rounded-lg bg-white/[0.02] p-3">
        <p className="text-[10px] font-mono text-tactical-text/40 mb-2 tracking-widest">ADD A NOTE</p>
        <select
          value={addingFor}
          onChange={e => setAddingFor(e.target.value)}
          className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1.5 text-[11px] font-mono text-tactical-text/70 mb-2 focus:outline-none focus:border-[#00e5ff]/30"
        >
          <option value="">Select a lesson...</option>
          {allLessons.map(l => (
            <option key={l.id} value={l.id}>{l.label}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <textarea
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
            placeholder="Write your note..."
            rows={2}
            className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-[11px] font-mono text-tactical-text placeholder:text-tactical-text/20 resize-none focus:outline-none focus:border-[#00e5ff]/30"
          />
          <button
            onClick={handleAdd}
            disabled={!newNote.trim() || !addingFor}
            className="px-4 py-2 rounded-lg bg-[#00e5ff]/20 text-[#00e5ff] text-[11px] font-mono font-bold hover:bg-[#00e5ff]/30 transition-all disabled:opacity-30 self-end"
          >
            Save
          </button>
        </div>
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {filtered.length === 0 && (
          <p className="text-xs font-mono text-tactical-text/30 py-8 text-center">
            {notebook.length === 0 ? 'No notes yet. Add your first note above.' : 'No matching notes.'}
          </p>
        )}
        {filtered.map(note => {
          const meta = lessonMeta[note.lessonId];
          return (
            <div
              key={note.id}
              className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-mono text-[#00e5ff]/60 mb-1 truncate">
                    {meta ? `${meta.courseTitle} → ${meta.lessonTitle}` : note.lessonId}
                  </p>
                  <p className="text-[12px] font-mono text-tactical-text/70 whitespace-pre-wrap">{note.text}</p>
                  <p className="text-[9px] font-mono text-tactical-text/20 mt-1">
                    {new Date(note.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => removeNotebookEntry(note.id)}
                  className="opacity-0 group-hover:opacity-100 text-[#ef4444] text-[10px] font-mono hover:underline transition-opacity shrink-0"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
