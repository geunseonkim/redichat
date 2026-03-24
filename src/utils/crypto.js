import crypto from "crypto";

// 비밀번호를 해시하는 함수
export const hashPassword = (password) => {
  return crypto.createHash("sha256").update(password).digest("hex");
};
