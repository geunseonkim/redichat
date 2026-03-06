# Redis Terminal Chat Architecture

## 1. 프로젝트 개요 (Overview)

이 프로젝트는 Redis를 메시지 브로커로 사용하여 서버(또는 로컬 터미널) 간에 실시간으로 텍스트 메시지를 주고받는 CLI(Command Line Interface) 기반 채팅 애플리케이션입니다.

### 목표

- **실시간성**: Redis Pub/Sub을 이용한 지연 없는 메시지 전송.
- **간편함**: 별도의 복잡한 서버 구축 없이 Redis 인스턴스 하나로 통신.
- **확장성**: 오픈소스로 공개하여 누구나 자신의 Redis 서버 정보를 입력해 채팅방을 개설 가능.

## 2. 시스템 아키텍처 (System Architecture)

```mermaid
graph TD
    UserA[User A (Terminal)] -->|Publish (Send)| Redis((Redis Server))
    Redis -->|Subscribe (Receive)| UserA

    UserB[User B (Terminal)] -->|Publish (Send)| Redis
    Redis -->|Subscribe (Receive)| UserB

    subgraph "Data Flow"
    Direction[Channel: 'chat-room-1']
    end
```

### 구성 요소

1.  **Client (Terminal App)**:
    - 사용자 입력을 받아 Redis로 전송(Publish).
    - Redis의 특정 채널을 구독(Subscribe)하여 메시지를 수신 및 터미널에 출력.
    - UI 라이브러리(TUI)를 사용하여 채팅방 같은 UX 제공.
2.  **Broker (Redis)**:
    - 메시지 중계 역할.
    - 채널(Channel) 기반으로 메시지 라우팅.

## 3. 기술 스택 (Tech Stack)

- **언어**: Node.js (JavaScript)
  - _선정 이유_: 접근성이 좋고, 비동기 이벤트 기반 처리가 Redis Pub/Sub 모델과 매우 잘 어울림. NPM을 통해 풍부한 라이브러리 사용 가능.
- **데이터베이스**: Redis (5.0 이상 권장)
- **TUI 라이브러리**:
  - **Ink**: React 컴포넌트 방식으로 터미널 UI를 구축할 수 있어 모던하고 직관적임. (추천)
  - **Blessed**: 전통적이고 강력한 위젯 기반 TUI 라이브러리.

## 4. 데이터 설계 (Data Design)

### 메시지 포맷 (JSON)

Redis 채널을 통해 오가는 메시지는 JSON 문자열로 직렬화하여 전송합니다.

```json
{
  "id": "uuid-v4",
  "sender": "user_nickname",
  "content": "안녕하세요! 터미널 채팅입니다.",
  "timestamp": "2023-10-27T10:00:00Z",
  "type": "MESSAGE" // MESSAGE, JOIN, LEAVE
}
```

### Redis 채널 구조

- `chat:global`: 전체 공개 채팅방
- `chat:room:{room_name}`: 특정 주제의 채팅방

## 5. 핵심 기능 명세 (Core Features)

1.  **접속 (Connect)**
    - Redis 호스트, 포트, 비밀번호를 입력받아 연결.
    - 닉네임 설정.
2.  **채팅 (Chat)**
    - 메시지 입력 후 Enter → Redis `PUBLISH`
    - 백그라운드 스레드에서 Redis `SUBSCRIBE` 대기 → 수신 시 화면 갱신.
3.  **시스템 메시지**
    - 입장/퇴장 알림 구현.

## 6. 보안 및 배포 (Security & Deployment)

- **보안**: Redis를 공용 인터넷에 노출할 경우 반드시 `requirepass` 설정 및 가능하다면 TLS/SSL 연결을 지원해야 함.
- **배포**: GitHub Release를 통해 OS별(Mac, Linux, Windows) 바이너리 배포.

## 7. 향후 개선 사항 (Future Improvements)

- **메시지 기록 (History)**: Pub/Sub은 휘발성이므로, Redis `List`나 `Stream`을 사용하여 최근 대화 내용을 저장하고 불러오기 기능 추가.
- **파일 전송**: Base64 인코딩 또는 별도 링크를 통한 파일 공유.
