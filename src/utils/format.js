// 타임스탬프 포맷팅 함수 (HH:mm)
export const formatTimestamp = (isoString) => {
  return new Date(isoString).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

// 날짜 포맷팅 함수 (YYYY년 M월 D일)
export const formatDate = (isoString) => {
  return new Date(isoString).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};
