import { useState, useCallback, useEffect } from "react";
import * as redisService from "../services/redisService.js";

const SESSION_STEPS = {
  NICKNAME: "NICKNAME",
  ROOM_NAME: "ROOM_NAME",
  ROOM_PASSWORD: "ROOM_PASSWORD",
  CHATTING: "CHATTING",
};

export const useSession = ({ onSessionEstablished }) => {
  const [step, setStep] = useState(SESSION_STEPS.NICKNAME);
  const [nickname, setNickname] = useState("");
  const [roomName, setRoomName] = useState("");
  const [error, setError] = useState("");
  const [passwordAttempts, setPasswordAttempts] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);

  // isLockedOut 상태가 true가 되면 타이머를 시작합니다.
  useEffect(() => {
    if (isLockedOut) {
      const timer = setTimeout(() => {
        setRoomName("");
        setError("");
        setPasswordAttempts(0);
        setStep(SESSION_STEPS.ROOM_NAME);
        setIsLockedOut(false); // 잠금 상태 초기화
      }, 1500);
      return () => clearTimeout(timer); // 컴포넌트가 사라지면 타이머도 정리
    }
  }, [isLockedOut]);

  const handleNicknameSubmit = useCallback((value) => {
    if (value.trim()) {
      setNickname(value.trim());
      setStep(SESSION_STEPS.ROOM_NAME);
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
          setStep(SESSION_STEPS.CHATTING);
        } else {
          const userCount = await redisService.getRoomCapacity(trimmedValue);
          if (userCount >= 100) {
            setError(`채팅방 '${trimmedValue}'의 정원(100명)이 가득 찼습니다.`);
            return;
          }
          setError("");
          setPasswordAttempts(0);
          setRoomName(trimmedValue);
          setStep(SESSION_STEPS.ROOM_PASSWORD);
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
        setStep(SESSION_STEPS.ROOM_NAME);
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
            setIsLockedOut(true); // 상태를 변경하여 useEffect 트리거
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
      setStep(SESSION_STEPS.CHATTING);
    },
    [roomName, nickname, passwordAttempts, onSessionEstablished],
  );

  const resetToRoomSelection = useCallback(() => {
    setRoomName("");
    setError("");
    setPasswordAttempts(0);
    setStep(SESSION_STEPS.ROOM_NAME);
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
