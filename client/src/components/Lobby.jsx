import React, { useState, useEffect } from 'react';
import socket from '../socket';

const ROOM_ICONS = ['🕯️', '🌑', '🩸', '💀', '🌫️', '🪦', '🦇', '🔮'];

export default function Lobby({ ghostName, onJoinRoom }) {
  const [rooms, setRooms] = useState([]);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  // Fetch initial rooms
  useEffect(() => {
    fetch('http://localhost:4000/api/rooms')
      .then((r) => r.json())
      .then(setRooms)
      .catch(console.error);
  }, []);

  // Live updates via socket
  useEffect(() => {
    socket.on('rooms:updated', setRooms);
    return () => socket.off('rooms:updated', setRooms);
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('http://localhost:4000/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() }),
      });
      if (res.ok) {
        setNewName('');
        setNewDesc('');
        setShowCreate(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  const getIcon = (index) => ROOM_ICONS[index % ROOM_ICONS.length];

  return (
    <main className="lobby">
      <div className="lobby-hero">
        <span className="lobby-hero-label">Anonymous · Ephemeral · Free</span>
        <h1>Enter the Ghost Protocol</h1>
        <p>
          No profiles. No history. Just voices in the dark.
          Pick a room, say what you feel, and vanish.
        </p>
      </div>

      {/* Create Room */}
      <div className="create-room-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showCreate ? '1rem' : 0 }}>
          <p className="create-room-title">Create a Room</p>
          <button
            className="ghost-btn ghost-btn-ghost"
            onClick={() => setShowCreate((v) => !v)}
            style={{ fontSize: '0.78rem', padding: '5px 12px' }}
          >
            {showCreate ? '✕ Cancel' : '+ New Room'}
          </button>
        </div>

        {showCreate && (
          <form onSubmit={handleCreate}>
            <div className="create-room-fields">
              <input
                id="room-name-input"
                className="ghost-input"
                placeholder="Room name…"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={40}
                required
              />
              <input
                id="room-desc-input"
                className="ghost-input"
                placeholder="Short description (optional)"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                maxLength={100}
                style={{ flex: 2 }}
              />
              <button
                id="create-room-btn"
                type="submit"
                className="ghost-btn ghost-btn-primary"
                disabled={creating || !newName.trim()}
              >
                {creating ? '…' : '👻 Create'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Room List */}
      <div>
        <div className="rooms-section-header">
          <span className="rooms-section-label">Active Rooms</span>
          <span className="rooms-count">{rooms.length} rooms</span>
        </div>

        <div className="rooms-grid">
          {rooms.map((room, i) => (
            <div
              key={room.id}
              id={`room-card-${room.id}`}
              className="room-card"
              onClick={() => onJoinRoom(room)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onJoinRoom(room)}
            >
              <div className="room-card-top">
                <span className="room-card-name">{room.name}</span>
                <span className="room-card-icon">{getIcon(i)}</span>
              </div>
              {room.description && (
                <p className="room-card-desc">{room.description}</p>
              )}
              <div className="room-card-footer">
                <span className="room-card-members">
                  <span className={`members-dot ${room.members === 0 ? 'empty' : ''}`} />
                  {room.members === 0
                    ? 'Empty'
                    : `${room.members} ghost${room.members !== 1 ? 's' : ''}`}
                </span>
                <span className="room-join-arrow">Enter →</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
