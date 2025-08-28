package model

const (
	MSG_TYPE_HELLO  = "hello"  // 첫 연결
	MSG_TYPE_CLOSE  = "close"  // 연결 해제
	MSG_TYPE_READY  = "ready"  // 게임 준비
	MSG_TYPE_CANCEL = "cancel" // 게임 준비 취소
	MSG_TYPE_START  = "start"  // 게임 시작
	MSG_TYPE_INGAME = "ingame" // 인게임 메시지
	MSG_TYPE_END    = "end"    // 게임 종료
	MSG_TYPE_ERROR  = "error"  // 에러
)

type Msg struct {
	Type     string `json:"type"`
	ClientId string `json:"client_id"`
	Event    Event  `json:"event"`
}

func MakeMsg(clientId, msgType string, ev Event) Msg {
	return Msg{ClientId: clientId, Type: msgType, Event: ev}
}
