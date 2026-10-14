import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { MAX_THOUGHT_LENGTH } from '../../shared/api';
import { CloseIcon, HourglassIcon, SmileIcon } from './icons';

type ComposerModalProps = {
  submitting: boolean;
  subredditName: string;
  showEducation: boolean;
  onClose: (event?: MouseEvent) => void;
  onSubmit: (text: string) => Promise<void>;
};

export const ComposerModal = ({
  submitting,
  subredditName,
  showEducation,
  onClose,
  onSubmit,
}: ComposerModalProps) => {
  const [text, setText] = useState('');
  const [closing, setClosing] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);

  const requestClose = useCallback(
    (event?: MouseEvent) => {
      if (closing) return;
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduceMotion || event) {
        onClose(event);
        return;
      }
      setClosing(true);
      window.setTimeout(() => onClose(), 200);
    },
    [closing, onClose],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => fieldRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') requestClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [requestClose]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const fit = () => {
      const sheet = sheetRef.current;
      if (!sheet) return;
      const keyboardUp = window.innerHeight - viewport.height > 100;
      sheet.style.maxHeight = keyboardUp ? `${Math.max(160, viewport.height - 24)}px` : '';
    };

    viewport.addEventListener('resize', fit);
    return () => viewport.removeEventListener('resize', fit);
  }, []);

  const count = text.length;
  const canPost = text.trim().length > 0 && !submitting;
  const community = subredditName || 'community';

  return (
    <div
      className={`scrim composer-scrim open${closing ? ' closing' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Share a thought"
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose(event);
      }}
    >
      <div className="sheet" ref={sheetRef} onClick={(event) => event.stopPropagation()}>
        <div className="sheet-head">
          <button type="button" className="sheet-close" aria-label="Close" onClick={requestClose}>
            <CloseIcon />
          </button>
          <div className="composer-title">Share a thought</div>
          <button
            type="button"
            className="btn-primary"
            disabled={!canPost}
            onClick={() => onSubmit(text.trim())}
          >
            {submitting ? 'Posting…' : 'Post'}
          </button>
        </div>

        <div className="comm-pill">
          <span className="rico">{community.slice(0, 1).toUpperCase()}</span>
          r/{community}
        </div>

        <div className="composer-body">
          <textarea
            ref={fieldRef}
            value={text}
            maxLength={MAX_THOUGHT_LENGTH}
            placeholder="What's on your mind?"
            enterKeyHint="done"
            rows={3}
            aria-label={`Your thought (${MAX_THOUGHT_LENGTH} characters max)`}
            onChange={(event) => setText(event.target.value.slice(0, MAX_THOUGHT_LENGTH))}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                fieldRef.current?.blur();
              }
            }}
          />
        </div>

        <div className="composer-foot">
          <span className={`charcount${count >= MAX_THOUGHT_LENGTH - 12 ? ' warn' : ''}`}>
            {count} / {MAX_THOUGHT_LENGTH}
          </span>
          {!showEducation && (
            <span className="composer-ttl">
              <HourglassIcon />
              Lasts 24 hours
            </span>
          )}
        </div>

        {showEducation && (
          <div className="first-notes">
            <div className="fn-row">
              <HourglassIcon />
              Lasts 24 hours.
            </div>
            <div className="fn-row">
              <SmileIcon />
              People can react, but not comment.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
