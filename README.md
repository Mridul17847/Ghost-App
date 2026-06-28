# 👻 Ghost Protocol

> **Anonymous real-time chat — say what you could never say out loud.**

Ghost Protocol is a full-stack anonymous chat application where every user is automatically assigned a random ghost identity (e.g. `SilentWraith42`). No sign-ups, no usernames, no history — just pure, ephemeral conversation.

---

## ✨ Features

- 🎭 **Auto-assigned Ghost Names** — Random spooky identity on every connection (e.g. `PhantomEcho7`)
- 🚪 **Multiple Chat Rooms** — Join pre-built rooms like *The Void*, *Midnight Thoughts*, *Confessions*, and *Random Chaos*
- ➕ **Create Custom Rooms** — Add your own room with a name and description
- 💬 **Real-time Messaging** — Powered by Socket.IO for instant, live chat
- ✏️ **Edit & Delete Messages** — Authors can edit or delete their own messages
- ⌨️ **Typing Indicators** — See when other ghosts are typing
- 🧹 **Ephemeral by Design** — Chat history is wiped when a room empties; nothing is stored permanently
- 👥 **Live Member Count** — See how many ghosts are in each room

---

## 🛠 Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | React 18, Vite, Socket.IO Client    |
| Backend    | Node.js, Express, Socket.IO         |
| Styling    | Vanilla CSS                         |
| IDs        | UUID v4                             |

---

## 📁 Project Structure

```
Ghost app/
├── client/                  # React frontend (Vite)
│   ├── src/
│   │   ├── App.jsx          # Root component — routing between Lobby & ChatRoom
│   │   ├── socket.js        # Socket.IO client singleton
│   │   ├── index.css        # Global styles
│   │   └── components/
│   │       ├── Lobby.jsx    # Room browser & room creation
│   │       └── ChatRoom.jsx # Live chat interface
│   ├── index.html
│   └── package.json
│
└── server/                  # Node.js backend
    ├── index.js             # Express + Socket.IO server
    └── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- npm

### 1. Clone the repository

```bash
git clone https://github.com/your-username/ghost-app.git
cd ghost-app
```

### 2. Start the Server

```bash
cd server
npm install
npm run dev
```

> Server runs at **http://localhost:4000**

### 3. Start the Client

Open a new terminal:

```bash
cd client
npm install
npm run dev
```

> Client runs at **http://localhost:5173**

### 4. Open the App

Visit [http://localhost:5173](http://localhost:5173) in your browser. You'll be instantly assigned a ghost identity and dropped into the lobby.

---

## ⚙️ How It Works

1. **Connect** → Server generates a random ghost name and emits it to the client via `ghost:assigned`.
2. **Browse Rooms** → Lobby fetches available rooms from `GET /api/rooms`.
3. **Join a Room** → Client emits `room:join`; server adds the socket to the room and broadcasts member updates.
4. **Chat** → Messages are relayed in real-time via `message:send` / `message:received` events.
5. **Leave / Disconnect** → Room history is cleared and member count is updated for all clients.

---

## 🔌 Socket Events

| Event              | Direction         | Description                          |
|--------------------|-------------------|--------------------------------------|
| `ghost:assigned`   | Server → Client   | Delivers the assigned ghost name     |
| `ghost:request`    | Client → Server   | Re-requests ghost name (race fix)    |
| `room:join`        | Client → Server   | Join a specific room                 |
| `room:leave`       | Client → Server   | Explicitly leave the current room    |
| `room:history`     | Server → Client   | Sends existing messages on join      |
| `room:user_joined` | Server → Room     | Notifies room of a new ghost         |
| `room:user_left`   | Server → Room     | Notifies room of a ghost leaving     |
| `rooms:updated`    | Server → All      | Broadcasts updated room list         |
| `message:send`     | Client → Server   | Send a new chat message              |
| `message:received` | Server → Room     | Broadcasts a new message to the room |
| `message:delete`   | Client → Server   | Request to delete own message        |
| `message:deleted`  | Server → Room     | Notifies room of deletion            |
| `message:edit`     | Client → Server   | Request to edit own message          |
| `message:edited`   | Server → Room     | Broadcasts the edited message        |
| `typing:start`     | Client → Server   | Notify others that you're typing     |
| `typing:stop`      | Client → Server   | Notify others that you stopped       |
| `typing:update`    | Server → Room     | Typing indicator for the room        |

---

## 🔒 Privacy & Limitations

- **No accounts** — identities are session-based and disappear on disconnect.
- **No persistence** — messages are stored in memory only; server restart wipes everything.
- **No moderation** — this is a demo app; deploy with caution in production.

---

## 📜 License

MIT — do whatever you want with it. 👻
