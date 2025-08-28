package server

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"space_arena/internal/game"
	"space_arena/internal/model"
	"space_arena/internal/utils"
	"strings"
	"sync"

	"github.com/gorilla/websocket"
)

const (
	GAME_PLAYER_NUM = 9 // 게임당 최대 9명 플레이 가능
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type Server struct {
	games            *utils.SafeMap[string, *game.Game]
	clients          *utils.SafeMap[string, *model.Client]
	recvMsgChan      chan model.Msg
	clientReadyQueue utils.Queue[*model.Client]
	clientRemoveMu   sync.Mutex
}

func New() *Server {
	s := &Server{
		games:       utils.NewSafeMap[string, *game.Game](),
		clients:     utils.NewSafeMap[string, *model.Client](),
		recvMsgChan: make(chan model.Msg, 100000),
	}

	http.Handle("/", http.FileServer(http.Dir("./web")))
	http.HandleFunc("/ws", s.WsController)
	return s
}

func (s *Server) Run() {
	go s.msgHandler()
	log.Println("server on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func (s *Server) WsController(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("websocket upgrader.Upgrade error:", err)
		return
	}

	// 클라이언트 아이디 생성
	id := utils.RandomCapAlphaNumeric(10)

	// 최초 패킷 전송
	err = conn.WriteJSON(model.MakeMsg(id, model.MSG_TYPE_HELLO, model.Event{}))
	if err != nil {
		log.Println("websocket conn.WriteJSON error:", err)
		return
	}
	log.Println("client connected", id)

	// 클라이언트 등록
	s.addClient(id, conn)
	c, _ := s.clients.Get(id)

	// 게임으로부터 전달받은 메시지를 클라이언트로 전송
	go func() {
		for msg := range c.GetMsgChan() {
			if err := conn.WriteJSON(msg); err != nil {
				log.Println("ws WriteJSON error:", err)
				break
			}
		}
	}()

	// 클라이언트로부터 수신한 메시지를 게임으로 전달
	for {
		_, data, err := conn.ReadMessage()
		if err != nil {
			if strings.Contains(err.Error(), "use of closed network connection") ||
				strings.Contains(err.Error(), "read: connection reset by peer") ||
				strings.Contains(err.Error(), "websocket: close 1001 (going away)") ||
				strings.Contains(err.Error(), "websocket: close 1006 (abnormal closure): unexpected EOF") {
				log.Println("client disconnected", id)
			} else {
				log.Println("conn.ReadMessage error:", err, id)
			}
			break
		}
		var msg model.Msg
		if err := json.Unmarshal(data, &msg); err != nil {
			log.Println("json.Unmarshal error:", err, id)
			break
		}
		if err := s.addRecvMsg(msg); err != nil {
			log.Println("addRecvMsg error:", err, id)
			break
		}
	}

	c, ok := s.clients.Get(id)
	if !ok {
		return
	}
	g, ok := s.games.Get(c.GameId)
	if ok {
		// 클라이언트가 참여중인 게임이 있는 경우: 플레이어 삭제 및 연결 해제 이벤트 전송
		g.DeletePlayer(id)
	} else {
		// 아직 참여중인 게임이 없는 경우: 대기 큐에서 삭제
		s.clientReadyQueue.Remove(c)
	}
	// 클라이언트 삭제
	s.removeClient(id)
}

func (s *Server) addClient(id string, conn *websocket.Conn) {
	client := model.CreateClient(id, conn)
	s.clients.Set(id, client)
}

func (s *Server) removeClient(id string) {
	s.clientRemoveMu.Lock()
	defer s.clientRemoveMu.Unlock()
	c, ok := s.clients.Get(id)
	if !ok {
		return
	}
	c.CloseChan()
	c.Conn.Close()
	s.clients.Delete(id)
}

func (s *Server) addRecvMsg(msg model.Msg) error {
	select {
	case s.recvMsgChan <- msg:
		return nil
	default:
		return fmt.Errorf("Server.addRecvMsg: recvMsgChan <- msg failed")
	}
}

func (s *Server) msgHandler() {
	go func() {
		for msg := range s.recvMsgChan {
			c, ok := s.clients.Get(msg.ClientId)
			if !ok {
				// 등록되지 않은 클라이언트
				log.Println("unregistered client id", msg.ClientId)
				continue
			}

			switch msg.Type {
			// 게임 준비 메시지
			case model.MSG_TYPE_READY:
				s.clientReadyQueue.Enqueue(c)
				c.AddMsg(model.MakeMsg(c.Id, model.MSG_TYPE_READY, model.Event{}))
				s.matching()

			// 게임 준비 취소 메시지
			case model.MSG_TYPE_CANCEL:
				if ok := s.clientReadyQueue.Remove(c); !ok {
					c.AddMsg(model.MakeMsg(c.Id, model.MSG_TYPE_ERROR, model.Event{}))
				} else {
					c.AddMsg(model.MakeMsg(c.Id, model.MSG_TYPE_CANCEL, model.Event{}))
				}

			// 인게임 메시지
			case model.MSG_TYPE_INGAME:
				g, ok := s.games.Get(c.GameId)
				if ok {
					g.AddEvent(msg.Event)
				}
			}
		}
	}()
}

func (s *Server) matching() {
	// 게임을 시작하기에 플레이어 수가 충분하지 않음
	if s.clientReadyQueue.Len() < GAME_PLAYER_NUM {
		return
	}

	// 클라이언트 ready 큐에서 플레이어 모집
	gameId := utils.RandomCapAlphaNumeric(10)
	matchingClient := []*model.Client{}
	for range GAME_PLAYER_NUM {
		c, ok := s.clientReadyQueue.Dequeue()
		if !ok {
			log.Println("clientReadyQueue Dequeue not ok", gameId)
			break
		}
		c.GameId = gameId
		matchingClient = append(matchingClient, c)
	}

	// 모든 클라이언트 매칭에 실패한 경우
	if len(matchingClient) != GAME_PLAYER_NUM {
		for i := len(matchingClient) - 1; i >= 0; i-- {
			// 클라이언트 ready 큐의 맨 앞에 다시 추가
			s.clientReadyQueue.PushFront(matchingClient[i])
		}
		return
	}

	go func() {
		// 클라이언트에게 게임 시작 메시지 전송
		for _, c := range matchingClient {
			if _, ok := s.clients.Get(c.Id); ok {
				c.AddMsg(model.MakeMsg(c.Id, model.MSG_TYPE_START, model.Event{}))
			}
		}

		// 게임 생성
		g := game.NewGame(gameId, matchingClient)
		s.games.Set(gameId, g)
		log.Println("game start", gameId, s.games.Len())

		// 게임 시작
		g.Run()

		// 게임 종료
		s.games.Delete(gameId)
		log.Println("game end", gameId, s.games.Len())

		// 클라이언트 삭제
		for _, c := range matchingClient {
			s.removeClient(c.Id)
		}
	}()
}
