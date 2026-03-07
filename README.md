# redichat

Real-time Redis terminal chat.

```bash
npm install -g redichat
```

> A simple, real-time multi-room terminal chat powered by Redis Pub/Sub.

`redichat` is a CLI chat application built with Node.js, React (Ink), and Redis.  
It allows multiple users to join chat rooms and communicate in real time directly from the terminal.

## ✨ Features

- **Real-time messaging** powered by Redis Pub/Sub
- **Multi-room chat** (create or join rooms instantly)
- **Private rooms** with password protection
- **Chat history** loaded when entering a room
- **Private messaging** between users
- **Multi-language support** (English / Korean)
- **Dynamic nickname colors** for readability
- Built with **React for the terminal** using Ink

---

# 📦 Installation

Install globally:

```bash
npm install -g redichat
```

or run instantly with:

```bash
npx redichat
```

---

# ⚙️ Configuration

`redichat` requires a running Redis instance.

Create a `.env` file:

```bash
cp .env.example .env
```

Example configuration:

```env
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
```

---

# 🚀 Usage

Start the chat client:

```bash
redichat
```

You will be prompted to:

1. Select a language
2. Enter your nickname
3. Join or create a chat room

---

# 💬 Commands

Inside a chat room you can use:

```
/users
```

View users in the current room.

```
/rooms
```

View all active rooms and their member counts.

```
/join <room>
```

Switch to another room.

```
/whisper <nick> <message>
```

Send a private message.

```
/back
```

Return from the password input screen.

---

# 🧰 Development

Clone the repository:

```bash
git clone https://github.com/geunseonkim/redichat.git
cd redichat
```

Install dependencies:

```bash
npm install
```

Build the project:

```bash
npm run build
```

Run locally:

```bash
npm start
```

---

# 🤝 Contributing

Contributions are welcome!

If you'd like to improve the project:

1. Fork the repository
2. Create a feature branch
3. Submit a pull request

---

# 📜 License

MIT License © 2026 Geunseon Kim
