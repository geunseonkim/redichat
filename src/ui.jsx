import React, { useState, useEffect } from "react";
import { Text, Box, Newline, useApp, useInput } from "ink";
import TextInput from "ink-text-input";
import Redis from "ioredis";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

// Redis 연결 설정. 환경 변수에서 값을 읽어오고, 없으면 기본값을 사용합니다.
const redisOptions = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD, // password가 없으면 undefined가 되어야 함
};

// Redis 클라이언트 생성. Pub/Sub을 위해서는 Publisher와 Subscriber를 분리하는 것이 좋습니다.
const publisher = new Redis(redisOptions);
const subscriber = new Redis(redisOptions);

// 비밀번호를 해시하는 함수
const hashPassword = (password) => {
  return crypto.createHash("sha256").update(password).digest("hex");
};

// HSL 색상을 RGB Hex 코드로 변환하는 헬퍼 함수
const hslToRgb = (h, s, l) => {
  let r, g, b;

  if (s === 0) {
    r = g = b = l; // 흑백
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  const toHex = (x) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

// 닉네임에 따라 고유한 색상을 생성하는 함수
const getColorForNickname = (nickname) => {
  if (nickname === "System") return "gray";
  let hash = 0;
  for (let i = 0; i < nickname.length; i++) {
    hash = nickname.charCodeAt(i) + ((hash << 5) - hash);
    hash &= hash; // 32비트 정수로 변환
  }
  const hue = Math.abs(hash % 360) / 360; // 0-1 사이의 값
  const saturation = 0.6; // 채도 (조금 낮춰서 덜 밝게)
  const lightness = 0.5; // 명도 (낮춰서 더 깊은 색으로)

  return hslToRgb(hue, saturation, lightness);
};

// 타임스탬프 포맷팅 함수 (HH:mm)
const formatTimestamp = (isoString) => {
  return new Date(isoString).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

// 날짜 포맷팅 함수 (YYYY년 M월 D일)
const formatDate = (isoString) => {
  return new Date(isoString).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const App = () => {
  const [step, setStep] = useState("NICKNAME"); // NICKNAME, ROOM_NAME, ROOM_PASSWORD, CHATTING
  const [nickname, setNickname] = useState("");
  const [roomName, setRoomName] = useState("");
  const [roomPassword, setRoomPassword] = useState("");
  const [error, setError] = useState("");
  const [isExiting, setIsExiting] = useState(false);

  const [messages, setMessages] = useState([]); // 채팅 메시지 목록
  const [currentMessage, setCurrentMessage] = useState(""); // 현재 입력 중인 메시지
  const { exit } = useApp();

  // Dynamic Redis keys based on user input
  const [channel, setChannel] = useState("");
  const [usersSetKey, setUsersSetKey] = useState("");

  // Graceful exit handler using Ink's `useInput`
  useInput((input, key) => {
    // Don't handle input if we are already exiting
    if (isExiting) {
      return;
    }

    if (key.ctrl && input.toLowerCase() === "c") {
      setIsExiting(true);
    }
  });

  // Effect to handle the actual exit process
  useEffect(() => {
    if (!isExiting) {
      return;
    }

    const cleanupAndExit = async () => {
      if (channel) {
        await publisher.srem(usersSetKey, nickname);
        const leaveMessage = {
          id: uuidv4(),
          type: "LEAVE",
          nickname,
          content: `${nickname}님이 채팅방을 나갔습니다.`,
          timestamp: new Date().toISOString(),
        };
        // Await the publish to ensure the message is sent before disconnecting
        await publisher.publish(channel, JSON.stringify(leaveMessage));
        await publisher.quit();
        await subscriber.quit();
      }
      // Now, exit the app
      exit();
    };

    cleanupAndExit();
  }, [isExiting, channel, usersSetKey, nickname, exit]);

  // Redis 메시지 수신 및 앱 종료 처리
  useEffect(() => {
    if (step !== "CHATTING" || !channel) {
      return;
    }

    // 채널 구독
    subscriber.subscribe(channel);

    const messageHandler = (receivedChannel, message) => {
      if (receivedChannel === channel) {
        const parsedMessage = JSON.parse(message);
        if (parsedMessage.type === "WHISPER") {
          if (
            parsedMessage.sender === nickname ||
            parsedMessage.recipient === nickname
          ) {
            setMessages((prev) => [...prev.slice(-100), parsedMessage]);
          }
        } else {
          setMessages((prev) => [...prev.slice(-100), parsedMessage]);
        }
      }
    };

    subscriber.on("message", messageHandler);

    return () => {
      // 방을 이동하거나 앱이 종료될 때, 이전 채널의 구독을 확실히 해제합니다.
      subscriber.unsubscribe(channel);
      subscriber.off("message", messageHandler);
    };
  }, [step, channel, nickname]);

  const startChattingSession = async (targetRoomName, targetNickname) => {
    const finalChannel = `chat:room:${targetRoomName}`;
    const finalUsersSetKey = `${finalChannel}:users`;
    const historyKey = `${finalChannel}:history`;

    // Fetch recent messages from the history
    const messageHistory = await publisher.lrange(historyKey, 0, 49); // Get last 50 messages
    const parsedHistory = messageHistory
      .reverse()
      .map((msg) => JSON.parse(msg));

    // Set initial messages state with history
    if (parsedHistory.length > 0) {
      const historyLoadedMessage = {
        id: uuidv4(),
        type: "SYSTEM",
        content: `--- 이전 대화 ${parsedHistory.length}개를 불러왔습니다. ---`,
        timestamp: new Date().toISOString(),
      };
      setMessages([...parsedHistory, historyLoadedMessage]);
    } else {
      setMessages([]); // Clear messages from any previous room
    }

    setChannel(finalChannel);
    setUsersSetKey(finalUsersSetKey);

    await publisher.sadd(finalUsersSetKey, targetNickname);
    setStep("CHATTING");

    const joinMessage = {
      id: uuidv4(),
      type: "JOIN",
      nickname: targetNickname,
      content: `${targetNickname}님이 채팅방에 입장했습니다.`,
      timestamp: new Date().toISOString(),
    };
    await publisher.publish(finalChannel, JSON.stringify(joinMessage));
  };

  const handleNicknameSubmit = (value) => {
    if (value.trim()) {
      setNickname(value.trim());
      setStep("ROOM_NAME");
    }
  };

  const handleRoomNameSubmit = async (value) => {
    const trimmedValue = value.trim();
    if (trimmedValue) {
      if (trimmedValue.toLowerCase() === "random") {
        let roomIndex = 1;
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const randomRoomName = `random${roomIndex}`;
          const usersKey = `chat:room:${randomRoomName}:users`;
          const userCount = await publisher.scard(usersKey);

          if (userCount < 100) {
            setRoomName(randomRoomName);
            await startChattingSession(randomRoomName, nickname);
            break;
          }
          roomIndex++;
        }
      } else {
        // Private room user count check
        const usersKey = `chat:room:${trimmedValue}:users`;
        const userCount = await publisher.scard(usersKey);
        if (userCount >= 100) {
          setError(`채팅방 '${trimmedValue}'의 정원(100명)이 가득 찼습니다.`);
          return;
        }

        setError(""); // Clear previous errors
        setRoomName(trimmedValue);
        setStep("ROOM_PASSWORD");
      }
    }
  };

  const handleRoomPasswordSubmit = async (value) => {
    const enteredPassword = value.trim();
    setError(""); // 이전 에러 메시지 초기화

    const storedHashedPassword = await publisher.hget("chat:rooms", roomName);

    if (storedHashedPassword) {
      // 기존 방: 비밀번호 검증
      const enteredHashedPassword = hashPassword(enteredPassword);
      if (storedHashedPassword !== enteredHashedPassword) {
        setError("비밀번호가 일치하지 않습니다. 다시 시도해주세요.");
        return;
      }
    } else {
      // 새로운 방: 비밀번호 설정
      const newHashedPassword = hashPassword(enteredPassword);
      await publisher.hset("chat:rooms", roomName, newHashedPassword);
    }

    await startChattingSession(roomName, nickname);
  };

  const handleMessageSubmit = async (value) => {
    const trimmedValue = value.trim();
    if (!trimmedValue || !nickname) {
      return;
    }

    // 명령어 처리: /join
    if (trimmedValue.startsWith("/join")) {
      const parts = trimmedValue.split(" ");
      const newRoomName = parts[1]; // e.g., /join general

      // 1. 현재 방에서 나갑니다.
      if (channel) {
        const leaveMessage = {
          id: uuidv4(),
          type: "LEAVE",
          nickname,
          content: `${nickname}님이 채팅방을 나갔습니다.`,
          timestamp: new Date().toISOString(),
        };
        await publisher.srem(usersSetKey, nickname);
        await publisher.publish(channel, JSON.stringify(leaveMessage));
      }

      // 2. 상태를 초기화하고 다음 단계로 이동합니다.
      setMessages([]);
      setRoomPassword("");
      setCurrentMessage("");

      if (newRoomName) {
        // `/join <방이름>`: 바로 해당 방 입장 절차 시작
        await handleRoomNameSubmit(newRoomName);
      } else {
        // `/join`: 방 선택 단계로 돌아감
        setRoomName("");
        setStep("ROOM_NAME");
      }
      return;
    }

    // 명령어 처리: /whisper
    if (trimmedValue.startsWith("/whisper ")) {
      const parts = trimmedValue.split(" ");
      const targetNickname = parts[1];
      const whisperMessageContent = parts.slice(2).join(" ");

      if (!targetNickname || !whisperMessageContent) {
        const errorMessage = {
          id: uuidv4(),
          type: "SYSTEM",
          content: "사용법: /whisper <닉네임> <메시지>",
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev.slice(-100), errorMessage]);
        setCurrentMessage("");
        return;
      }

      if (targetNickname === nickname) {
        const errorMessage = {
          id: uuidv4(),
          type: "SYSTEM",
          content: "자기 자신에게 귓속말을 보낼 수 없습니다.",
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev.slice(-100), errorMessage]);
        setCurrentMessage("");
        return;
      }

      const isUserInRoom = await publisher.sismember(
        usersSetKey,
        targetNickname,
      );
      if (!isUserInRoom) {
        const errorMessage = {
          id: uuidv4(),
          type: "SYSTEM",
          content: `오류: '${targetNickname}' 님을 찾을 수 없습니다.`,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev.slice(-100), errorMessage]);
        setCurrentMessage("");
        return;
      }

      const whisperMessage = {
        id: uuidv4(),
        type: "WHISPER",
        sender: nickname,
        recipient: targetNickname,
        content: whisperMessageContent,
        timestamp: new Date().toISOString(),
      };

      await publisher.publish(channel, JSON.stringify(whisperMessage));
      setCurrentMessage("");
      return;
    }

    // 명령어 처리: /users
    if (trimmedValue === "/users") {
      const onlineUsers = await publisher.smembers(usersSetKey);
      const usersMessage = {
        id: uuidv4(),
        type: "SYSTEM",
        content: `참여자 목록 (${onlineUsers.length}): ${onlineUsers.join(", ")}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev.slice(-100), usersMessage]);
      setCurrentMessage("");
      return;
    }

    // 일반 메시지 처리
    if (trimmedValue && nickname) {
      // 메시지 발행
      const message = {
        id: uuidv4(),
        sender: nickname,
        content: value.trim(),
        timestamp: new Date().toISOString(),
        type: "MESSAGE",
      };
      const historyKey = `${channel}:history`;

      // Use a transaction to atomically store history and publish the message
      await publisher
        .multi()
        .lpush(historyKey, JSON.stringify(message))
        .ltrim(historyKey, 0, 99) // Keep the last 100 messages
        .publish(channel, JSON.stringify(message))
        .exec();

      setCurrentMessage(""); // 메시지 전송 후 입력창 초기화
    }
  };

  if (step === "NICKNAME") {
    return (
      <Box
        borderStyle="bold"
        borderColor="green"
        padding={1}
        flexDirection="column"
      >
        <Text>
          환영합니다!{" "}
          <Text color="green" bold>
            Redis 터미널 채팅
          </Text>
          에 오신 것을 환영합니다.
        </Text>
        <Newline />
        <Text color="green">닉네임을 입력해주세요:</Text>
        <TextInput
          value={nickname}
          onChange={setNickname}
          onSubmit={handleNicknameSubmit}
          placeholder="여기에 닉네임을 입력하세요..."
        />
      </Box>
    );
  }

  if (step === "ROOM_NAME") {
    return (
      <Box
        borderStyle="bold"
        borderColor="green"
        padding={1}
        flexDirection="column"
      >
        <Text>
          안녕하세요,{" "}
          <Text color={getColorForNickname(nickname)} bold>
            {nickname}
          </Text>
          님!
        </Text>
        <Newline />
        <Text>참여하거나 새로 만들 채팅방 이름을 입력해주세요:</Text>
        <Text color="gray">
          (공개 채팅방에 참여하려면 'random'을 입력하세요)
        </Text>
        {error && <Text color="red">{error}</Text>}
        <TextInput
          value={roomName}
          onChange={(v) => {
            setRoomName(v);
            setError("");
          }}
          onSubmit={handleRoomNameSubmit}
          placeholder="예: general, random..."
        />
      </Box>
    );
  }

  if (step === "ROOM_PASSWORD") {
    return (
      <Box
        borderStyle="bold"
        borderColor="green"
        padding={1}
        flexDirection="column"
      >
        <Text>
          채팅방 '<Text color="cyan">{roomName}</Text>'의 비밀번호를
          입력해주세요.
        </Text>
        <Text color="gray">(비밀번호가 없으면 그냥 Enter를 누르세요)</Text>
        {error && <Text color="red">{error}</Text>}
        <TextInput
          value={roomPassword}
          onChange={(v) => {
            setRoomPassword(v);
            setError(""); // 입력 시 에러 메시지 제거
          }}
          onSubmit={handleRoomPasswordSubmit}
          placeholder="비밀번호 입력..."
        />
      </Box>
    );
  }

  // CHATTING 단계
  return (
    <Box padding={1} flexDirection="column" height="100%">
      {/* 채팅방 헤더 */}
      <Box
        flexDirection="column"
        marginBottom={1}
        borderStyle="single"
        borderBottomColor="gray"
        borderLeft={false}
        borderRight={false}
        borderTop={false}
      >
        <Text>
          <Text bold>채팅방: {roomName}</Text> (나:{" "}
          <Text color={getColorForNickname(nickname)}>{nickname}</Text>)
        </Text>
      </Box>

      {/* 메시지 표시 영역 */}
      <Box flexGrow={1} flexDirection="column">
        {messages.map((msg, index) => {
          // Find the previous non-system, non-whisper message to compare dates
          let prevRealMsg = null;
          for (let i = index - 1; i >= 0; i--) {
            if (messages[i].type === "MESSAGE") {
              prevRealMsg = messages[i];
              break;
            }
          }

          // Show date separator only for the first message of a new day
          const isMessage = msg.type === "MESSAGE";
          const showDateSeparator =
            isMessage &&
            (!prevRealMsg ||
              new Date(msg.timestamp).toDateString() !==
                new Date(prevRealMsg.timestamp).toDateString());

          return (
            <React.Fragment key={msg.id}>
              {showDateSeparator && (
                <Box key={`date-${msg.id}`}>
                  <Text dimColor>--- {formatDate(msg.timestamp)} ---</Text>
                </Box>
              )}
              <Box flexDirection="row">
                {["SYSTEM", "JOIN", "LEAVE"].includes(msg.type) ? (
                  <Text dimColor italic>
                    {msg.content}
                  </Text>
                ) : msg.type === "WHISPER" ? (
                  <>
                    <Text color="gray">
                      [{formatTimestamp(msg.timestamp)}]{" "}
                    </Text>
                    <Text color="magenta" italic>
                      {msg.sender === nickname
                        ? `→ ${msg.recipient}에게 귓속말`
                        : `← ${msg.sender}로부터 귓속말`}
                    </Text>
                    <Text italic>: {msg.content}</Text>
                  </>
                ) : (
                  <>
                    <Text color="gray">
                      [{formatTimestamp(msg.timestamp)}]{" "}
                    </Text>
                    <Text bold color={getColorForNickname(msg.sender)}>
                      {msg.sender}
                    </Text>
                    <Text>: {msg.content}</Text>
                  </>
                )}
              </Box>
            </React.Fragment>
          );
        })}
      </Box>

      {/* 메시지 입력 영역 */}
      <Box marginTop={1}>
        <Box marginRight={1}>
          <Text color="green">{">"}</Text>
        </Box>
        <TextInput
          value={currentMessage}
          onChange={setCurrentMessage}
          onSubmit={handleMessageSubmit}
          placeholder="메시지를 입력하세요... (/users, /whisper, /join)"
        />
      </Box>
    </Box>
  );
};

export default App;
