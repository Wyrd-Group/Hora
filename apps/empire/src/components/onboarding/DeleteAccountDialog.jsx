import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';

const DeleteAccountDialog = ({ onClose }) => {
  const deleteAccount = useAuthStore(s => s.deleteAccount);
  const [confirmation, setConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const canDelete = confirmation === 'DELETE';

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleDelete = async () => {
    if (!canDelete) return;
    setDeleting(true);
    setError('');

    const success = await deleteAccount();
    if (success) {
      onClose?.();
    } else {
      setError('Failed to delete account. Please try again or contact support.');
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm flex items-center justify-center font-mono">
      <div className="w-[90vw] max-w-[420px] bg-[#0b1018] border border-rose-500/30 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-5 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-[11px] tracking-[0.2em] uppercase text-rose-400 font-bold">
              Delete Account
            </h2>
            <p className="text-[8px] text-white/25 tracking-wider mt-0.5">
              This action is permanent and cannot be undone
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded border border-white/10 bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all text-xs"
          >
            &#10005;
          </button>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {/* Warning */}
          <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
            <p className="text-[10px] text-rose-300/80 leading-relaxed">
              Deleting your account will permanently remove all your data including:
            </p>
            <ul className="text-[9px] text-rose-300/60 mt-2 space-y-1 ml-3">
              <li>- Game progress, portfolio, and empire state</li>
              <li>- Agent cards, Aegis Points, and Battle Pass progress</li>
              <li>- ECFL certifications and academy history</li>
              <li>- Subscription (if active, will be cancelled)</li>
            </ul>
          </div>

          {/* Confirmation input */}
          <div>
            <label className="text-[9px] text-white/40 tracking-wider uppercase block mb-1.5">
              Type DELETE to confirm
            </label>
            <input
              type="text"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder="DELETE"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-[11px] text-white/80 font-mono tracking-wider placeholder:text-white/15 focus:outline-none focus:border-rose-500/40"
              autoComplete="off"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-[9px] text-rose-400">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2 rounded text-[9px] font-bold tracking-wider uppercase border border-white/10 bg-white/5 text-white/40 hover:bg-white/10 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={!canDelete || deleting}
              className={`flex-1 py-2 rounded text-[9px] font-bold tracking-wider uppercase border transition-all ${
                canDelete && !deleting
                  ? 'border-rose-500/40 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 cursor-pointer'
                  : 'border-white/5 bg-white/[0.02] text-white/20 cursor-not-allowed'
              }`}
            >
              {deleting ? 'Deleting...' : 'Delete Forever'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteAccountDialog;
