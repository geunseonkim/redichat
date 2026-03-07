# Redis Terminal Chat

> A simple, real-time, multi-room terminal chat application using Node.js and Redis.

## ✨ Features

- **Real-time Chat**: Blazing fast messaging powered by Redis Pub/Sub.
- **Multi-language Support**: Supports both English and Korean.
- **Private & Public Rooms**: Create password-protected private rooms or join public random rooms.
- **Chat History**: Loads recent messages upon joining a room.
- **Rich Commands**:
  - `/users`: View participants in the current room.
  - `/rooms`: View all active rooms and their member counts.
  - `/join <room>`: Switch to another room without restarting.
  - `/whisper <nick> <msg>`: Send a private message.
  - `/back`: Go back from the password screen.
- **Dynamic Nickname Colors**: Unique colors assigned to each user for better readability.

## Prerequisites

- Node.js (v18 or higher recommended)
- A running Redis instance (local or remote)

## 🚀 Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/your-username/redis-chat.git
    cd redis-chat
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

## ⚙️ Configuration

1.  Copy the example environment file:

    ```bash
    cp .env.example .env
    ```

2.  Edit the `.env` file with your Redis server details:
    ```dotenv
    REDIS_HOST=127.0.0.1
    REDIS_PORT=6379
    REDIS_PASSWORD=your_redis_password
    ```

## 🏃‍♂️ How to Run

Simply run the start command in your terminal:

```bash
npm start
```

Follow the on-screen instructions to select a language, set your nickname, and join or create a room.

## 🤝 Contributing

Contributions are welcome! Please read the CONTRIBUTING.md for details on our code of conduct and the process for submitting pull requests.

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.
