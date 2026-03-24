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
- **Multi-language support** (English / Korean) (is comming)
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

`redichat` requires a running Redis instance to connect to.
Think of this server as a shared digital space or a playground. **To chat with others, you must all be in the same playground.**

You configure which playground to connect to by creating a `.env` file in the directory where you run the `redichat` command.

### 1. For Private Chat with Friends

If you want to create a private space for you and your friends, you must all connect to the **same Redis server**.

1.  **Create a Server:** One person in the group should create a free database on a service like [Redis Cloud](https://redis.com/try-free/) or [Upstash](https://upstash.com/).
2.  **Get Connection Info:** From the service's dashboard, get the **Host**, **Port**, and **Password**.
3.  **Share Securely:** Share this information privately with your friends.
4.  **Create `.env` File:** Each person must create a `.env` file and fill it with the shared details.

    ```env
    # .env - Example for a private group
    REDIS_HOST=redis-12345.c1.us-east-1-2.ec2.cloud.redislabs.com
    REDIS_PORT=12345
    REDIS_PASSWORD=the-secret-password-you-shared
    ```

### 2. For Developers (Local Testing)

When developing or testing on your own, you can connect to a Redis server running on your local machine.

1.  Clone the repository: `git clone https://github.com/geunseonkim/redichat.git`
2.  Install dependencies: `npm install`
3.  Copy the example file: `cp .env.example .env`
4.  The default values in `.env` are usually correct for a local Redis setup.

    ```env
    # .env - Default for local development
    REDIS_HOST=127.0.0.1
    REDIS_PORT=6379
    REDIS_PASSWORD=
    ```

### A Note on the "random" Room

When you enter `random` as the room name, `redichat` finds a public room on the **currently connected Redis server**. This means:

- If you and your friends are connected to the **same** Redis Cloud server, entering `random` will place you in the same public chat room.
- If you are connected to your local machine and your friend is connected to theirs, you will each be in a **separate, isolated** `random` room. You will not be able to chat.

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
