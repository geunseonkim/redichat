import React, { useState, useEffect, useCallback } from "react";
import { render, useApp, useInput } from "ink";

import { useSession } from "./hooks/useSession.js";
import { useChat } from "./hooks/useChat.js";
import * as redisService from "./services/redisService.js";

import NicknameInput from "./components/NicknameInput.jsx";
import RoomInput from "./components/RoomInput.jsx";
import PasswordInput from "./components/PasswordInput.jsx";
import ChatView from "./components/ChatView.jsx";

const App = () => {
  const [isExiting, setIsExiting] = useState(false);
  const [roomPassword, setRoomPassword] = useState("");
  const { exit } = useApp();

  // This callback is passed to useSession. It's called right before the step is set to 'CHATTING'.
  // It uses `loadInitialChat` from the `useChat` hook, which is defined below.
  // This is a safe pattern in React as the function is only invoked after all hooks have been initialized.
  const onSessionEstablished = useCallback(
    async (targetRoomName, targetNickname) => {
      // eslint-disable-next-line no-use-before-define
      await loadInitialChat(targetRoomName, targetNickname);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const {
    step,
    nickname,
    setNickname,
    roomName,
    setRoomName,
    error,
    setError,
    handleNicknameSubmit,
    handleRoomNameSubmit,
    handleRoomPasswordSubmit,
    resetToRoomSelection,
  } = useSession({ onSessionEstablished });

  const handleRoomChange = useCallback(
    (newRoomName) => {
      if (newRoomName) {
        handleRoomNameSubmit(newRoomName);
      } else {
        resetToRoomSelection();
      }
    },
    [handleRoomNameSubmit, resetToRoomSelection],
  );

  const {
    messages,
    currentMessage,
    setCurrentMessage,
    handleMessageSubmit,
    loadInitialChat,
  } = useChat({ nickname, roomName, onRoomChange: handleRoomChange });

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
      if (roomName && nickname) {
        const leaveMessage = {
          type: "LEAVE",
          nickname,
          content: `${nickname}님이 채팅방을 나갔습니다.`,
          timestamp: new Date().toISOString(),
        };
        await redisService.removeUserFromRoom(roomName, nickname);
        await redisService.publishMessage(roomName, leaveMessage);
      }
      await redisService.disconnect();
      // Now, exit the app
      exit();
    };

    cleanupAndExit();
  }, [isExiting, roomName, nickname, exit]);

  switch (step) {
    case "NICKNAME":
      return (
        <NicknameInput
          nickname={nickname}
          setNickname={setNickname}
          onSubmit={handleNicknameSubmit}
        />
      );
    case "ROOM_NAME":
      return (
        <RoomInput
          nickname={nickname}
          roomName={roomName}
          setRoomName={setRoomName}
          error={error}
          setError={setError}
          onSubmit={handleRoomNameSubmit}
        />
      );
    case "ROOM_PASSWORD":
      return (
        <PasswordInput
          roomName={roomName}
          password={roomPassword}
          setPassword={setRoomPassword}
          error={error}
          setError={setError}
          onSubmit={handleRoomPasswordSubmit}
        />
      );
    case "CHATTING":
      return (
        <ChatView
          roomName={roomName}
          nickname={nickname}
          messages={messages}
          currentMessage={currentMessage}
          setCurrentMessage={setCurrentMessage}
          onSubmit={handleMessageSubmit}
        />
      );
    default:
      return null;
  }
};

render(<App />);
