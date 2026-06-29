import React, { useState, useEffect } from 'react';
import socket from './socket';
import Lobby from './components/Lobby';
import ChatRoom from './components/ChatRoom';

export default function App() {
  const [ghostName, setGhostName] = useState('');
  const [currentRoom, setCurrentRoom] = useState(null); 

  useEffect(() => {
    socket.on('ghost:assigned', ({ ghostName }) => {
      setGhostName(ghostName);
    });
    socket.emit('ghost:request');
    return () => socket.off('ghost:assigned');
  }, []);

  const joinRoom = (room) => {
    socket.emit('room:join', { roomId: room.id });
    setCurrentRoom(room);
  };

  const leaveRoom = () => {
    socket.emit('room:leave');
    setCurrentRoom(null);
  };

  return (
    <div className="app">
      <div className="noise-overlay" />
      <header className="header">
        <div className="header-logo" onClick={leaveRoom} style={{ cursor: 'pointer' }}>
          <span className="header-logo-icon">👻</span>
          <span className="header-logo-text">Ghost Protocol</span>
        </div>
        {ghostName && (
          <div className="header-ghost-badge">
            <span className="header-ghost-dot" />
            {ghostName}
          </div>
        )}
      </header>

      {currentRoom ? (
        <ChatRoom room={currentRoom} ghostName={ghostName} onLeave={leaveRoom} />
      ) : (
        <Lobby ghostName={ghostName} onJoinRoom={joinRoom} />
      )}
    </div>
  );
}
