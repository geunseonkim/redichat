import { useState, useCallback } from "react";
import * as redisService from "../services/redisService.js";

export const useSession = ({ onSessionEstablished }) => {
  const [step, setStep] = useState("NICKNAME");
  const [nickname, setNickname] = useState("");
  const [roomName, setRoomName] = useState("");
  const [error, setError] = useState("");
  const [passwordAttempts, setPasswordAttempts] = useState(0);

  const handleNicknameSubmit = useCallback((value) => {
    if (value.trim()) {
      setNickname(value.trim());
      setStep("ROOM_NAME");
    }
  }, []);

  const handleRoomNameSubmit = useCallback(
    async (value) => {
      const trimmedValue = value.trim();
      if (trimmedValue) {
        if (trimmedValue.toLowerCase() === "random") {
          const randomRoomName = await redisService.findAvailableRandomRoom();
          setRoomName(randomRoomName);
          onSessionEstablished(randomRoomName, nickname);
          setStep("CHATTING");
        } else {
          const userCount = await redisService.getRoomCapacity(trimmedValue);
          if (userCount >= 100) {
            setError(`채팅방 '${trimmedValue}'의 정원(100명)이 가득 찼습니다.`);
            return;
          }
          setError("");
          setPasswordAttempts(0);
          setRoomName(trimmedValue);
          setStep("ROOM_PASSWORD");
        }
      }
    },
    [nickname, onSessionEstablished],
  );

  const handleRoomPasswordSubmit = useCallback(
    async (value) => {
      if (value.trim().toLowerCase() === "/back") {
        setRoomName("");
        setError("");
        setPasswordAttempts(0);
        setStep("ROOM_NAME");
        return;
      }

      const enteredPassword = value.trim();
      setError("");

      const { exists, correct } = await redisService.verifyRoomPassword(
        roomName,
        enteredPassword,
      );

      if (exists) {
        if (!correct) {
          const newAttempts = passwordAttempts + 1;
          setPasswordAttempts(newAttempts);

          if (newAttempts >= 3) {
            setError(
              "비밀번호를 3회 이상 틀렸습니다. 채팅방 선택 화면으로 돌아갑니다.",
            );
            setTimeout(() => {
              setRoomName("");
              setError("");
              setPasswordAttempts(0);
              setStep("ROOM_NAME");
            }, 1500);
          } else {
            setError(`비밀번호가 일치하지 않습니다. (${newAttempts}/3)`);
          }
          return;
        }
      } else {
        await redisService.setRoomPassword(roomName, enteredPassword);
      }

      setPasswordAttempts(0);
      onSessionEstablished(roomName, nickname);
      setStep("CHATTING");
    },
    [roomName, nickname, passwordAttempts, onSessionEstablished],
  );

  const resetToRoomSelection = useCallback(() => {
    setRoomName("");
    setError("");
    setPasswordAttempts(0);
    setStep("ROOM_NAME");
  }, []);

  return {
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
  };
};
