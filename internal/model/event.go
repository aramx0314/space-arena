package model

const (
	EVENT_TYPE_GAME_INIT             = "game_init"
	EVENT_TYPE_GAME_OVER             = "game_over"
	EVENT_TYPE_GAME_VICTORY          = "game_victory"
	EVENT_TYPE_PLAYER_DISCONNECT     = "player_disconnect"
	EVENT_TYPE_PLAYER_CREATE         = "player_create"
	EVENT_TYPE_PLAYER_DEAD           = "player_dead"
	EVENT_TYPE_PLAYER_MOVE           = "player_move"
	EVENT_TYPE_PLAYER_FIRE           = "player_fire"
	EVENT_TYPE_PROJECTILE_CREATE     = "projectile_create"
	EVENT_TYPE_PROJECTILE_EXTINCTION = "projectile_extinction"
)

type Event struct {
	Type    string    `json:"type"`
	OwnerId string    `json:"owner_id"`
	Data    EventData `json:"data"`
}

type EventData struct {
	Id          string  `json:"id"`
	Idx         int     `json:"idx"`
	X           float64 `json:"x"`
	Y           float64 `json:"y"`
	Angle       float64 `json:"angle"`
	DirX        int     `json:"dir_x"`
	DirY        int     `json:"dir_y"`
	DirR        int     `json:"dir_r"`
	MoveSpeed   float64 `json:"move_speed"`
	RotateSpeed float64 `json:"rotate_speed"`
}
