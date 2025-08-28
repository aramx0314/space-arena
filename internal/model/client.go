package model

import "github.com/gorilla/websocket"

const (
	CLIENT_STATUS_CONNECTED    = "connected"
	CLIENT_STATUS_DISCONNECTED = "disconnected"
)

type Client struct {
	Id      string
	GameId  string
	Status  string
	Conn    *websocket.Conn
	msgChan chan Msg
}

func CreateClient(id string, conn *websocket.Conn) *Client {
	return &Client{
		Id:      id,
		Status:  CLIENT_STATUS_CONNECTED,
		msgChan: make(chan Msg, 1000),
		Conn:    conn,
	}
}

func (c *Client) GetMsgChan() chan Msg {
	return c.msgChan
}

func (c *Client) AddMsg(msg Msg) {
	if c.Status != CLIENT_STATUS_DISCONNECTED {
		c.msgChan <- msg
	}
}

func (c *Client) CloseChan() {
	c.Status = CLIENT_STATUS_DISCONNECTED
	close(c.msgChan)
}
