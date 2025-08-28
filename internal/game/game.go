package game

import (
	"fmt"
	"log"
	"math"
	"math/rand"
	"space_arena/internal/model"
	"space_arena/internal/utils"
	"time"
)

type Game struct {
	id                string                              // 게임 아이디
	worldSize         float64                             // 월드 범위
	worldMinSize      float64                             // 월드 범위 최소 크기
	worldSpeed        float64                             // 월드 범위가 좁혀지는 속도(per sec)
	worldFireCooldown float64                             // 발사체 생성 쿨다운 시간(sec)
	players           *utils.SafeMap[string, *Player]     // 모든 플레이어 목록
	playersAlive      *utils.SafeMap[string, *Player]     // 생존한 플레이어 목록
	projectiles       *utils.SafeMap[string, *Projectile] // 모든 발사체 목록
	eventRecvChan     chan model.Event                    // 이벤트 수신 채널
	eventSendChan     chan model.Event                    // 이벤트 전송 채널
}

func NewGame(id string, clients []*model.Client) *Game {
	g := Game{}
	g.id = id
	g.worldSize = GAME_OBJECT_WIDTH * 9
	g.worldMinSize = GAME_OBJECT_WIDTH * 2
	g.worldSpeed = GAME_OBJECT_WIDTH * 0.05
	g.worldFireCooldown = 5

	g.players = utils.NewSafeMap[string, *Player]()
	g.playersAlive = utils.NewSafeMap[string, *Player]()
	g.projectiles = utils.NewSafeMap[string, *Projectile]()

	g.eventRecvChan = make(chan model.Event, 1000)
	g.eventSendChan = make(chan model.Event, 1000)

	// 플레이어 생성
	for i, c := range clients {
		// 랜덤한 월드 영역 경계에서 스폰되도록 위치 계산
		angle := 2 * math.Pi * float64(i) / float64(len(clients))
		x := g.worldSize * math.Cos(angle)
		y := g.worldSize * math.Sin(angle)

		player := CreatePlayer(c.Id, i, c, x, y, angle-math.Pi/2)
		g.players.Set(c.Id, player)
		g.playersAlive.Set(c.Id, player)
	}

	return &g
}

func (g *Game) Run() {
	tickRate := 30
	interval := time.Second / time.Duration(tickRate)
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	// 게임 루프 시작
	endGame := false
	lastTime := time.Now()
	for range ticker.C {
		now := time.Now()
		dt := now.Sub(lastTime).Seconds()
		lastTime = now

		// 이벤트 처리
		g.eventHandler()

		// 게임 업데이트
		g.update(dt)

		// 게임 종료 체크
		if g.playersAlive.Len() <= 1 {
			g.playersAlive.Range(func(id string, player *Player) bool {
				// 이동 및 회전 중지
				g.eventSendChan <- model.Event{
					Type: model.EVENT_TYPE_PLAYER_MOVE, OwnerId: player.Id,
					Data: model.EventData{
						X: player.X, Y: player.Y, Angle: player.Angle,
						DirX: 0, DirY: 0, DirR: 0,
					},
				}

				//승리 메시지 전송
				player.Client.AddMsg(model.MakeMsg(player.Id, model.MSG_TYPE_INGAME, model.Event{
					Type: model.EVENT_TYPE_GAME_VICTORY, OwnerId: player.Id,
				}))
				return true
			})
			endGame = true
		}

		// 이벤트 전송
		g.broadcastEvent()

		// 게임 종료
		if endGame {
			break
		}
	}

	// 3초 후에 게임 종료
	time.Sleep(time.Second * 3)

	// 게임 종료 정리
	close(g.eventRecvChan)
	close(g.eventSendChan)
}

func (g *Game) createProjectile(ownerId string, typ int, x, y, angle float64) {
	projectile := CreateProjectile(ownerId, typ, x, y, angle)
	g.projectiles.Set(projectile.Id, projectile)

	// 플레이어 발사 이벤트 전송
	ev := model.Event{
		Type:    model.EVENT_TYPE_PROJECTILE_CREATE,
		OwnerId: projectile.OwnerId,
		Data: model.EventData{
			Id:  projectile.Id,
			Idx: projectile.Type,
			X:   projectile.X, Y: projectile.Y, Angle: projectile.Angle,
			MoveSpeed: projectile.MoveSpeed,
		},
	}
	g.eventSendChan <- ev
}

