import { useState, useEffect, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import * as redisService from "../services/redisService.js";

export const useChat = ({ nickname, roomName, onRoomChange }) => {
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState("");

  // Effect for subscribing to Redis messages
  useEffect(() => {
    if (!roomName || !nickname) {
      setMessages([]); // Clear messages if we don't have a room or nickname
      return;
    }

    const messageHandler = (parsedMessage) => {
      // Optimistic UI: Ignore our own JOIN message because we add it instantly.
      if (
        parsedMessage.type === "JOIN" &&
        parsedMessage.nickname === nickname
      ) {
        return;
      }

      const isPublicMessage = parsedMessage.type !== "WHISPER";
      const isMyWhisper =
        parsedMessage.type === "WHISPER" &&
        (parsedMessage.sender === nickname ||
          parsedMessage.recipient === nickname);

      if (isPublicMessage || isMyWhisper) {
        setMessages((prev) => [...prev.slice(-100), parsedMessage]);
      }
    };

    const unsubscribe = redisService.subscribeToChannel(
      roomName,
      messageHandler,
    );

    // Cleanup function to unsubscribe when roomName or nickname changes
    return unsubscribe;
  }, [roomName, nickname]);

  // Function to load initial chat data when a session is established
  const loadInitialChat = useCallback(
    async (targetRoomName, targetNickname) => {
      const chatHistory = await redisService.getChatHistory(targetRoomName);

      const initialMessages = [];
      if (chatHistory.length > 0) {
        const historyLoadedMessage = {
          id: uuidv4(),
          type: "SYSTEM",
          content: `--- 이전 대화 ${chatHistory.length}개를 불러왔습니다. ---`,
          timestamp: new Date().toISOString(),
        };
        initialMessages.push(...chatHistory, historyLoadedMessage);
      }

      const joinMessage = {
        id: uuidv4(),
        type: "JOIN",
        nickname: targetNickname,
        content: `${targetNickname}님이 채팅방에 입장했습니다.`,
        timestamp: new Date().toISOString(),
      };

      // Set messages state after all async operations, including the optimistic join message
      setMessages([...initialMessages, joinMessage]);

      await redisService.addUserToRoom(targetRoomName, targetNickname);
      await redisService.publishMessage(targetRoomName, joinMessage);
    },
    [],
  );

  // Function to handle message submission (commands and regular messages)
  const handleMessageSubmit = useCallback(
    async (value) => {
      const trimmedValue = value.trim();
      if (!trimmedValue || !nickname) {
        return;
      }

      // Command: /join
      if (trimmedValue.startsWith("/join")) {
        const parts = trimmedValue.split(" ");
        const newRoomName = parts[1]; // Can be undefined

        if (roomName) {
          const leaveMessage = {
            id: uuidv4(),
            type: "LEAVE",
            nickname,
            content: `${nickname}님이 채팅방을 나갔습니다.`,
            timestamp: new Date().toISOString(),
          };
          await redisService.removeUserFromRoom(roomName, nickname);
          await redisService.publishMessage(roomName, leaveMessage);
        }

        setCurrentMessage("");
        onRoomChange(newRoomName); // Signal to parent to handle room change
        return;
      }

      // Command: /whisper
      if (trimmedValue.startsWith("/whisper ")) {
        const parts = trimmedValue.split(" ");
        const targetNickname = parts[1];
        const whisperContent = parts.slice(2).join(" ");

        let systemMessage = null;
        if (!targetNickname || !whisperContent) {
          systemMessage = {
            content: "사용법: /whisper <닉네임> <메시지>",
          };
        } else if (targetNickname === nickname) {
          systemMessage = {
            content: "자기 자신에게 귓속말을 보낼 수 없습니다.",
          };
        } else {
          const isUserInRoom = await redisService.isUserInRoom(
            roomName,
            targetNickname,
          );
          if (!isUserInRoom) {
            systemMessage = {
              content: `오류: '${targetNickname}' 님을 찾을 수 없습니다.`,
            };
          } else {
            const whisperMessage = {
              id: uuidv4(),
              type: "WHISPER",
              sender: nickname,
              recipient: targetNickname,
              content: whisperContent,
              timestamp: new Date().toISOString(),
            };
            await redisService.publishMessage(roomName, whisperMessage);
          }
        }

        if (systemMessage) {
          setMessages((prev) => [
            ...prev,
            {
              ...systemMessage,
              id: uuidv4(),
              type: "SYSTEM",
              timestamp: new Date().toISOString(),
            },
          ]);
        }
        setCurrentMessage("");
        return;
      }

      // Command: /users
      if (trimmedValue === "/users") {
        const onlineUsers = await redisService.getRoomUsers(roomName);
        const usersMessage = {
          id: uuidv4(),
          type: "SYSTEM",
          content: `참여자 목록 (${
            onlineUsers.length
          }): ${onlineUsers.join(", ")}`,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, usersMessage]);
        setCurrentMessage("");
        return;
      }

      // Command: /rooms
      if (trimmedValue === "/rooms") {
        const roomListWithCounts = await redisService.getRoomList();
        let content;
        if (roomListWithCounts.length === 0) {
          content = "현재 활성화된 채팅방이 없습니다.";
        } else {
          const roomList = roomListWithCounts
            .map(({ name, count }) => `  - ${name} (${count}/100)`)
            .join("\n");
          content = `활성화된 채팅방 목록:\n${roomList}`;
        }
        const roomsMessage = {
          id: uuidv4(),
          type: "SYSTEM",
          content,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, roomsMessage]);
        setCurrentMessage("");
        return;
      }

      // Regular message
      const message = {
        id: uuidv4(),
        sender: nickname,
        content: value.trim(),
        timestamp: new Date().toISOString(),
        type: "MESSAGE",
      };
      await redisService.sendMessageAndRecordHistory(roomName, message);
      setCurrentMessage("");
    },
    [nickname, roomName, onRoomChange],
  );

  return {
    messages,
    currentMessage,
    setCurrentMessage,
    handleMessageSubmit,
    loadInitialChat,
  };
};
