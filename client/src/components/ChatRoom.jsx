import React, { useState, useEffect, useRef, useCallback } from 'react';
import socket from '../socket';
import EmojiPicker from './EmojiPicker';

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatRoom({ room, ghostName, onLeave }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typingUsers, setTypingUsers] = useState({});
  const [memberCount, setMemberCount] = useState(room.members);
  const [showEmoji, setShowEmoji] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');

  const messagesEndRef = useRef(null);
  const typingTimerRef = useRef(null);
  const isTypingRef = useRef(false);
  const inputRef = useRef(null);
  const editRef = useRef(null);
  const emojiRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, typingUsers]);

  // Close emoji picker on outside click
  useEffect(() => {
    const handler = (e) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) {
        setShowEmoji(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Socket events
  useEffect(() => {
    socket.on('room:history', (history) => {
      setMessages(history.map((m) => ({ ...m, type: 'chat' })));
    });
    socket.on('message:received', (msg) => {
      setMessages((prev) => [...prev, { ...msg, type: 'chat' }]);
    });
    socket.on('message:deleted', ({ messageId }) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    });
    socket.on('message:edited', ({ messageId, content }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, content, edited: true } : m))
      );
    });
    socket.on('room:user_joined', ({ ghostName: name }) => {
      setMemberCount((c) => c + 1);
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + Math.random(), type: 'system', content: `${name} drifted in` },
      ]);
    });
    socket.on('room:user_left', ({ ghostName: name }) => {
      setMemberCount((c) => Math.max(0, c - 1));
      setTypingUsers((prev) => { const n = { ...prev }; delete n[name]; return n; });
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + Math.random(), type: 'system', content: `${name} faded away` },
      ]);
    });
    socket.on('typing:update', ({ ghostName: name, typing }) => {
      setTypingUsers((prev) => {
        if (typing) return { ...prev, [name]: true };
        const n = { ...prev }; delete n[name]; return n;
      });
    });
    return () => {
      socket.off('room:history');
      socket.off('message:received');
      socket.off('message:deleted');
      socket.off('message:edited');
      socket.off('room:user_joined');
      socket.off('room:user_left');
      socket.off('typing:update');
    };
  }, []);

  // Typing events
  const handleTyping = (e) => {
    setInput(e.target.value);
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit('typing:start', { roomId: room.id });
    }
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit('typing:stop', { roomId: room.id });
    }, 1500);
  };

  const sendMessage = () => {
    const content = input.trim();
    if (!content) return;
    socket.emit('message:send', { roomId: room.id, content });
    setInput('');
    setShowEmoji(false);
    clearTimeout(typingTimerRef.current);
    isTypingRef.current = false;
    socket.emit('typing:stop', { roomId: room.id });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const insertEmoji = (emoji) => {
    const el = inputRef.current;
    if (!el) { setInput((v) => v + emoji); return; }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = input.slice(0, start) + emoji + input.slice(end);
    setInput(next);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  };

  // Delete
  const handleDelete = (msgId) => {
    socket.emit('message:delete', { roomId: room.id, messageId: msgId });
  };

  // Edit
  const startEdit = (msg) => {
    setEditingId(msg.id);
    setEditValue(msg.content);
    setTimeout(() => editRef.current?.focus(), 50);
  };

  const submitEdit = (msgId) => {
    if (!editValue.trim()) return;
    socket.emit('message:edit', { roomId: room.id, messageId: msgId, content: editValue.trim() });
    setEditingId(null);
    setEditValue('');
  };

  const cancelEdit = () => { setEditingId(null); setEditValue(''); };

  const handleEditKeyDown = (e, msgId) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitEdit(msgId); }
    if (e.key === 'Escape') cancelEdit();
  };

  const typingNames = Object.keys(typingUsers);
  const typingText =
    typingNames.length === 0 ? '' :
    typingNames.length === 1 ? `${typingNames[0]} is typing` :
    `${typingNames.length} ghosts are typing`;

  return (
    <div className="chat-layout">
      {/* Header */}
      <div className="chat-header">
        <button id="back-to-lobby-btn" className="chat-back-btn" onClick={onLeave}>← Back</button>
        <div className="chat-room-info">
          <div className="chat-room-name">#{room.name}</div>
          <div className="chat-room-meta">
            <span className={`members-dot ${memberCount === 0 ? 'empty' : ''}`} />
            {memberCount === 0 ? 'Just you' : `${memberCount} ghost${memberCount !== 1 ? 's' : ''} here`}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages" id="chat-messages-container">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <span className="chat-empty-icon">👻</span>
            <p>The room is quiet…</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Be the first to break the silence</p>
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.type === 'system') {
              return <div key={msg.id} className="msg-system">{msg.content}</div>;
            }
            const isOwn = msg.author === ghostName;
            const isEditing = editingId === msg.id;

            return (
              <div key={msg.id} className={`msg-bubble-wrap ${isOwn ? 'own' : ''}`}>
                {!isOwn && <span className="msg-author">{msg.author}</span>}

                <div className="msg-bubble-row">
                  {/* Action buttons — only own messages */}
                  {isOwn && !isEditing && (
                    <div className="msg-actions">
                      <button
                        className="msg-action-btn edit"
                        title="Edit"
                        onClick={() => startEdit(msg)}
                      >✏️</button>
                      <button
                        className="msg-action-btn delete"
                        title="Delete"
                        onClick={() => handleDelete(msg.id)}
                      >🗑️</button>
                    </div>
                  )}

                  {isEditing ? (
                    <div className="msg-edit-wrap">
                      <textarea
                        ref={editRef}
                        className="msg-edit-input"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => handleEditKeyDown(e, msg.id)}
                        rows={1}
                      />
                      <div className="msg-edit-actions">
                        <button className="edit-save-btn" onClick={() => submitEdit(msg.id)}>Save</button>
                        <button className="edit-cancel-btn" onClick={cancelEdit}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className={`msg-bubble ${isOwn ? 'own' : 'other'}`}>
                      {msg.content}
                      {msg.edited && <span className="msg-edited-tag"> · edited</span>}
                    </div>
                  )}
                </div>

                <span className="msg-time">{formatTime(msg.timestamp)}</span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing */}
      <div className="typing-indicator">
        {typingText && (
          <>{typingText}<span className="typing-dots"><span /><span /><span /></span></>
        )}
      </div>

      {/* Input */}
      <div className="chat-input-area">
        <div className="chat-input-row">
          {/* Emoji button */}
          <div className="emoji-picker-wrap" ref={emojiRef}>
            <button
              id="emoji-toggle-btn"
              className={`emoji-toggle-btn ${showEmoji ? 'active' : ''}`}
              onClick={() => setShowEmoji((v) => !v)}
              title="Emoji"
            >😊</button>
            {showEmoji && <EmojiPicker onSelect={insertEmoji} />}
          </div>

          <textarea
            ref={inputRef}
            id="chat-input"
            className="chat-textarea"
            placeholder="Whisper something…"
            value={input}
            onChange={handleTyping}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button
            id="send-message-btn"
            className="chat-send-btn"
            onClick={sendMessage}
            disabled={!input.trim()}
            title="Send"
          >↑</button>
        </div>
        <p className="chat-input-hint">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