func (g *Game) update(dt float64) {
	// 발사체 생성
	g.worldFireCooldown -= dt
	if g.worldFireCooldown <= 0 && g.projectiles.Len() < 50 {
		for range rand.Intn(10) + 5 {
			angle := utils.RandRange(0, math.Pi*2)
			g.createProjectile(g.id, GAME_PROJECTILE_TYPE_ENERGYBALL, 0, 0, angle-math.Pi/2)
		}
		g.worldFireCooldown = utils.RandRange(0.25, 1.5)
	}

	// 월드 업데이트
	g.worldSize -= g.worldSpeed * dt
	if g.worldSize < g.worldMinSize {
		g.worldSize = g.worldMinSize
	}

	// 플레이어 업데이트
	g.playersAlive.Range(func(id string, p *Player) bool {
		// 플레이어 생존 체크
		if p.IsDead {
			return true
		}

		p.Update(dt)

		// 월드 영역 밖으로 나가지 않도록 체크
		dist := math.Hypot(p.X, p.Y)
		if dist > g.worldSize {
			scale := g.worldSize / dist
			p.X = p.X * scale
			p.Y = p.Y * scale
		}

		// 플레이어 발사 체크
		if p.CheckFire(dt) {
			// 발사체 오브젝트 생성
			g.createProjectile(p.Id, GAME_PROJECTILE_TYPE_LASER, p.X, p.Y, p.Angle-math.Pi/2)
		}
		return true
	})

	// 발사체 업데이트
	projectilesDelete := map[string]*Projectile{}
	playersHit := map[string]*Player{}
	g.projectiles.Range(func(id string, prj *Projectile) bool {
		prj.Update(dt)

		if prj.LiftTime <= 0 {
			projectilesDelete[prj.Id] = prj
		}

		// 플레이어와의 충돌 체크
		g.playersAlive.Range(func(id string, player *Player) bool {
			// 자기 자신이 발사한 발사체와는 충돌 체크하지 않음
			if prj.OwnerId == player.Id {
				return true
			}
			// 이미 충돌된 플레이어인지 체크
			if _, ok := playersHit[player.Id]; ok {
				return true
			}
			// 충돌 체크
			if utils.CircleCollision(prj.X, prj.Y, prj.W/2, player.X, player.Y, player.W/4) {
				projectilesDelete[prj.Id] = prj
				playersHit[player.Id] = player
				return false
			}
			return true
		})
		return true
	})

	// 발사체 삭제
	for id, prj := range projectilesDelete {
		g.projectiles.Delete(id)
		// 이벤트 전송
		ev := model.Event{
			Type:    model.EVENT_TYPE_PROJECTILE_EXTINCTION,
			OwnerId: prj.OwnerId,
			Data: model.EventData{
				Id: id,
			},
		}
		g.eventSendChan <- ev
	}

	// 플레이어 게임오버 처리
	for id, player := range playersHit {
		player.IsDead = true
		g.playersAlive.Delete(id)
		// 플레이어 죽음 이벤트 전파
		g.eventSendChan <- model.Event{
			Type:    model.EVENT_TYPE_PLAYER_DEAD,
			OwnerId: player.Id,
			Data: model.EventData{
				X: player.X,
				Y: player.Y,
			},
		}
	}
}

func (g *Game) AddEvent(ev model.Event) error {
	select {
	case g.eventRecvChan <- ev:
		return nil
	default:
		return fmt.Errorf("Game.AddEvent eventRecvChan <- ev failed")
	}
}

func (g *Game) DeletePlayer(id string) {
	g.players.Delete(id)
	g.playersAlive.Delete(id)
	g.AddEvent(model.Event{Type: model.EVENT_TYPE_PLAYER_DISCONNECT, OwnerId: id})
}

func (g *Game) sendInitData(id string) {
	p, ok := g.players.Get(id)
	if !ok {
		log.Println("client not found:", id)
		return
	}

	// 월드 데이터 전송
	ev := model.Event{
		Type:    model.EVENT_TYPE_GAME_INIT,
		OwnerId: g.id,
		Data: model.EventData{
			X:         g.worldSize,
			Y:         g.worldMinSize,
			MoveSpeed: g.worldSpeed,
		},
	}
	p.Client.AddMsg(model.MakeMsg(id, model.MSG_TYPE_INGAME, ev))

	// 플레이어 데이터 전송
	g.players.Range(func(pid string, player *Player) bool {
		ev := model.Event{
			Type:    model.EVENT_TYPE_PLAYER_CREATE,
			OwnerId: pid,
			Data: model.EventData{
				Idx: player.Idx, X: player.X, Y: player.Y, Angle: player.Angle,
				MoveSpeed: player.MoveSpeed, RotateSpeed: player.RotateSpeed,
			},
		}
		p.Client.AddMsg(model.MakeMsg(pid, model.MSG_TYPE_INGAME, ev))
		return true
	})
}

func (g *Game) eventHandler() {
	for {
		select {
		case ev := <-g.eventRecvChan:
			p, ok := g.players.Get(ev.OwnerId)
			if !ok {
				log.Println("player not found:", ev.OwnerId)
				break
			}
			switch ev.Type {
			case model.EVENT_TYPE_GAME_INIT:
				g.sendInitData(ev.OwnerId)

			case model.EVENT_TYPE_PLAYER_MOVE:
				// 해당 플레이어 이동 방향 업데이트
				p.DirX = ev.Data.DirX
				p.DirY = ev.Data.DirY
				p.DirR = ev.Data.DirR

				// 해당 이벤트를 모든 플레이어에게 전파
				ev.Data.Idx = p.Idx
				ev.Data.X = p.X
				ev.Data.Y = p.Y
				ev.Data.Angle = p.Angle
				g.eventSendChan <- ev

			case model.EVENT_TYPE_PLAYER_FIRE:
				p.IsFire = true

			case model.EVENT_TYPE_PLAYER_DISCONNECT:
				// DEAD 처리하도록 다른 플레이어에게 전파
				ev := model.Event{
					Type:    model.EVENT_TYPE_PLAYER_DEAD,
					OwnerId: ev.OwnerId,
				}
				g.eventSendChan <- ev
			}
		default:
			return
		}
	}
}

func (g *Game) broadcastEvent() {
	for {
		select {
		case ev := <-g.eventSendChan:
			g.players.Range(func(id string, p *Player) bool {
				p.Client.AddMsg(model.MakeMsg(id, model.MSG_TYPE_INGAME, ev))
				return true
			})

		default:
			return
		}
	}
}
