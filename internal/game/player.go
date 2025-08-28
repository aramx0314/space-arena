package game

import (
	"math"
	"space_arena/internal/model"
)

const (
	PLAYER_FIRE_COOLDOWN = 1.5
	PLAYER_MOVE_SPEED    = GAME_OBJECT_WIDTH * 2.5
	PLAYER_ROTATE_SPEED  = 1
)

type Player struct {
	Id  string
	Idx int
	// MsgChan      chan model.Msg
	Client       *model.Client
	X            float64
	Y            float64
	W            float64
	H            float64
	DirX         int // 0: 이동 없음, 1: 오른쪽 방향, -1: 왼쪽 방향
	DirY         int // 0: 이동 없음, 1: 위쪽 방향, -1: 아래쪽 방향
	DirR         int // 0: 회전 없음, 1: 오른쪽 방향, -1: 왼쪽 방향
	Angle        float64
	MoveSpeed    float64
	RotateSpeed  float64
	IsFire       bool
	FireCooldown float64
	IsDead       bool
}

func CreatePlayer(id string, idx int, c *model.Client, x, y, angle float64) *Player {
	p := Player{
		Id: id, Idx: idx, Client: c,
		X: x, Y: y, W: GAME_OBJECT_WIDTH, H: GAME_OBJECT_HEIGHT,
		Angle: angle, MoveSpeed: PLAYER_MOVE_SPEED, RotateSpeed: PLAYER_ROTATE_SPEED,
	}
	return &p
}

func (p *Player) Update(dt float64) {
	p.Angle = p.Angle + p.RotateSpeed*dt*float64(p.DirR)
	vx := math.Cos(p.Angle)*float64(p.DirX) + math.Cos(p.Angle+math.Pi/2)*float64(p.DirY)
	vy := math.Sin(p.Angle)*float64(p.DirX) + math.Sin(p.Angle+math.Pi/2)*float64(p.DirY)
	len := math.Hypot(vx, vy)
	if len > 0 {
		vx /= len
		vy /= len
		p.X += vx * p.MoveSpeed * dt
		p.Y += vy * p.MoveSpeed * dt
	}
}

func (p *Player) CheckFire(dt float64) bool {
	p.FireCooldown -= dt
	if p.FireCooldown < 0 {
		p.FireCooldown = 0
	}
	if p.IsFire && p.FireCooldown <= 0 {
		p.IsFire = false
		p.FireCooldown = PLAYER_FIRE_COOLDOWN
		return true
	}
	p.IsFire = false

	return false
}
