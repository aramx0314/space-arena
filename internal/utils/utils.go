package utils

import (
	"math/rand"
	"os"
)

func RandomCapAlphaNumeric(length int) string {
	const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, length)
	for i := range b {
		b[i] = letters[rand.Intn(len(letters))]
	}
	return string(b)
}

func RandRange(a, b float64) float64 {
	return rand.Float64()*(b-a) + a
}

func CircleCollision(x1, y1, r1, x2, y2, r2 float64) bool {
	dx := x1 - x2
	dy := y1 - y2
	sumR := r1 + r2
	return dx*dx+dy*dy <= sumR*sumR
}

func Getevn(key string, defaultValue string) string {
	v := os.Getenv(key)
	if v == "" {
		return defaultValue
	}
	return v
}
