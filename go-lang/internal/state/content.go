// Package state 提供内容状态管理，包括当前输入内容和历史卡片的管理
// Package state provides content state management, including current input content and history card management
package state

import (
	"strings"
	"sync"
	"time"
	"unicode"
	"unicode/utf8"
)

// ContentState 表示内容状态管理器
// ContentState represents the content state manager
type ContentState struct {
	mu               sync.RWMutex
	currentContent   string
	lastInputTime    time.Time
	historyCards     []string
	segmentInterval  time.Duration
	maxCardCount     int
	maxCardLength    int
}

// NewContentState 创建并返回一个新的内容状态管理器
// NewContentState creates and returns a new content state manager
func NewContentState(segmentInterval time.Duration, maxCardCount, maxCardLength int) *ContentState {
	return &ContentState{
		currentContent: "",
		lastInputTime:   time.Now(),
		historyCards:    make([]string, 0),
		segmentInterval: segmentInterval,
		maxCardCount:    maxCardCount,
		maxCardLength:   maxCardLength,
	}
}

// UpdateContent 将新内容追加到当前输入内容中
// UpdateContent appends new content to the current input content
func (cs *ContentState) UpdateContent(content string) {
	cs.mu.Lock()
	defer cs.mu.Unlock()

	// 累加内容（增量发送）
	cs.currentContent += content
	cs.lastInputTime = time.Now()

	// 清理开头的标点符号 / Clean leading punctuation
	cs.currentContent = CleanLeadingPunctuation(cs.currentContent)
}

// GetCurrentContent 返回当前正在输入的完整内容
// GetCurrentContent returns the current input content
func (cs *ContentState) GetCurrentContent() string {
	cs.mu.RLock()
	defer cs.mu.RUnlock()
	return cs.currentContent
}

// GetHistoryCards 返回所有历史卡片的副本
// GetHistoryCards returns a copy of all history cards
func (cs *ContentState) GetHistoryCards() []string {
	cs.mu.RLock()
	defer cs.mu.RUnlock()

	// 返回副本
	cards := make([]string, len(cs.historyCards))
	copy(cards, cs.historyCards)
	return cards
}

// AddCard 将内容添加到历史卡片列表中
// AddCard adds content to the history card list
func (cs *ContentState) AddCard(content string) {
	cs.mu.Lock()
	defer cs.mu.Unlock()

	// 清理开头的标点符号 / Clean leading punctuation
	content = CleanLeadingPunctuation(content)

	// 过滤无意义内容 / Filter meaningless content
	if !IsContentMeaningful(content) {
		// 清空当前内容，避免重复触发分段
		cs.currentContent = ""
		return
	}

	// 检查是否需要分段（按字符数计算）
	if utf8.RuneCountInString(content) > cs.maxCardLength {
		segments := cs.splitContent(content, cs.maxCardLength)
		cs.historyCards = append(cs.historyCards, segments...)
	} else {
		cs.historyCards = append(cs.historyCards, content)
	}

	// 限制卡片数量
	if len(cs.historyCards) > cs.maxCardCount {
		cs.historyCards = cs.historyCards[len(cs.historyCards)-cs.maxCardCount:]
	}

	// 清空当前内容
	cs.currentContent = ""
}

// splitContent 将内容按指定最大长度分割成多个片段
// splitContent splits content into multiple segments by specified maximum length
func (cs *ContentState) splitContent(content string, maxLength int) []string {
	var segments []string
	// 按字符数（rune count）计算长度，而不是字节长度
	runes := []rune(content)
	for len(runes) > maxLength {
		segments = append(segments, string(runes[:maxLength]))
		runes = runes[maxLength:]
	}
	if len(runes) > 0 {
		segments = append(segments, string(runes))
	}
	return segments
}

// CleanLeadingPunctuation 清理开头的中文标点符号（。！？，）
// CleanLeadingPunctuation removes leading Chinese punctuation marks (。！？，)
func CleanLeadingPunctuation(content string) string {
	// 去除开头的空白字符 / Remove leading whitespace
	content = strings.TrimSpace(content)

	// 去除开头的 。！？，
	runes := []rune(content)
	for len(runes) > 0 {
		firstChar := runes[0]
		if firstChar == '。' || firstChar == '！' || firstChar == '？' || firstChar == '，' {
			runes = runes[1:]
			// 去除空白字符 / Remove whitespace
			for len(runes) > 0 && unicode.IsSpace(runes[0]) {
				runes = runes[1:]
			}
		} else {
			break
		}
	}

	return string(runes)
}

// IsContentMeaningful 检查内容是否有意义
// 返回 false 表示内容应该被过滤（空白、单独标点等）
// IsContentMeaningful checks if content is meaningful
// Returns false if content should be filtered (whitespace, single punctuation, etc.)
func IsContentMeaningful(content string) bool {
	// 空字符串 / Empty string
	if content == "" {
		return false
	}

	// 只包含空白字符 / Only whitespace characters
	hasNonSpace := false
	for _, r := range content {
		if !unicode.IsSpace(r) {
			hasNonSpace = true
			break
		}
	}
	if !hasNonSpace {
		return false
	}

	// 单独的标点符号 / Single punctuation character
	if utf8.RuneCountInString(content) == 1 {
		for _, r := range content {
			// 空白字符 / Whitespace
			if unicode.IsSpace(r) {
				return false
			}
			// 标点符号（包括中文和英文） / Punctuation (including Chinese and English)
			if unicode.IsPunct(r) {
				return false
			}
		}
	}

	return true
}

// ShouldSegment 判断当前内容是否应该触发自动分段
// ShouldSegment determines if the current content should trigger automatic segmentation
func (cs *ContentState) ShouldSegment() bool {
	cs.mu.RLock()
	defer cs.mu.RUnlock()

	if cs.currentContent == "" {
		return false
	}

	return time.Since(cs.lastInputTime) > cs.segmentInterval
}

// Clear 清空所有内容
// Clear clears all content
func (cs *ContentState) Clear() {
	cs.mu.Lock()
	defer cs.mu.Unlock()

	cs.currentContent = ""
	cs.historyCards = make([]string, 0)
	cs.lastInputTime = time.Now()
}