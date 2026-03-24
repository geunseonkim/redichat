import React from "react";
import { Box, Text } from "ink";
import { getColorForNickname } from "../utils/colors.js";
import { formatTimestamp } from "../utils/format.js";

const Message = ({ message, currentUserNickname }) => {
  if (["SYSTEM", "JOIN", "LEAVE"].includes(message.type)) {
    return (
      <Text dimColor italic>
        {message.content}
      </Text>
    );
  }

  if (message.type === "WHISPER") {
    return (
      <>
        <Text color="gray">[{formatTimestamp(message.timestamp)}] </Text>
        <Text color="magenta" italic>
          {message.sender === currentUserNickname
            ? `→ ${message.recipient}에게 귓속말`
            : `← ${message.sender}로부터 귓속말`}
        </Text>
        <Text italic>: {message.content}</Text>
      </>
    );
  }

  // Default to MESSAGE type
  return (
    <>
      <Text color="gray">[{formatTimestamp(message.timestamp)}] </Text>
      <Text bold color={getColorForNickname(message.sender)}>
        {message.sender}
      </Text>
      <Text>: {message.content}</Text>
    </>
  );
};

export default Message;
