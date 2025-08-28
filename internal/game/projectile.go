package game

import (
	"math"
	"space_arena/internal/utils"
)

const (
	GAME_PROJECTILE_TYPE_LASER      = 0
	GAME_PROJECTILE_TYPE_ENERGYBALL = 1
)

const (
	GAME_PROJECTILE_SPEED_LASER      = 10 * GAME_OBJECT_WIDTH
	GAME_PROJECTILE_SPEED_ENERGYBALL = 1.5 * GAME_OBJECT_WIDTH
)

const (
	GAME_PROJECTILE_LIFETIME_LASER      = 2
	GAME_PROJECTILE_LIFETIME_ENERGYBALL = 7
)

type Projectile struct {
	Id        string
	OwnerId   string
	Type      int
	X         float64
	Y         float64
	W         float64
	H         float64
	Angle     float64
	MoveSpeed float64
	LiftTime  float64
}

func CreateProjectile(ownerId string, t int, x, y, angle float64) *Projectile {
	p := Projectile{
		Id:      utils.RandomCapAlphaNumeric(10),
		OwnerId: ownerId,
		Type:    t,
		X:       x,
		Y:       y,
		W:       GAME_OBJECT_WIDTH / 20,
		H:       GAME_OBJECT_HEIGHT / 20,
		Angle:   angle,
	}

	switch t {
	case GAME_PROJECTILE_TYPE_LASER:
		p.MoveSpeed = GAME_PROJECTILE_SPEED_LASER
		p.LiftTime = GAME_PROJECTILE_LIFETIME_LASER

	case GAME_PROJECTILE_TYPE_ENERGYBALL:
		p.MoveSpeed = GAME_PROJECTILE_SPEED_ENERGYBALL
		p.LiftTime = GAME_PROJECTILE_LIFETIME_ENERGYBALL
	}

	return &p
}

func (p *Projectile) Update(dt float64) {
	p.LiftTime -= dt
	if p.LiftTime < 0 {
		p.LiftTime = 0
	}
	p.X += math.Cos(p.Angle) * p.MoveSpeed * dt
	p.Y += math.Sin(p.Angle) * p.MoveSpeed * dt
}
