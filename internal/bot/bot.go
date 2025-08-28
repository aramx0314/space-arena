package bot

import (
	"encoding/json"
	"log"
	"math/rand"
	"net/url"
	"space_arena/internal/model"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

type Bot struct {
	id        string
	isDead    bool
	dirX      int
	dirY      int
	dirR      int
	conn      *websocket.Conn
	sendMutex sync.Mutex
}

func CreateBot() *Bot {
	return &Bot{}
}

func (b *Bot) Run(serverAddr string) {
	var err error
	u := url.URL{Scheme: "ws", Host: serverAddr, Path: "/ws"}
	log.Printf("connecting to %s", u.String())

	b.conn, _, err = websocket.DefaultDialer.Dial(u.String(), nil)
	if err != nil {
		log.Fatal("dial:", err)
	}
	defer b.conn.Close()

	for {
		_, message, err := b.conn.ReadMessage()
		if err != nil {
			log.Println("read:", err)
			break
		}
		var msg model.Msg
		if err := json.Unmarshal(message, &msg); err != nil {
			log.Println("json unmarshal error", err)
			break
		}

		switch msg.Type {
		case model.MSG_TYPE_HELLO:
			b.id = msg.ClientId
			b.sendMsg(model.Msg{
				ClientId: b.id,
				Type:     model.MSG_TYPE_READY,
			})

		case model.MSG_TYPE_START:
			time.Sleep(time.Millisecond * 1500)
			go b.run()

		case model.MSG_TYPE_INGAME:
			ev := msg.Event
			if ev.Type == model.EVENT_TYPE_GAME_VICTORY ||
				(ev.Type == model.EVENT_TYPE_PLAYER_DEAD && ev.OwnerId == b.id) {
				b.isDead = true
			}
		}
		log.Printf("recv: %s %s %s", msg.ClientId, msg.Type, msg.Event.Type)
	}
}

func (b *Bot) run() {
	go b.move()
	go b.rotate()
	go b.sendMove()
	go b.fire()
}

func (b *Bot) move() {
	if b.isDead {
		return
	}
	minDelay := 150
	maxDelay := 250
	delay := rand.Intn(maxDelay-minDelay+1) + minDelay
	time.Sleep(time.Millisecond * time.Duration(delay))

	b.dirX = rand.Intn(3) - 1
	b.dirY = rand.Intn(3) - 1
	b.move()
}

func (b *Bot) rotate() {
	if b.isDead {
		return
	}
	minDelay := 150
	maxDelay := 250
	delay := rand.Intn(maxDelay-minDelay+1) + minDelay
	time.Sleep(time.Millisecond * time.Duration(delay))

	b.dirR = rand.Intn(3) - 1
	b.rotate()
}

func (b *Bot) sendMove() {
	if b.isDead {
		return
	}
	minDelay := 200
	maxDelay := 400
	delay := rand.Intn(maxDelay-minDelay+1) + minDelay
	time.Sleep(time.Millisecond * time.Duration(delay))

	b.sendMsg(model.Msg{
		ClientId: b.id,
		Type:     model.MSG_TYPE_INGAME,
		Event: model.Event{
			Type: model.EVENT_TYPE_PLAYER_MOVE, OwnerId: b.id,
			Data: model.EventData{
				DirX: b.dirX,
				DirY: b.dirY,
				DirR: b.dirR,
			},
		},
	})
	b.sendMove()
}

func (b *Bot) fire() {
	if b.isDead {
		return
	}

	minDelay := 200
	maxDelay := 500
	delay := rand.Intn(maxDelay-minDelay+1) + minDelay
	time.Sleep(time.Millisecond * time.Duration(delay))

	if rand.Intn(3) > 0 {
		b.sendMsg(model.Msg{
			ClientId: b.id,
			Type:     model.MSG_TYPE_INGAME,
			Event: model.Event{
				Type: model.EVENT_TYPE_PLAYER_FIRE, OwnerId: b.id,
			},
		})
	}
	b.fire()
}

func (b *Bot) sendMsg(msg model.Msg) {
	b.sendMutex.Lock()
	defer b.sendMutex.Unlock()
	data, _ := json.Marshal(msg)
	b.conn.WriteMessage(websocket.TextMessage, data)
	log.Printf("send: %s %s", msg.ClientId, msg.Event.Type)
}
