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
export const getColorForNickname = (nickname) => {
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
