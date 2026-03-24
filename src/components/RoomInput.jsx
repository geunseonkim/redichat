import React from "react";
import { Box, Text, Newline } from "ink";
import TextInput from "ink-text-input";
import { getColorForNickname } from "../utils/colors.js";

const RoomInput = ({
  nickname,
  roomName,
  setRoomName,
  error,
  setError,
  onSubmit,
}) => {
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
      <Text color="gray">(공개 채팅방에 참여하려면 'random'을 입력하세요)</Text>
      {error && <Text color="red">{error}</Text>}
      <TextInput
        value={roomName}
        onChange={(v) => {
          setRoomName(v);
          setError("");
        }}
        onSubmit={onSubmit}
        placeholder="예: general, random..."
      />
    </Box>
  );
};

export default RoomInput;
