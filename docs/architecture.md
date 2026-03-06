# Redis Terminal Chat Architecture

## 1. 프로젝트 개요 (Overview)

이 프로젝트는 Redis를 메시지 브로커로 사용하여 서버(또는 로컬 터미널) 간에 실시간으로 텍스트 메시지를 주고받는 CLI(Command Line Interface) 기반 채팅 애플리케이션입니다.

### 목표

- **실시간성**: Redis Pub/Sub을 이용한 지연 없는 메시지 전송.
- **간편함**: 별도의 복잡한 서버 구축 없이 Redis 인스턴스 하나로 통신.
- **확장성**: 오픈소스로 공개하여 누구나 자신의 Redis 서버 정보를 입력해 채팅방을 개설 가능.
- **대상 사용자**: 3명 내외의 동료 간 터미널 채팅.

### 현재 개발 상태

- Node.js, Ink, React 기반의 터미널 UI 환경 설정 완료.
- `tsx`를 통한 JSX 파일 직접 실행 환경 구축 완료.
- Git 저장소 초기화 및 GitHub 연동 완료.

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

### 5.1. 사용자 인터페이스 (UI)

- **닉네임 입력 화면**: 채팅 시작 전 사용자 닉네임을 입력받는 화면.
- **채팅 화면**:
  - **메시지 표시 영역**: 수신된 메시지들을 시간 순서대로 표시. (현재는 로컬 상태에만 추가)
  - **메시지 입력 영역**: 사용자가 메시지를 입력하고 전송하는 `TextInput` 컴포넌트.

### 5.2. Redis 연동

- **Redis 클라이언트 연결**: `ioredis`를 사용하여 Redis 서버에 연결 (Publisher 및 Subscriber 클라이언트 분리).
- **메시지 발행 (Publish)**: 사용자 입력 메시지를 Redis 채널에 발행.
- **메시지 구독 (Subscribe)**: Redis 채널을 구독하여 실시간 메시지 수신.

### 5.3. 채팅 기능

- **메시지 전송**: 사용자가 입력한 메시지를 JSON 포맷으로 변환하여 Redis에 발행. (현재는 로컬 상태에만 추가)
- **메시지 수신 및 표시**: Redis로부터 수신한 메시지를 파싱하여 터미널 화면에 실시간으로 표시.
- **입장/퇴장 알림**: 사용자가 채팅방에 입장하거나 퇴장할 때 시스템 메시지 발행 및 표시.

## 6. 개발 계획 (Development Plan)

- **1단계: 닉네임 입력 기능 구현 완료.**
- **2단계: 기본 채팅 UI 구현 완료.** (메시지 표시 영역 및 입력창)
- **3단계: Redis 연결 및 Pub/Sub 기본 동작 구현**: `ioredis`를 사용하여 Redis 연결 및 메시지 송수신 테스트.
- **4단계: 메시지 전송 및 수신 로직 통합**: UI와 Redis 연동 로직 결합.
- **5단계: 보안 및 배포**: Redis 보안 설정 및 GitHub Release를 통한 배포.

## 7. 설정, 보안 및 배포 (Configuration, Security & Deployment)

### 7.1. 환경 변수 설정

애플리케이션은 시스템 환경 변수를 통해 Redis 연결 정보를 설정할 수 있습니다. 프로젝트 루트의 `.env.example` 파일을 참고하여 `.env` 파일을 생성하면 더 쉽게 관리할 수 있습니다.

- `REDIS_HOST`: Redis 서버 호스트 (기본값: `127.0.0.1`)
- `REDIS_PORT`: Redis 서버 포트 (기본값: `6379`)
- `REDIS_PASSWORD`: Redis 서버 비밀번호 (기본값: 없음)
- `REDIS_CHANNEL`: 사용할 Redis 채널 이름 (기본값: `chat:global`)

### 7.2. 보안

- **보안**: Redis를 공용 인터넷에 노출할 경우 반드시 `requirepass` 설정 및 가능하다면 TLS/SSL 연결을 지원해야 함.
- **배포**: GitHub Release를 통해 OS별(Mac, Linux, Windows) 바이너리 배포.

## 8. 향후 개선 사항 (Future Improvements)

- **메시지 기록 (History)**: Pub/Sub은 휘발성이므로, Redis `List`나 `Stream`을 사용하여 최근 대화 내용을 저장하고 불러오기 기능 추가.
- **파일 전송**: Base64 인코딩 또는 별도 링크를 통한 파일 공유.
