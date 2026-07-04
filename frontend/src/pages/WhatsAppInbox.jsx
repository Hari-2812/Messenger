import { useEffect, useRef, useState } from 'react';
import { inboxAPI } from '../services/api';
import { connectSocket } from '../services/socket';

/* ── helpers ─────────────────────────────────────────────────────────── */
const fmtTime  = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const fmtDate  = (d) => {
  const now  = new Date();
  const date = new Date(d);
  if (date.toDateString() === now.toDateString()) return 'Today';
  const y = new Date(now); y.setDate(y.getDate() - 1);
  if (date.toDateString() === y.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};
const initials = (name = '') => name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?';

/* ── Status tick ─────────────────────────────────────────────────────── */
const StatusTick = ({ status }) => {
  if (status === 'read')      return <span className="text-blue-400 text-[10px]">✓✓</span>;
  if (status === 'delivered') return <span className="text-gray-400 text-[10px]">✓✓</span>;
  if (status === 'sent')      return <span className="text-gray-400 text-[10px]">✓</span>;
  if (status === 'failed')    return <span className="text-red-400 text-[10px]">✗</span>;
  return null;
};

/* ── Conversation Row ────────────────────────────────────────────────── */
const ConvRow = ({ c, active, onClick }) => {
  const name = c.contactName || c.contactId?.name || c.phone;
  const isActive = active?._id === c._id;
  return (
    <button
      onClick={() => onClick(c)}
      className={`w-full text-left px-4 py-3.5 flex items-center gap-3 border-b border-gray-50 transition-colors duration-100 ${
        isActive ? 'bg-primary-50 border-l-2 border-l-primary-600' : 'hover:bg-gray-50/60'
      }`}
    >
      {/* Avatar */}
      <div
        className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
        style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
      >
        {initials(name)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className={`text-sm font-semibold truncate ${isActive ? 'text-primary-700' : 'text-gray-900'}`}>
            {name}
          </p>
          <span className="text-[10px] text-gray-400 flex-shrink-0 ml-1">
            {fmtDate(c.lastMessageAt)}
          </span>
        </div>
        <p className="text-xs text-gray-500 truncate mt-0.5">{c.lastMessage || '…'}</p>
      </div>
    </button>
  );
};

/* ── Message Bubble ──────────────────────────────────────────────────── */
const Bubble = ({ msg }) => {
  const out = msg.direction === 'outbound';
  return (
    <div className={`flex ${out ? 'justify-end' : 'justify-start'}`}>
      <div className={out ? 'chat-bubble-out' : 'chat-bubble-in'}>
        <p className="whitespace-pre-wrap leading-relaxed">{msg.text || '(media)'}</p>
        <div className={`flex items-center gap-1 mt-1 ${out ? 'justify-end' : 'justify-start'}`}>
          <span className={`text-[10px] ${out ? 'text-white/60' : 'text-gray-400'}`}>
            {fmtTime(msg.timestamp)}
          </span>
          {out && <StatusTick status={msg.status} />}
        </div>
      </div>
    </div>
  );
};

/* ── WhatsApp Inbox ──────────────────────────────────────────────────── */
const WhatsAppInbox = () => {
  const [conversations, setConversations] = useState([]);
  const [active, setActive]              = useState(null);
  const [search, setSearch]              = useState('');
  const [reply, setReply]                = useState('');
  const [loading, setLoading]            = useState(true);
  const [sending, setSending]            = useState(false);
  const [error, setError]                = useState('');
  const messagesEndRef                   = useRef(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  const load = async (q = '') => {
    setLoading(true);
    try {
      const { data } = await inboxAPI.getAll({ search: q, limit: 50 });
      setConversations(data.conversations || []);
      if (!active && data.conversations?.[0]) {
        const { data: full } = await inboxAPI.getById(data.conversations[0]._id);
        setActive(full);
      }
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load inbox');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load('');
    const socket = connectSocket();
    socket.emit('subscribe:inbox');
    socket.on('inbox:message', () => load(search));
    socket.on('inbox:status', () => load(search));
    return () => { socket.off('inbox:message'); socket.off('inbox:status'); };
  }, []);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => load(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { scrollToBottom(); }, [active?.messages]);

  const selectConversation = async (c) => {
    try {
      const { data } = await inboxAPI.getById(c._id);
      setActive(data);
    } catch {
      setActive(c);
    }
  };

  const sendReply = async (e) => {
    e.preventDefault();
    if (!active || !reply.trim() || sending) return;
    setSending(true);
    try {
      const { data } = await inboxAPI.reply(active._id, { text: reply });
      setActive(data.conversation);
      setReply('');
      load(search);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const activeName = active?.contactName || active?.contactId?.name || active?.phone || '';

  return (
    <div className="flex h-[calc(100vh-4.5rem)] -m-8 overflow-hidden">

      {/* ── Conversation List ── */}
      <div className="w-80 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col">
        {/* Header */}
        <div className="px-4 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 text-base mb-3">WhatsApp Inbox</h2>
          <div className="relative">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9 text-sm py-2"
              placeholder="Search contacts…"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-3 mt-3 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
            {error}
          </div>
        )}

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex gap-3">
                  <div className="skeleton w-10 h-10 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-3 w-3/4 rounded" />
                    <div className="skeleton h-2.5 w-full rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="empty-state">
              <p className="empty-state-icon">💬</p>
              <p className="font-semibold text-gray-700">No conversations yet</p>
              <p className="empty-state-text mt-1">Messages from your contacts will appear here</p>
            </div>
          ) : (
            conversations.map((c) => (
              <ConvRow key={c._id} c={c} active={active} onClick={selectConversation} />
            ))
          )}
        </div>
      </div>

      {/* ── Chat Window ── */}
      <div className="flex-1 flex flex-col" style={{ background: '#f0ebe3' }}>
        {!active ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
              style={{ background: 'linear-gradient(135deg, #25d366, #128c7e)' }}>
              <svg viewBox="0 0 24 24" fill="white" className="w-10 h-10">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">WhatsApp Inbox</h3>
            <p className="text-gray-500 text-sm max-w-xs">
              Select a conversation from the left panel to view messages and send replies.
            </p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="bg-white px-5 py-3.5 border-b border-gray-100 flex items-center gap-3 shadow-sm">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
              >
                {initials(activeName)}
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900 text-sm">{activeName}</p>
                <p className="text-xs text-gray-400 font-mono">{active.phone}</p>
              </div>
              <span
                className="badge text-white text-[10px]"
                style={{ background: active.status === 'open' ? '#25d366' : '#6b7280' }}
              >
                {active.status || 'open'}
              </span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-5 space-y-2">
              {(active.messages || []).map((msg, i) => (
                <Bubble key={msg._id || i} msg={msg} />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Form */}
            <form
              onSubmit={sendReply}
              className="bg-white px-4 py-3 flex items-center gap-3 border-t border-gray-100"
            >
              <input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                className="input-field flex-1 py-2.5 text-sm"
                placeholder="Type a message…"
                disabled={sending}
              />
              <button
                type="submit"
                disabled={!reply.trim() || sending}
                className="btn-whatsapp py-2.5 px-5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <div className="spinner w-4 h-4 border-white/30 border-t-white" />
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                )}
                Send
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default WhatsAppInbox;
