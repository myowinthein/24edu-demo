'use client';

import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { SessionMode } from '@/lib/types';
import { MODELS, type ModelId } from '../constants';
import { toolbarBtnStyle, popoverItemStyle } from '@/lib/ui-styles';

interface ChatInputProps {
  inputText: string;
  isLoading: boolean;
  selectedModel: ModelId;
  mode: SessionMode;
  textareaRef: RefObject<HTMLTextAreaElement>;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onRequestHuman: () => void;
  onSwitchToAI: () => void;
  onModelSelect: (model: ModelId) => void;
}


export function ChatInput({
  inputText,
  isLoading,
  selectedModel,
  mode,
  textareaRef,
  onInputChange,
  onSend,
  onRequestHuman,
  onSwitchToAI,
  onModelSelect,
}: ChatInputProps) {
  const [openPopover, setOpenPopover] = useState<'actions' | 'model' | null>(null);
  const actionsContainerRef = useRef<HTMLDivElement>(null);
  const modelContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openPopover) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (openPopover === 'actions' && !actionsContainerRef.current?.contains(target)) {
        setOpenPopover(null);
      }
      if (openPopover === 'model' && !modelContainerRef.current?.contains(target)) {
        setOpenPopover(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openPopover]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onInputChange(e.target.value);
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  };

  const handleRequestHuman = () => {
    setOpenPopover(null);
    onRequestHuman();
  };

  const handleSwitchToAI = () => {
    setOpenPopover(null);
    onSwitchToAI();
  };

  return (
    <div
      style={{
        flexShrink: 0,
        borderTop: '1px solid #e3e3e6',
        padding: '12px 20px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <textarea
          ref={textareaRef}
          placeholder="Message… (Enter to send, Shift+Enter for new line)"
          value={inputText}
          onChange={handleChange}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          disabled={isLoading}
          rows={1}
          style={{
            flex: 1,
            padding: '10px 14px',
            fontSize: 15,
            border: '1px solid #d1d5db',
            borderRadius: 8,
            outline: 'none',
            resize: 'none',
            fontFamily: 'inherit',
            lineHeight: 1.5,
            minHeight: 42,
            maxHeight: 120,
            overflowY: 'auto',
            color: '#14151a',
            background: '#ffffff',
          }}
        />
        <button
          onClick={onSend}
          disabled={isLoading || !inputText.trim()}
          style={{
            padding: '0 18px',
            fontSize: 14,
            fontWeight: 500,
            background: '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: 8,
            cursor: isLoading || !inputText.trim() ? 'not-allowed' : 'pointer',
            opacity: isLoading || !inputText.trim() ? 0.6 : 1,
            flexShrink: 0,
            height: 42,
          }}
        >
          Send
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div ref={actionsContainerRef} style={{ position: 'relative' }}>
          {openPopover === 'actions' && (
            <div
              style={{
                position: 'absolute',
                bottom: 'calc(100% + 8px)',
                left: 0,
                background: '#ffffff',
                border: '1px solid #e3e3e6',
                borderRadius: 10,
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                minWidth: 210,
                padding: 6,
                zIndex: 20,
              }}
            >
              {mode === 'ai' && (
                <button onClick={handleRequestHuman} style={popoverItemStyle}>
                  💬 Talk to a human
                </button>
              )}
              {(mode === 'requested' || mode === 'human') && (
                <button onClick={handleSwitchToAI} style={popoverItemStyle}>
                  🤖 Switch back to AI
                </button>
              )}
            </div>
          )}
          <button
            onClick={() => setOpenPopover((p) => (p === 'actions' ? null : 'actions'))}
            style={{
              ...toolbarBtnStyle,
              borderColor: openPopover === 'actions' ? '#6b7280' : '#d1d5db',
              color: openPopover === 'actions' ? '#14151a' : '#6b7280',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            Actions
          </button>
        </div>

        <div ref={modelContainerRef} style={{ position: 'relative' }}>
          {openPopover === 'model' && (
            <div
              style={{
                position: 'absolute',
                bottom: 'calc(100% + 8px)',
                left: 0,
                background: '#ffffff',
                border: '1px solid #e3e3e6',
                borderRadius: 10,
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                minWidth: 230,
                padding: 6,
                zIndex: 20,
              }}
            >
              <div
                style={{
                  padding: '6px 12px 8px',
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#9ca3af',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Model
              </div>
              {MODELS.map((m) => (
                <button
                  key={m}
                  onClick={() => { onModelSelect(m); setOpenPopover(null); }}
                  style={{
                    ...popoverItemStyle,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontWeight: m === selectedModel ? 600 : 400,
                    color: m === selectedModel ? '#2563eb' : '#14151a',
                  }}
                >
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      border: `2px solid ${m === selectedModel ? '#2563eb' : '#d1d5db'}`,
                      background: m === selectedModel ? '#2563eb' : 'transparent',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {m === selectedModel && (
                      <span
                        style={{ width: 5, height: 5, borderRadius: '50%', background: '#ffffff', display: 'block' }}
                      />
                    )}
                  </span>
                  {m}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => setOpenPopover((p) => (p === 'model' ? null : 'model'))}
            style={{
              ...toolbarBtnStyle,
              borderColor: openPopover === 'model' ? '#6b7280' : '#d1d5db',
              color: openPopover === 'model' ? '#14151a' : '#6b7280',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
            </svg>
            {selectedModel}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
