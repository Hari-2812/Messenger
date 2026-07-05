import { useEffect, useRef, useState } from 'react';
import { inboxAPI } from '../services/api';
import { connectSocket } from '../services/socket';

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

const StatusTick = ({ status }) => {
  if (status === 'read')      return <span className="text-blue-500 text-xs font-bold">✓✓</span>;
  if (status === 'delivered') return <span className="text-slate-400 text-xs font-bold">✓✓</span>;
  if (status === 'sent')      return <span className="text-slate-400 text-xs font-bold">✓</span>;
  if (status === 'failed')    return <span className="text-red-500 text-xs font-bold">✗</span>;
  return null;
};

const ConvRow = ({ c, active, onClick }) => {
  const name = c.contactName || c.contactId?.name || c.phone;
  const isActive = active?._id === c._id;
  return (
    <button
      onClick={() => onClick(c)}
      className={`w-full text-left px-4 py-3.5 flex items-center gap-3 border-b border-slate-50 transition ${
        isActive ? 'bg-indigo-50/70 border-l-4 border-l-indigo-600' : 'hover:bg-slate-50/50'
      }`}
    >
      <div
        className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white shadow-sm"
        style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
      >
        {initials(name)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className={`text-xs font-bold truncate ${isActive ? 'text-indigo-700' : 'text-slate-900'}`}>
            {name}
          </p>
          <span className="text-[10px] text-slate-400 flex-shrink-0 ml-1">
            {fmtDate(c.lastMessageAt)}
          </span>
        </div>
        <p className="text-[11px] text-slate-500 truncate mt-1">{c.lastMessage || '...'}</p>
      </div>
    </button>
  );
};

const Bubble = ({ msg }) => {
  const out = msg.direction === 'outbound';
  return (
    <div className={`flex ${out ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={out ? 'chat-bubble-out bg-indigo-600 text-white rounded-2xl rounded-tr-none px-4 py-2.5 shadow-sm max-w-[70%]' : 'chat-bubble-in bg-white text-slate-800 border border-slate-100 rounded-2xl rounded-tl-none px-4 py-2.5 shadow-sm max-w-[70%]'}>
        <p className="text-xs whitespace-pre-wrap leading-relaxed">{msg.text || '[Media Attachment]'}</p>
        <div className={`flex items-center gap-1 mt-1 justify-end ${out ? 'text-indigo-200' : 'text-slate-400'}`}>
          <span className="text-[9px]">
            {fmtTime(msg.timestamp)}
          </span>
          {out && <StatusTick status={msg.status} />}
        </div>
      </div>
    </div>
  );
};

const WhatsAppInbox = () => {
  const [conversations, setConversations] = useState([]);
  const [active, setActive]              = useState(null);
  const [search, setSearch]              = useState('');
  const [reply, setReply]                = useState('');
  const [loading, setLoading]            = useState(true);
  const [sending, setSending]            = useState(false);
  const [error, setError]                = useState('');
  const [mobileShowChat, setMobileShowChat] = useState(false);
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
      setError(err.response?.data?.message || 'Failed to load messages');
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

  useEffect(() => {
    const t = setTimeout(() => load(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { scrollToBottom(); }, [active?.messages]);

  const selectConversation = async (c) => {
    try {
      const { data } = await inboxAPI.getById(c._id);
      setActive(data);
      setMobileShowChat(true);
    } catch {
      setActive(c);
      setMobileShowChat(true);
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
    <div className="flex h-[calc(100vh-4.1rem)] -m-8 overflow-hidden bg-slate-50">
      {/* Conversation List Panel */}
      <div className={`w-full md:w-80 flex-shrink-0 bg-white border-r border-slate-100 flex flex-col ${mobileShowChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="px-4 py-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="font-bold text-slate-900 text-sm tracking-tight mb-3">WhatsApp Console Inbox</h2>
          <div className="relative">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-8 text-xs py-1.5"
              placeholder="Search conversations..."
            />
            <span className="absolute left-2.5 top-2.5 text-slate-400 text-xs">🔍</span>
          </div>
        </div>

        {error && (
          <div className="mx-3 mt-3 alert alert-error py-2">
            <span>{error}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-10 h-10 bg-slate-150 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-3 bg-slate-150 rounded w-3/4" />
                    <div className="h-2 bg-slate-150 rounded w-5/6" />
                  </div>
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400 px-4">
              <span className="text-3xl mb-2">💬</span>
              <p className="text-xs font-bold">No active conversations</p>
              <p className="text-[10px] mt-1">Incoming queries from WhatsApp will appear here dynamically.</p>
            </div>
          ) : (
            conversations.map((c) => (
              <ConvRow key={c._id} c={c} active={active} onClick={selectConversation} />
            ))
          )}
        </div>
      </div>

      {/* Message window panel */}
      <div className={`flex-1 flex flex-col bg-slate-100 ${!mobileShowChat ? 'hidden md:flex' : 'flex'}`}>
        {!active ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50">
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4 text-white shadow-lg"
              style={{ background: 'linear-gradient(135deg, #25d366, #128c7e)' }}>
              💬
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">WhatsApp Chat Control Center</h3>
            <p className="text-slate-500 text-xs max-w-xs">
              Select a client profile from the conversation list on the left to read messages and respond in real-time.
            </p>
          </div>
        ) : (
          <>
            {/* Header info */}
            <div className="bg-white px-5 py-3 border-b border-slate-100 flex items-center gap-3 shadow-sm bg-slate-50/40">
              {/* Back Button for mobile */}
              <button
                onClick={() => setMobileShowChat(false)}
                className="md:hidden p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 mr-1 text-xs"
              >
                ← Back
              </button>
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
              >
                {initials(activeName)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 text-xs truncate">{activeName}</p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{active.phone}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
                {active.status || 'open'}
              </span>
            </div>

            {/* Chat Messages flow body */}
            <div className="flex-1 overflow-y-auto px-5 py-6 bg-slate-50">
              {(active.messages || []).map((msg, i) => (
                <Bubble key={msg._id || i} msg={msg} />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input field actions */}
            <form
              onSubmit={sendReply}
              className="bg-white px-4 py-3 flex items-center gap-3 border-t border-slate-150"
            >
              <input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                className="input-field flex-1 py-2 text-xs"
                placeholder="Compose message reply..."
                disabled={sending}
              />
              <button
                type="submit"
                disabled={!reply.trim() || sending}
                className="btn-whatsapp py-2 px-4 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? 'Sending...' : 'Send'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default WhatsAppInbox;
