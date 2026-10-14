import { useEffect } from 'react';
import type { Thought } from '../../shared/api';
import { activateOnKey } from './helpers';
import { EyeSlashIcon, FlagIcon, PersonIcon, TrashIcon } from './icons';

type OptionsSheetProps = {
  thought: Thought | null;
  isMine: boolean;
  onClose: () => void;
  onViewProfile: (thought: Thought) => void;
  onHide: (thought: Thought) => void;
  onReport: (thought: Thought) => void;
  onDelete: (thought: Thought) => void;
};

export const OptionsSheet = ({
  thought,
  isMine,
  onClose,
  onViewProfile,
  onHide,
  onReport,
  onDelete,
}: OptionsSheetProps) => {
  useEffect(() => {
    if (!thought) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [thought, onClose]);

  if (!thought) return null;

  return (
    <div
      className="scrim menu-scrim open"
      role="dialog"
      aria-modal="true"
      aria-label="Thought options"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="sheet" onClick={(event) => event.stopPropagation()}>
        <div className="grab" />
        <div className="menu-items">
          {isMine ? (
            <button
              type="button"
              className="menu-item danger"
              onClick={() => onDelete(thought)}
              onKeyDown={(event) => activateOnKey(event, () => onDelete(thought))}
            >
              <TrashIcon />
              Delete
            </button>
          ) : (
            <>
              <button
                type="button"
                className="menu-item"
                onClick={() => onViewProfile(thought)}
              >
                <PersonIcon />
                View profile
              </button>
              <button type="button" className="menu-item" onClick={() => onHide(thought)}>
                <EyeSlashIcon />
                Hide this thought
              </button>
              <button
                type="button"
                className="menu-item danger"
                onClick={() => onReport(thought)}
              >
                <FlagIcon />
                Report
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
