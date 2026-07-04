import { useEffect, useState } from 'react';
import { inboxAPI } from '../services/api';
import { connectSocket } from '../services/socket';

const WhatsAppInbox = () => {
  const [conversations, setConversations] = useState([]);
  const [active, setActive] = useState(null);
  const [search, setSearch] = useState('');
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async (q = search) => {
    setLoading(true);
    try {
      const { data } = await inboxAPI.getAll({ search: q, limit: 50 });
      setConversations(data.conversations || []);
      if (!active && data.conversations?.[0]) setActive(data.conversations[0]);
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
    return () => {
      socket.off('inbox:message');
      socket.off('inbox:status');
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => load(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const selectConversation = async (conversation) => {
    const { data } = await inboxAPI.getById(conversation._id);
    setActive(data);
  };

  const sendReply = async (e) => {
    e.preventDefault();
    if (!active || !reply.trim()) return;
    const { data } = await inboxAPI.reply(active._id, { text: reply });
    setActive(data.conversation);
    setReply('');
    load(search);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 h-[calc(100vh-9rem)]">
      <div className="card p-0 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="input-field" placeholder="Search contacts" />
        </div>
        {error && <div className="m-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
        <div className="overflow-y-auto">
          {loading ? (
            <div className="p-6 text-sm text-gray-500">Loading conversations...</div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">No conversations yet.</div>
          ) : (
            conversations.map((conversation) => (
              <button
                key={conversation._id}
                onClick={() => selectConversation(conversation)}
                className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 ${active?._id === conversation._id ? 'bg-primary-50' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-gray-900 truncate">{conversation.contactName || conversation.contactId?.name || conversation.phone}</p>
                  <span className="text-[11px] text-gray-400">{new Date(conversation.lastMessageAt).toLocaleDateString()}</span>
                </div>
                <p className="text-xs text-gray-500 font-mono mt-1">{conversation.phone}</p>
                <p className="text-sm text-gray-600 mt-2 truncate">{conversation.lastMessage}</p>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="card p-0 overflow-hidden flex flex-col">
        {!active ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">Select a conversation</div>
        ) : (
          <>
            <div className="p-4 border-b border-gray-200">
              <p className="font-semibold text-gray-900">{active.contactName || active.contactId?.name || active.phone}</p>
              <p className="text-xs text-gray-500 font-mono">{active.phone}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-gray-50">
              {(active.messages || []).map((message) => (
                <div key={message._id} className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[72%] rounded-lg px-4 py-2 text-sm shadow-sm ${message.direction === 'outbound' ? 'bg-primary-600 text-white' : 'bg-white text-gray-800 border border-gray-200'}`}>
                    <p className="whitespace-pre-wrap">{message.text || '(media message)'}</p>
                    <p className={`text-[11px] mt-1 ${message.direction === 'outbound' ? 'text-primary-100' : 'text-gray-400'}`}>
                      {message.status} · {new Date(message.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={sendReply} className="p-4 border-t border-gray-200 flex gap-3">
              <input value={reply} onChange={(e) => setReply(e.target.value)} className="input-field" placeholder="Type a reply" />
              <button className="btn-primary" type="submit">Send</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default WhatsAppInbox;
