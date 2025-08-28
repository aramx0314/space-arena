package main

import (
	"log"
	"space_arena/internal/bot"
	"space_arena/internal/utils"
	"strconv"
	"time"
)

func main() {
	numberOfBots, err := strconv.Atoi(utils.Getevn("NUMBER_OF_BOTS", "8"))
	if err != nil {
		log.Println(err.Error())
		return
	}
	serverAddr := utils.Getevn("SERVER_ADDR", "")

	bots := make(chan *bot.Bot, numberOfBots)
	for range numberOfBots {
		bots <- bot.CreateBot()
	}

	for b := range bots {
		go func() {
			b.Run(serverAddr)
			time.Sleep(time.Second)
			bots <- bot.CreateBot()
		}()
	}
}
