import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Loader2, Plus, Send, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { useGlobalState } from '../../context/GlobalStateContext';
import { getThreadMessages, listThreads, sendAssistantMessage } from '../../lib/ai/client.js';
import '../../styles/assistantChat.css';

const SUGGESTIONS = [
  'What is scheduled this week?',
  'How many students are enrolled?',
];

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
    <div className="chat-scope p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 lg:space-y-8 animate-page-entry">
      <h1 className="sa-title">AI Assistant</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:h-[calc(100dvh-11.5rem)]">
        {/* Threads: chips above the chat at 390, a borderless rail from lg */}
        <section className="min-w-0 lg:pt-1" aria-label="Chat threads">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[12px] text-[var(--sa-text-muted)]">Threads</p>
            <button
              type="button"
              onClick={startNewChat}
              className="flex min-h-11 items-center gap-1 rounded-full px-2.5 py-1.5 text-[12px] text-[var(--sa-text-muted)] transition hover:bg-[var(--sa-surface-2)]/50 hover:text-[var(--sa-text-primary)] lg:min-h-9"
            >
              <Plus size={12} strokeWidth={1.5} />
              <span>New chat</span>
            </button>
          </div>

          {threads.status === 'loading' ? (
            <div className="flex min-h-11 items-center gap-2 py-2">
              <Loader2 size={14} className="animate-spin sa-t-muted" />
              <span className="text-[12px] text-[var(--sa-text-muted)]">Loading chats…</span>
            </div>
          ) : threads.status === 'error' ? (
            <div className="mt-2">
              <p className="text-[12px] text-[var(--sa-text-muted)]">Chat history could not be loaded.</p>
              <p className="text-[12px] text-[var(--sa-text-muted)]">{threads.error?.code}</p>
              <button type="button" onClick={loadThreads} className="sa-link min-h-11 text-[12px]">Try again</button>
            </div>
          ) : threads.items.length === 0 ? (
            <p className="mt-2 text-[12px] text-[var(--sa-text-muted)]">No saved chats yet.</p>
          ) : (
            <div className="mt-2 flex flex-wrap max-sm:flex-nowrap max-sm:overflow-x-auto gap-2 lg:block lg:max-h-[28rem] lg:overflow-y-auto">
              {threads.items.map((thread) => {
                const active = thread.id === activeThreadId;
                return (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => openThread(thread)}
                    aria-pressed={active}
                    className={clsx(
                      'flex min-h-11 min-w-0 max-w-full max-sm:shrink-0 max-sm:max-w-[15rem] self-start items-center rounded-xl px-3 py-2.5 text-left text-[13px] transition hover:bg-[var(--sa-surface-2)]/50 lg:mt-0.5 lg:w-full',
                      active
                        ? 'bg-[var(--sa-surface-warm)] font-medium text-[var(--sa-text-primary)]'
                        : 'text-[var(--sa-text-secondary)]'
                    )}
                  >
                    <span className="truncate">{thread.title || 'Untitled chat'}</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="flex min-w-0 flex-col rounded-xl bg-[var(--sa-surface-1)] lg:min-h-0" aria-label="Conversation">
          {activeThreadId && <h2 className="sr-only">{activeTitle || 'Conversation'}</h2>}

          <div
            ref={listRef}
            className="flex max-h-[55vh] min-h-[16rem] flex-col overflow-y-auto px-5 pt-2 pb-3 lg:max-h-none lg:min-h-0 lg:flex-1"
            aria-live="polite"
          >
            {messages.status === 'loading' ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 size={18} className="animate-spin sa-t-muted" />
              </div>
            ) : messages.status === 'error' ? (
              <div role="alert" className="py-2 text-[13px] text-[var(--sa-danger)]">
                <p className="break-words text-[12px]">{messages.error?.code}</p>
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
            ) : messages.items.length === 0 ? (
              <div className="flex min-h-[16rem] flex-1 flex-col items-center justify-center px-6 text-center">
                <Sparkles size={20} strokeWidth={1.5} className="mb-2 sa-t-muted" />
                <p className="text-[15px] text-[var(--sa-text-secondary)]">Ask about the schedule, staff, students, and rooms.</p>
                <p className="mt-1 text-[12px] text-[var(--sa-text-muted)]">Read-only answers from a dated snapshot. The assistant never changes data.</p>
                {!configMissing && (
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    {SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => setDraft(suggestion)}
                        className="itx-chip-btn min-h-11 rounded-full border border-[var(--sa-line-hairline)] px-3 py-1.5 text-[12px] text-[var(--sa-text-secondary)] transition hover:bg-[var(--sa-surface-2)]/50 hover:text-[var(--sa-text-primary)] dark:border-[var(--sa-line-default)]"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {messages.items.map((message) => {
                  const isUser = message.role === 'user';
                  return (
                    <div key={message.id} className={clsx('flex', isUser ? 'justify-end' : 'justify-start')}>
                      <div
                        className={clsx(
                          'whitespace-pre-wrap break-words text-sm',
                          isUser
                            ? 'max-w-[80%] rounded-2xl bg-[var(--sa-surface-2)] px-3.5 py-2 text-[var(--sa-text-primary)]'
                            : 'max-w-[68ch] text-pretty leading-relaxed text-[var(--sa-text-secondary)]'
                        )}
                      >
                        {message.content}
                      </div>
                    </div>
                  );
                })}
                {sending && (
                  <div className="flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin sa-t-muted" />
                    <span className="text-[12px] text-[var(--sa-text-muted)]">Thinking…</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="px-3 pb-4 pt-3">
            {configMissing && (
              <div role="status" className="mb-3 text-[13px] text-[var(--sa-text-muted)]">
                <p>
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
            )}

            {sendError && (
              <div role="alert" className="mb-3 text-[13px] text-[var(--sa-danger)]">
                <p className="break-words text-[12px]">{sendError.code}</p>
                <p className="mt-0.5 break-words">{sendError.message}</p>
              </div>
            )}

            <div className="chat-pill flex items-end gap-1.5 rounded-2xl border border-[var(--sa-line-hairline)] px-3 py-2 focus-within:border-[var(--sa-line-default)] dark:border-transparent dark:bg-[var(--sa-surface-2)] dark:focus-within:border-[var(--sa-line-default)]">
              <label htmlFor="assistant-message" className="sr-only">Message</label>
              <textarea
                id="assistant-message"
                rows={2}
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
                className="field-sizing-content max-h-40 min-h-10 w-full resize-none bg-transparent pl-1 text-sm leading-[22px]! text-[var(--sa-text-primary)] outline-none ring-0 placeholder:text-[var(--sa-text-subtle)] disabled:cursor-not-allowed"
              />
              <button
                type="button"
                data-send
                onClick={send}
                disabled={composerDisabled || !draft.trim()}
                aria-label={sending ? 'Sending…' : 'Send'}
                className={clsx(
                  'grid h-11 w-11 shrink-0 place-items-center rounded-full transition enabled:hover:bg-[var(--sa-surface-2)]/50 disabled:cursor-not-allowed',
                  draft.trim() && !composerDisabled
                    ? 'text-[var(--accent)] hover:text-[var(--accent-soft)]'
                    : 'text-[var(--sa-text-subtle)]'
                )}
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} strokeWidth={1.5} />}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AssistantPage;
