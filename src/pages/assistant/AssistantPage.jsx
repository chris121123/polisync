import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Info, Loader2, Plus, Send, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { useGlobalState } from '../../context/GlobalStateContext';
import { getThreadMessages, listThreads, sendAssistantMessage } from '../../lib/ai/client.js';

const fieldClass = 'w-full min-h-11 border border-[var(--sa-line-default)] bg-[var(--sa-bg-base)] px-3 py-2.5 text-sm text-[var(--sa-text-primary)] placeholder:text-[var(--sa-text-subtle)] focus:border-[var(--sa-gold)]';

const SUGGESTIONS = [
  'What is scheduled this week?',
  'How many students are enrolled?',
];

const clock = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

const AssistantPage = () => {
  const { appRole } = useGlobalState();
  const location = useLocation();

  const [threads, setThreads] = useState({ status: 'loading', items: [], error: null });
  const [messages, setMessages] = useState({ status: 'idle', items: [], error: null });
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [activeTitle, setActiveTitle] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [configMissing, setConfigMissing] = useState(false);
  const listRef = useRef(null);
  const requestRef = useRef(0);

  const loadThreads = useCallback(async () => {
    setThreads((prev) => ({ ...prev, status: prev.items.length ? 'ready' : 'loading' }));
    const { data, error } = await listThreads();
    setThreads({ status: error ? 'error' : 'ready', items: data?.threads ?? [], error: error ?? null });
  }, []);

  useEffect(() => {
    // Deferred like GlobalSearch's reset: the first paint lands, then the fetch starts.
    queueMicrotask(() => loadThreads());
  }, [loadThreads]);

  useEffect(() => {
    // Scroll the message box only: the page itself must not jump on load or reply.
    const node = listRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages.items.length, sending]);

  const openThread = async (thread) => {
    const token = requestRef.current + 1;
    requestRef.current = token;
    setActiveThreadId(thread.id);
    setActiveTitle(thread.title || '');
    setConfigMissing(false);
    setSendError(null);
    setMessages({ status: 'loading', items: [], error: null });
    const { data, error } = await getThreadMessages(thread.id);
    if (requestRef.current !== token) return;
    if (error) {
      setMessages({ status: 'error', items: [], error });
      return;
    }
    setMessages({ status: 'ready', items: data?.messages ?? [], error: null });
  };

  const startNewChat = () => {
    requestRef.current += 1;
    setActiveThreadId(null);
    setActiveTitle('');
    setMessages({ status: 'idle', items: [], error: null });
    setDraft('');
    setSendError(null);
    setConfigMissing(false);
  };

  const send = async () => {
    const text = draft.trim();
    if (!text || sending || configMissing) return;
    const optimistic = {
      id: `local-${Date.now()}`,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => ({ ...prev, status: 'ready', items: [...prev.items, optimistic] }));
    setDraft('');
    setSendError(null);
    setSending(true);
    const { data, error } = await sendAssistantMessage({
      threadId: activeThreadId,
      message: text,
      context: { route: location.pathname },
    });
    setSending(false);
    if (error) {
      setMessages((prev) => ({ ...prev, items: prev.items.filter((m) => m.id !== optimistic.id) }));
      // Nothing lost: the text goes back into the composer unless it was retyped.
      setDraft((current) => current || text);
      if (error.code === 'CONFIG_MISSING') setConfigMissing(true);
      else setSendError(error);
      return;
    }
    setMessages((prev) => ({
      status: 'ready',
      error: null,
      items: [
        ...prev.items.filter((m) => m.id !== optimistic.id),
        { ...optimistic, id: `sent-${Date.now()}` },
        { id: `reply-${Date.now()}`, role: 'assistant', content: data.reply, created_at: new Date().toISOString() },
      ],
    }));
    setActiveThreadId(data.threadId);
    loadThreads();
  };

  const composerDisabled = configMissing || sending;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 lg:space-y-8 animate-page-entry">
      <div className="pb-4 sa-rule-b">
        <h1 className="sa-title">AI Assistant</h1>
        <p className="sa-sub">Ask about the schedule, staff, students, and rooms.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        {/* Threads: chips above the chat at 390, a borderless rail from lg */}
        <section className="min-w-0 lg:pt-1" aria-label="Chat threads">
          <div className="flex items-center justify-between gap-2">
            <p className="sa-micro">Threads</p>
            <button type="button" onClick={startNewChat} className="sa-link min-h-11 px-2 lg:min-h-0 lg:py-1">
              <Plus size={12} strokeWidth={1.5} />
              <span>New chat</span>
            </button>
          </div>

          {threads.status === 'loading' ? (
            <div className="flex min-h-11 items-center gap-2 py-2">
              <Loader2 size={14} className="animate-spin sa-t-muted" />
              <span className="text-[11px] text-[var(--sa-text-muted)]">Loading chats…</span>
            </div>
          ) : threads.status === 'error' ? (
            <div className="mt-2 flex items-start gap-2">
              <AlertTriangle size={14} strokeWidth={1.5} className="mt-0.5 shrink-0 sa-t-danger" />
              <div className="min-w-0">
                <p className="sa-mono">{threads.error?.code}</p>
                <p className="text-[11px] text-[var(--sa-text-muted)]">Chat history could not be loaded.</p>
                <button type="button" onClick={loadThreads} className="sa-link mt-1 min-h-11 py-1">Try again</button>
              </div>
            </div>
          ) : threads.items.length === 0 ? (
            <p className="mt-2 text-[11px] text-[var(--sa-text-muted)]">No saved chats yet.</p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-2 lg:block lg:max-h-[28rem] lg:overflow-y-auto">
              {threads.items.map((thread) => {
                const active = thread.id === activeThreadId;
                return (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => openThread(thread)}
                    aria-pressed={active}
                    className={clsx(
                      'flex min-h-11 min-w-0 max-w-full items-center border px-3 text-left text-[13px] lg:mt-1 lg:w-full',
                      active
                        ? 'border-[var(--sa-gold)] text-[var(--sa-text-primary)]'
                        : 'border-[var(--sa-line-default)] text-[var(--sa-text-secondary)] hover:border-[var(--sa-line-strong)] hover:text-[var(--sa-text-primary)]'
                    )}
                  >
                    <span className="truncate">{thread.title || 'Untitled chat'}</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="sa-panel flex min-w-0 flex-col" aria-label="Conversation">
          <div className="sa-panel-head">
            <div className="min-w-0">
              <h2 className="sa-panel-title truncate">{activeThreadId ? (activeTitle || 'Conversation') : 'New chat'}</h2>
              <p className="sa-panel-sub">Read-only answers from a dated snapshot.</p>
            </div>
            <span className="sa-badge">Read-only</span>
          </div>

          <div ref={listRef} className="mt-3 max-h-[55vh] min-h-[16rem] overflow-y-auto pr-1" aria-live="polite">
            {messages.status === 'loading' ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 size={18} className="animate-spin sa-t-muted" />
              </div>
            ) : messages.status === 'error' ? (
              <div className="sa-alert sa-alert--danger" role="alert">
                <AlertTriangle size={16} strokeWidth={1.5} className="mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="sa-mono">{messages.error?.code}</p>
                  <p className="mt-0.5 break-words">{messages.error?.message}</p>
                  <button
                    type="button"
                    onClick={() => {
                      const thread = threads.items.find((t) => t.id === activeThreadId);
                      if (thread) openThread(thread);
                    }}
                    className="sa-link mt-2 min-h-11 py-1"
                  >
                    Try again
                  </button>
                </div>
              </div>
            ) : messages.items.length === 0 ? (
              <div className="sa-empty">
                <Sparkles size={20} strokeWidth={1.5} className="mx-auto mb-2 sa-t-muted" />
                <p className="sa-empty-title">Ask about the schedule, staff, students, and rooms.</p>
                <p className="sa-empty-sub">The assistant never changes data — it answers and points you to the right page.</p>
                {!configMissing && (
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    {SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => setDraft(suggestion)}
                        className="min-h-11 border border-[var(--sa-line-default)] px-3 text-[13px] text-[var(--sa-text-secondary)] transition-colors hover:border-[var(--sa-line-strong)] hover:text-[var(--sa-text-primary)]"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4 py-1">
                {messages.items.map((message) => {
                  const isUser = message.role === 'user';
                  return (
                    <div key={message.id} className={clsx('flex flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
                      <div
                        className={clsx(
                          'max-w-[85%] whitespace-pre-wrap break-words px-3 py-2 text-sm',
                          isUser
                            ? 'border border-[var(--sa-line-default)] bg-[var(--sa-surface-warm)] text-[var(--sa-text-primary)]'
                            : 'text-[var(--sa-text-secondary)]'
                        )}
                      >
                        {message.content}
                      </div>
                      <span className="sa-mono">{clock(message.created_at)}</span>
                    </div>
                  );
                })}
                {sending && (
                  <div className="flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin sa-t-muted" />
                    <span className="text-[11px] text-[var(--sa-text-muted)]">Thinking…</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 border-t border-[var(--sa-line-hairline)] pt-3">
            {configMissing && (
              <div className="sa-alert mb-3" role="status">
                <Info size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-[var(--sa-text-muted)]" />
                <div className="min-w-0">
                  <p className="text-[13px] text-[var(--sa-text-primary)]">
                    {appRole === 'superadmin'
                      ? 'AI is not set up yet — open AI Provider.'
                      : 'Ask your IT Manager to enable the assistant.'}
                  </p>
                  {appRole === 'superadmin' && (
                    <Link to="/admin/ai" className="sa-link mt-1 min-h-11 py-1">
                      AI Provider <ArrowRight size={12} strokeWidth={1.5} />
                    </Link>
                  )}
                </div>
              </div>
            )}

            {sendError && (
              <div className="sa-alert sa-alert--danger mb-3" role="alert">
                <AlertTriangle size={16} strokeWidth={1.5} className="mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="sa-mono">{sendError.code}</p>
                  <p className="mt-0.5 break-words">{sendError.message}</p>
                </div>
              </div>
            )}

            <label htmlFor="assistant-message" className="sr-only">Message</label>
            <textarea
              id="assistant-message"
              rows={3}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              disabled={composerDisabled}
              placeholder={configMissing ? 'The assistant is not available yet.' : 'Ask about the schedule, staff, students, or rooms…'}
              className={`${fieldClass} resize-none disabled:cursor-not-allowed disabled:opacity-60`}
            />

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] text-[var(--sa-text-muted)]">Enter to send · Shift+Enter for a new line</p>
              <button
                type="button"
                onClick={send}
                disabled={composerDisabled || !draft.trim()}
                className="sa-btn sa-btn--primary min-h-11 justify-center disabled:cursor-not-allowed disabled:opacity-40"
              >
                {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} strokeWidth={1.5} />}
                <span>{sending ? 'Sending…' : 'Send'}</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AssistantPage;
