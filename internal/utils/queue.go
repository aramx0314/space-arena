package utils

import "sync"

type Queue[T comparable] struct {
	mu    sync.Mutex
	items []T
}

func (q *Queue[T]) PushFront(item T) {
	q.mu.Lock()
	defer q.mu.Unlock()
	q.items = append([]T{item}, q.items...)
}

func (q *Queue[T]) Enqueue(v T) {
	q.mu.Lock()
	defer q.mu.Unlock()
	q.items = append(q.items, v)
}

func (q *Queue[T]) Dequeue() (T, bool) {
	q.mu.Lock()
	defer q.mu.Unlock()

	var zero T
	if len(q.items) == 0 {
		return zero, false
	}
	v := q.items[0]
	q.items = q.items[1:]
	return v, true
}

func (q *Queue[T]) Peek() (T, bool) {
	q.mu.Lock()
	defer q.mu.Unlock()

	var zero T
	if len(q.items) == 0 {
		return zero, false
	}
	return q.items[0], true
}

func (q *Queue[T]) Len() int {
	q.mu.Lock()
	defer q.mu.Unlock()
	return len(q.items)
}

func (q *Queue[T]) Remove(value T) bool {
	q.mu.Lock()
	defer q.mu.Unlock()

	for i, v := range q.items {
		if v == value {
			q.items = append(q.items[:i], q.items[i+1:]...)
			return true
		}
	}
	return false
}
