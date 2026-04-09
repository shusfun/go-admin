package devctl

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"strings"
	"time"

	"github.com/gdamore/tcell/v2"
	"github.com/mattn/go-runewidth"
	"github.com/rivo/tview"
	"github.com/spf13/cobra"
)

// ---------------------------------------------------------------------------
// 配色
// ---------------------------------------------------------------------------

var (
	tuiColorBackground  = tcell.NewHexColor(0x0B0F14)
	tuiColorPanel       = tcell.NewHexColor(0x11161D)
	tuiColorPanelAlt    = tcell.NewHexColor(0x151B23)
	tuiColorBorder      = tcell.NewHexColor(0x2B3542)
	tuiColorBorderFocus = tcell.NewHexColor(0x7DD3FC)
	tuiColorText        = tcell.NewHexColor(0xCBD5E1)
	tuiColorMuted       = tcell.NewHexColor(0x8A97A8)
	tuiColorAccent      = tcell.NewHexColor(0x93C5FD)
	tuiColorSuccess     = tcell.NewHexColor(0x34D399)
	tuiColorWarning     = tcell.NewHexColor(0xFBBF24)
	tuiColorDanger      = tcell.NewHexColor(0xF87171)
	tuiColorInfo        = tcell.NewHexColor(0x60A5FA)
	tuiColorSelection   = tcell.NewHexColor(0x1D2836)
)

// ---------------------------------------------------------------------------
// Cobra 入口
// ---------------------------------------------------------------------------

func newTUICommand() *cobra.Command {
	return &cobra.Command{
		Use:   "tui",
		Short: "打开交互式控制台",
		RunE: func(cmd *cobra.Command, args []string) error {
			app, err := loadApp()
			if err != nil {
				return err
			}
			return runTUIProgram(app)
		},
	}
}

func runTUIProgram(app *App) error {
	return newTUIController(app).run()
}

// ---------------------------------------------------------------------------
// 动作定义
// ---------------------------------------------------------------------------

type tuiSelectionMode string

const (
	tuiSelectionNone            tuiSelectionMode = "none"
	tuiSelectionCurrentOrMarked tuiSelectionMode = "current_or_marked"
	tuiSelectionSingle          tuiSelectionMode = "single"
)

type tuiActionSpec struct {
	id              string
	title           string
	key             rune
	selection       tuiSelectionMode
	cliArgs         func([]string) []string
	requiresConfirm bool
	confirmTitle    string
	confirmBody     func(*App, []string) string
}

type tuiActionGroup struct {
	name    string
	hotkey  rune // '1'..'5'
	actions []tuiActionSpec
}

// ---------------------------------------------------------------------------
// 焦点面板
// ---------------------------------------------------------------------------

type tuiFocusPanel int

const (
	tuiFocusTable tuiFocusPanel = iota
	tuiFocusActions
	tuiFocusDetail
)

// ---------------------------------------------------------------------------
// 控制器
// ---------------------------------------------------------------------------

type tuiController struct {
	app      *App
	ui       *tview.Application
	root     *tview.Pages
	services []ServiceSpec
	selected map[string]bool

	// UI 组件
	statusBar *tview.TextView
	table     *tview.Table
	groupBar  *tview.TextView
	actions   *tview.List
	detail    *tview.TextView

	// 动作分组
	groups      []tuiActionGroup
	activeGroup int

	// 状态
	focus     tuiFocusPanel
	busy      bool
	lastState RuntimeState
	lastEvent string
	hotUntil  time.Time

	// 全屏模式
	mainLayout *tview.Flex
	fullscreen bool
}

func newTUIController(app *App) *tuiController {
	c := &tuiController{
		app:      app,
		ui:       tview.NewApplication(),
		services: allServices(app),
		selected: map[string]bool{},
	}

	// 状态栏：1-2 行
	c.statusBar = tview.NewTextView().
		SetDynamicColors(true).
		SetWrap(false)
	c.statusBar.SetBorder(false)

	// 服务列表
	c.table = tview.NewTable().
		SetSelectable(true, false).
		SetFixed(1, 0).
		SetEvaluateAllRows(true).
		SetSeparator(' ')
	c.table.SetBorder(true).SetTitle(" 服务 ")

	// 分组标签栏
	c.groupBar = tview.NewTextView().
		SetDynamicColors(true).
		SetWrap(false).
		SetTextAlign(tview.AlignLeft)
	c.groupBar.SetBorder(false)

	// 动作列表
	c.actions = tview.NewList().
		ShowSecondaryText(false)
	c.actions.SetBorder(true).SetTitle(" 动作 ")

	// 输出 / 日志
	c.detail = tview.NewTextView().
		SetDynamicColors(true).
		SetWrap(true).
		SetScrollable(true)
	c.detail.SetBorder(true).SetTitle(" 输出 ")

	c.applyTheme()
	c.groups = defaultTUIActionGroups()
	c.activeGroup = 0
	c.rebuildActionList()
	c.refreshViews(true)
	c.setDetailText(c.defaultDetail())
	c.setFocusPanel(tuiFocusTable)
	c.installKeybindings()
	return c
}

// ---------------------------------------------------------------------------
// 主循环
// ---------------------------------------------------------------------------

func (c *tuiController) run() error {
	// 右侧：分组标签 + 动作列表
	rightPane := tview.NewFlex().SetDirection(tview.FlexRow).
		AddItem(c.groupBar, 1, 0, false).
		AddItem(c.actions, 0, 1, false)

	// 上部：服务列表 + 右侧动作
	topPane := tview.NewFlex().
		AddItem(c.table, 0, 3, true).
		AddItem(rightPane, 30, 0, false)

	// 主布局
	c.mainLayout = tview.NewFlex().SetDirection(tview.FlexRow).
		AddItem(c.statusBar, 2, 0, false).
		AddItem(topPane, 0, 3, true).
		AddItem(c.detail, 14, 0, false)

	c.root = tview.NewPages().
		AddPage("main", c.mainLayout, true, true)

	stopCh := make(chan struct{})
	defer close(stopCh)

	go func() {
		for {
			select {
			case <-time.After(c.refreshInterval()):
				c.ui.QueueUpdateDraw(func() {
					c.refreshViews(false)
				})
			case <-stopCh:
				return
			}
		}
	}()

	return c.ui.SetRoot(c.root, true).Run()
}

func (c *tuiController) refreshInterval() time.Duration {
	if c.busy {
		return 120 * time.Millisecond
	}
	if time.Now().Before(c.hotUntil) {
		return 180 * time.Millisecond
	}
	return 450 * time.Millisecond
}

// ---------------------------------------------------------------------------
// 主题
// ---------------------------------------------------------------------------

func (c *tuiController) applyTheme() {
	tview.Styles.PrimitiveBackgroundColor = tuiColorBackground
	tview.Styles.ContrastBackgroundColor = tuiColorPanel
	tview.Styles.MoreContrastBackgroundColor = tuiColorPanelAlt
	tview.Styles.BorderColor = tuiColorBorder
	tview.Styles.TitleColor = tuiColorMuted
	tview.Styles.GraphicsColor = tuiColorBorder
	tview.Styles.PrimaryTextColor = tuiColorText
	tview.Styles.SecondaryTextColor = tuiColorMuted
	tview.Styles.TertiaryTextColor = tuiColorAccent
	tview.Styles.InverseTextColor = tuiColorBackground
	tview.Styles.ContrastSecondaryTextColor = tuiColorText

	c.statusBar.SetBackgroundColor(tuiColorBackground)
	c.statusBar.SetTextColor(tuiColorText)

	c.groupBar.SetBackgroundColor(tuiColorPanel)
	c.groupBar.SetTextColor(tuiColorMuted)

	c.table.SetBackgroundColor(tuiColorPanel)
	c.table.SetSelectedStyle(tcell.StyleDefault.Background(tuiColorSelection).Foreground(tuiColorText).Bold(true))

	c.actions.SetBackgroundColor(tuiColorPanel)
	c.actions.SetMainTextColor(tuiColorText)
	c.actions.SetSelectedTextColor(tuiColorText)
	c.actions.SetSelectedBackgroundColor(tuiColorSelection)

	c.detail.SetBackgroundColor(tuiColorPanelAlt)
	c.detail.SetTextColor(tuiColorText)
}

// ---------------------------------------------------------------------------
// 快捷键
// ---------------------------------------------------------------------------

func (c *tuiController) installKeybindings() {
	c.ui.SetInputCapture(func(event *tcell.EventKey) *tcell.EventKey {
		// 弹窗时只放行 Ctrl+C
		if _, ok := c.ui.GetFocus().(*tview.Modal); ok && event.Key() != tcell.KeyCtrlC {
			return event
		}

		// 全局键
		switch event.Key() {
		case tcell.KeyCtrlC:
			c.ui.Stop()
			return nil
		case tcell.KeyTAB:
			c.cycleFocus(1)
			return nil
		case tcell.KeyBacktab:
			c.cycleFocus(-1)
			return nil
		case tcell.KeyLeft:
			c.switchGroup(c.activeGroup - 1)
			return nil
		case tcell.KeyRight:
			c.switchGroup(c.activeGroup + 1)
			return nil
		case tcell.KeyEsc:
			if c.fullscreen {
				c.toggleFullscreen()
				return nil
			}
			// Esc 返回服务面板
			c.setFocusPanel(tuiFocusTable)
			return nil
		}

		ch := event.Rune()

		// 全局快捷键：q 退出，z 全屏切换
		if ch == 'q' {
			c.ui.Stop()
			return nil
		}
		if ch == 'z' {
			c.toggleFullscreen()
			return nil
		}

		// 数字键 1-9 切换动作组（隐藏快捷键）
		if ch >= '1' && ch <= '9' {
			idx := int(ch - '1')
			if idx < len(c.groups) {
				c.switchGroup(idx)
				return nil
			}
		}

		// 面板特有快捷键
		switch c.focus {
		case tuiFocusTable:
			if ch == ' ' {
				c.toggleCurrentServiceSelection()
				return nil
			}
			if event.Key() == tcell.KeyEnter {
				c.executeCurrentAction()
				return nil
			}
			// 字母快捷键触发动作
			if c.tryActionHotkey(ch) {
				return nil
			}
		case tuiFocusActions:
			if event.Key() == tcell.KeyEnter {
				c.executeCurrentAction()
				return nil
			}
		case tuiFocusDetail:
			// detail 面板聚焦时，上下键滚动（tview 自动处理）
			// 字母键仍可触发动作
			if c.tryActionHotkey(ch) {
				return nil
			}
		}

		return event
	})
}

func (c *tuiController) tryActionHotkey(ch rune) bool {
	if ch == 0 {
		return false
	}
	group := c.groups[c.activeGroup]
	for _, action := range group.actions {
		if action.key != 0 && action.key == ch {
			c.executeAction(action.id)
			return true
		}
	}
	return false
}

// ---------------------------------------------------------------------------
// 焦点管理
// ---------------------------------------------------------------------------

func (c *tuiController) cycleFocus(direction int) {
	panels := []tuiFocusPanel{tuiFocusTable, tuiFocusActions, tuiFocusDetail}
	current := 0
	for i, p := range panels {
		if p == c.focus {
			current = i
			break
		}
	}
	next := (current + direction + len(panels)) % len(panels)
	c.setFocusPanel(panels[next])
}

func (c *tuiController) setFocusPanel(panel tuiFocusPanel) {
	c.focus = panel

	// 重置所有边框颜色
	c.table.SetBorderColor(tuiColorBorder)
	c.actions.SetBorderColor(tuiColorBorder)
	c.detail.SetBorderColor(tuiColorBorder)

	// 重置标题
	c.table.SetTitle(" 服务 ")
	c.actions.SetTitle(" 动作 ")
	c.detail.SetTitle(" 输出 ")

	switch panel {
	case tuiFocusTable:
		c.table.SetBorderColor(tuiColorBorderFocus)
		c.table.SetTitle(" 服务 [::b]◀[::-] ")
		c.ui.SetFocus(c.table)
	case tuiFocusActions:
		c.actions.SetBorderColor(tuiColorBorderFocus)
		c.actions.SetTitle(" 动作 [::b]◀[::-] ")
		c.ui.SetFocus(c.actions)
	case tuiFocusDetail:
		c.detail.SetBorderColor(tuiColorBorderFocus)
		c.detail.SetTitle(" 输出 [::b]◀[::-] ")
		c.ui.SetFocus(c.detail)
	}
}

// ---------------------------------------------------------------------------
// 全屏切换
// ---------------------------------------------------------------------------

func (c *tuiController) toggleFullscreen() {
	if c.fullscreen {
		c.root.SwitchToPage("main")
		c.fullscreen = false
		c.setFocusPanel(c.focus)
	} else {
		fullView := tview.NewTextView().
			SetDynamicColors(true).
			SetWrap(true).
			SetScrollable(true)
		fullView.SetBorder(true).
			SetTitle(" 输出（全屏）[z] 返回 ").
			SetBorderColor(tuiColorBorderFocus)
		fullView.SetBackgroundColor(tuiColorPanelAlt)
		fullView.SetTextColor(tuiColorText)
		fullView.SetText(c.detail.GetText(false))
		c.root.AddPage("fullscreen", fullView, true, true)
		c.ui.SetFocus(fullView)
		c.fullscreen = true
	}
}

// ---------------------------------------------------------------------------
// 动作分组
// ---------------------------------------------------------------------------

func (c *tuiController) switchGroup(idx int) {
	if idx < 0 || idx >= len(c.groups) {
		return
	}
	c.activeGroup = idx
	c.rebuildActionList()
	c.refreshGroupBar()
	if c.focus != tuiFocusActions {
		c.setFocusPanel(tuiFocusActions)
	}
}

func (c *tuiController) rebuildActionList() {
	c.actions.Clear()
	group := c.groups[c.activeGroup]
	for _, action := range group.actions {
		actionID := action.id
		label := action.title
		if action.key != 0 {
			label = fmt.Sprintf("[%c] %s", action.key, action.title)
		}
		c.actions.AddItem(label, "", 0, func() {
			c.executeAction(actionID)
		})
	}
	if c.actions.GetItemCount() > 0 {
		c.actions.SetCurrentItem(0)
	}
	c.refreshGroupBar()
}

func (c *tuiController) refreshGroupBar() {
	tabWidth := c.groupTabWidth()
	start, end := c.visibleGroupRange(tabWidth)
	var parts []string
	if start > 0 {
		parts = append(parts, "[#8a97a8] < [-]")
	}
	for i := start; i <= end; i++ {
		group := c.groups[i]
		label := centerGroupTab(fmt.Sprintf("%d·%s", i+1, group.name), tabWidth)
		if i == c.activeGroup {
			parts = append(parts, fmt.Sprintf("[#0b0f14:#7dd3fc:b] %s [-:-:-]", label))
			continue
		}
		parts = append(parts, fmt.Sprintf("[#8a97a8] %s [-]", label))
	}
	if end < len(c.groups)-1 {
		parts = append(parts, "[#8a97a8] > [-]")
	}
	c.groupBar.SetText(strings.Join(parts, " "))
}

func (c *tuiController) visibleGroupRange(tabWidth int) (int, int) {
	if len(c.groups) == 0 {
		return 0, -1
	}
	_, _, width, _ := c.groupBar.GetInnerRect()
	if width <= 0 {
		return 0, len(c.groups) - 1
	}

	indicatorWidth := 4
	separatorWidth := 1
	start := c.activeGroup
	end := c.activeGroup
	used := tabWidth

	for {
		expanded := false
		if start > 0 {
			extra := tabWidth + separatorWidth
			if start-1 > 0 {
				extra += indicatorWidth
			}
			if end < len(c.groups)-1 {
				extra += indicatorWidth
			}
			if used+extra <= width {
				start--
				used += tabWidth + separatorWidth
				expanded = true
			}
		}
		if end < len(c.groups)-1 {
			extra := tabWidth + separatorWidth
			if start > 0 {
				extra += indicatorWidth
			}
			if end+1 < len(c.groups)-1 {
				extra += indicatorWidth
			}
			if used+extra <= width {
				end++
				used += tabWidth + separatorWidth
				expanded = true
			}
		}
		if !expanded {
			break
		}
	}
	return start, end
}

func (c *tuiController) groupTabWidth() int {
	width := 0
	for i, group := range c.groups {
		labelWidth := runewidth.StringWidth(fmt.Sprintf("%d·%s", i+1, group.name))
		if labelWidth > width {
			width = labelWidth
		}
	}
	if width < 8 {
		width = 8
	}
	return width + 2
}

func centerGroupTab(label string, width int) string {
	labelWidth := runewidth.StringWidth(label)
	if labelWidth >= width {
		return label
	}
	padding := width - labelWidth
	left := padding / 2
	right := padding - left
	return strings.Repeat(" ", left) + label + strings.Repeat(" ", right)
}

// ---------------------------------------------------------------------------
// 刷新视图
// ---------------------------------------------------------------------------

func (c *tuiController) refreshViews(resetDetail bool) {
	selectedRow, _ := c.table.GetSelection()
	if selectedRow < 1 {
		selectedRow = 1
	}

	snapshot, err := c.app.ReconcileState()
	if err != nil {
		c.setDetailText(fmt.Sprintf("[red]状态刷新失败[-]\n\n%v", err))
		return
	}

	c.rebuildStatusBar(snapshot)
	c.rebuildServiceTable(snapshot, selectedRow)
	c.refreshActionTitles()

	if event := c.detectStateEvent(snapshot); event != "" && !c.busy {
		c.lastEvent = event
		c.setDetailText(event)
	} else if !c.busy && c.shouldShowLiveLog(snapshot) {
		c.setDetailText(c.liveLogPreview(snapshot))
	} else if !c.busy && c.lastEvent != "" {
		c.setDetailText(c.lastEvent)
	}
	c.lastState = snapshot

	if resetDetail {
		c.setDetailText(c.defaultDetail())
	}
}

func (c *tuiController) rebuildStatusBar(snapshot RuntimeState) {
	total, running, starting, failed := 0, 0, 0, 0
	for _, service := range c.services {
		total++
		switch currentServiceState(snapshot, service).Status {
		case serviceStatusRunning:
			running++
		case serviceStatusStarting:
			starting++
		case serviceStatusFailed:
			failed++
		}
	}

	markedCount := len(c.selected)
	markedInfo := ""
	if markedCount > 0 {
		markedInfo = fmt.Sprintf("    [#93c5fd]已勾选[-] %d", markedCount)
	}

	busyInfo := ""
	if c.busy {
		busyInfo = "    [#fbbf24::bl]执行中...[::-]"
	}

	line1 := fmt.Sprintf(
		"[#cbd5e1::b]devctl[::-]  [#34d399]●[-] %d/%d 运行中  [#fbbf24]○[-] %d 启动中  [#f87171]✗[-] %d 失败%s%s",
		running, total, starting, failed, markedInfo, busyInfo,
	)
	line2 := fmt.Sprintf(
		"[#94a3b8]%s[-]  [#94a3b8]Tab[-] 切换面板  [#94a3b8]Space[-] 勾选  [#94a3b8]←/→[-] 切组  [#94a3b8]z[-] 全屏  [#94a3b8]q[-] 退出",
		runtime.GOOS,
	)
	c.statusBar.SetText(line1 + "\n" + line2)
}

func (c *tuiController) rebuildServiceTable(snapshot RuntimeState, selectedRow int) {
	c.table.Clear()

	headers := []string{" ", "服务", "状态", "模式", "端口"}
	for col, title := range headers {
		cell := tview.NewTableCell(title).
			SetSelectable(false).
			SetTextColor(tuiColorMuted).
			SetBackgroundColor(tuiColorPanelAlt).
			SetAlign(tview.AlignLeft).
			SetExpansion(1)
		if col == 0 {
			cell.SetExpansion(0).SetMaxWidth(3)
		}
		c.table.SetCell(0, col, cell)
	}

	for idx, service := range c.services {
		row := idx + 1
		state := currentServiceState(snapshot, service)

		mark := " "
		if c.selected[service.Name] {
			mark = "●"
		}

		values := []string{
			mark,
			fmt.Sprintf("%s / %s", service.Name, service.Label),
			displayStatus(state.Status),
			displayMode(state.Mode),
			fmt.Sprintf(":%d", service.Port),
		}

		for col, value := range values {
			cell := tview.NewTableCell(value).
				SetAlign(tview.AlignLeft).
				SetExpansion(1)

			if col == 0 {
				cell.SetExpansion(0).SetMaxWidth(3)
			}

			rowBg := tuiColorPanel
			if row%2 == 0 {
				rowBg = tuiColorPanelAlt
			}
			cell.SetBackgroundColor(rowBg)

			switch col {
			case 0:
				if c.selected[service.Name] {
					cell.SetTextColor(tuiColorSuccess)
				} else {
					cell.SetTextColor(tuiColorMuted)
				}
			case 2:
				cell.SetTextColor(statusColor(state.Status))
			case 3:
				cell.SetTextColor(modeColor(state.Mode))
			case 4:
				cell.SetTextColor(tuiColorInfo)
			default:
				cell.SetTextColor(tuiColorText)
			}

			c.table.SetCell(row, col, cell)
		}
	}

	if len(c.services) == 0 {
		c.table.Select(0, 0)
		return
	}
	if selectedRow > len(c.services) {
		selectedRow = len(c.services)
	}
	c.table.Select(selectedRow, 0)
}

func (c *tuiController) refreshActionTitles() {
	group := c.groups[c.activeGroup]
	for idx, action := range group.actions {
		label := action.title
		if action.key != 0 {
			label = fmt.Sprintf("[%c] %s", action.key, action.title)
		}
		if c.busy {
			label += " [#fbbf24](执行中)[-]"
		}
		c.actions.SetItemText(idx, label, "")
	}
}

// ---------------------------------------------------------------------------
// 事件检测
// ---------------------------------------------------------------------------

func (c *tuiController) detectStateEvent(snapshot RuntimeState) string {
	if c.lastState.Services == nil {
		return ""
	}
	for _, service := range c.services {
		prev := c.lastState.Services[service.Name]
		curr := snapshot.Services[service.Name]
		if prev.Status == curr.Status && prev.LastError == curr.LastError {
			continue
		}
		if curr.Status == serviceStatusStopped && curr.Mode == "terminal" && curr.LastError != "" {
			logPath := curr.LogPath
			if logPath == "" {
				logPath = filepath.Join(c.app.LogsDir, service.Name+".log")
			}
			return formatDetailSection("运行事件", fmt.Sprintf("%s 已停止\n原因：%s\n日志：%s", serviceTitle(service), curr.LastError, logPath))
		}
		if curr.Status == serviceStatusFailed {
			logPath := curr.LogPath
			if logPath == "" {
				logPath = filepath.Join(c.app.LogsDir, service.Name+".log")
			}
			reason := curr.LastError
			if reason == "" {
				reason = "服务异常退出"
			}
			return formatDetailSection("运行事件", fmt.Sprintf("%s 启动失败\n原因：%s\n日志：%s", serviceTitle(service), reason, logPath))
		}
	}
	return ""
}

func (c *tuiController) shouldShowLiveLog(snapshot RuntimeState) bool {
	for _, service := range c.services {
		current := currentServiceState(snapshot, service)
		if current.Status == serviceStatusStarting || current.Status == serviceStatusFailed {
			return true
		}
	}
	return false
}

func (c *tuiController) liveLogPreview(snapshot RuntimeState) string {
	service := c.focusedOrSelectedService(snapshot)
	if service.Name == "" {
		return c.defaultDetail()
	}

	state := currentServiceState(snapshot, service)
	logPath := state.LogPath
	if logPath == "" {
		logPath = filepath.Join(c.app.LogsDir, service.Name+".log")
	}

	tail, err := c.app.serviceLogTail(service.Name, 20)
	if err != nil {
		tail = fmt.Sprintf("日志暂不可读：%v", err)
	}

	title := "实时日志"
	if state.Status == serviceStatusFailed {
		title = "失败日志"
	}
	return formatDetailSection(title, fmt.Sprintf("服务：%s\n状态：%s\n日志：%s\n\n%s", serviceTitle(service), displayStatus(state.Status), logPath, tail))
}

func (c *tuiController) focusedOrSelectedService(snapshot RuntimeState) ServiceSpec {
	for _, service := range c.services {
		current := currentServiceState(snapshot, service)
		if current.Status == serviceStatusFailed {
			return service
		}
	}
	for _, service := range c.services {
		current := currentServiceState(snapshot, service)
		if current.Status == serviceStatusStarting {
			return service
		}
	}
	if current := c.currentServiceName(); current != "" {
		service, err := findService(c.app, current)
		if err == nil {
			return service
		}
	}
	return ServiceSpec{}
}

// ---------------------------------------------------------------------------
// 服务选择
// ---------------------------------------------------------------------------

func (c *tuiController) toggleCurrentServiceSelection() {
	name := c.currentServiceName()
	if name == "" {
		return
	}
	c.selected[name] = !c.selected[name]
	if !c.selected[name] {
		delete(c.selected, name)
	}
	c.refreshViews(false)
}

func (c *tuiController) currentServiceName() string {
	row, _ := c.table.GetSelection()
	if row <= 0 || row > len(c.services) {
		return ""
	}
	return c.services[row-1].Name
}

func (c *tuiController) selectedServices(defaultToCurrent bool) []string {
	values := make([]string, 0, len(c.selected))
	for _, service := range c.services {
		if c.selected[service.Name] {
			values = append(values, service.Name)
		}
	}
	if len(values) == 0 && defaultToCurrent {
		if current := c.currentServiceName(); current != "" {
			values = append(values, current)
		}
	}
	sort.Strings(values)
	return values
}

// ---------------------------------------------------------------------------
// 动作执行
// ---------------------------------------------------------------------------

func (c *tuiController) executeCurrentAction() {
	group := c.groups[c.activeGroup]
	idx := c.actions.GetCurrentItem()
	if idx < 0 || idx >= len(group.actions) {
		return
	}
	c.executeAction(group.actions[idx].id)
}

func (c *tuiController) findAction(actionID string) (tuiActionSpec, bool) {
	for _, group := range c.groups {
		for _, action := range group.actions {
			if action.id == actionID {
				return action, true
			}
		}
	}
	return tuiActionSpec{}, false
}

func (c *tuiController) executeAction(actionID string) {
	if c.busy {
		c.setDetailText("[#fbbf24]已有任务在执行，请稍候。[-]")
		return
	}
	spec, ok := c.findAction(actionID)
	if !ok {
		c.setDetailText(fmt.Sprintf("[#f87171]未知动作：%s[-]", actionID))
		return
	}

	serviceNames, err := c.resolveActionSelection(spec)
	if err != nil {
		c.setDetailText(fmt.Sprintf("[#f87171]%v[-]", err))
		return
	}
	if spec.requiresConfirm {
		c.showConfirmation(spec, serviceNames)
		return
	}
	c.startAction(spec, serviceNames)
}

func (c *tuiController) resolveActionSelection(spec tuiActionSpec) ([]string, error) {
	switch spec.selection {
	case tuiSelectionNone:
		return nil, nil
	case tuiSelectionCurrentOrMarked:
		values := c.selectedServices(true)
		if len(values) == 0 {
			return nil, errors.New("请先选择至少一个服务（Space 勾选或高亮当前行）")
		}
		return values, nil
	case tuiSelectionSingle:
		values := c.selectedServices(true)
		if len(values) != 1 {
			return nil, errors.New("该动作只能选择一个服务（未勾选时默认使用当前高亮行）")
		}
		return values, nil
	default:
		return nil, nil
	}
}

func (c *tuiController) startAction(spec tuiActionSpec, serviceNames []string) {
	c.busy = true
	c.lastEvent = ""
	c.hotUntil = time.Now().Add(10 * time.Second)
	c.refreshViews(false)
	c.setDetailText(c.pendingDetail(spec, serviceNames))

	go func() {
		detail, err := runInteractiveAction(c.app, spec, serviceNames)
		c.ui.QueueUpdateDraw(func() {
			c.busy = false
			if err != nil {
				c.setDetailText(fmt.Sprintf("[#f87171]执行失败[-]\n\n动作：%s\n错误：%v", spec.title, err))
			} else {
				c.setDetailText(detail)
			}
			c.refreshViews(false)
		})
	}()
}

func (c *tuiController) showConfirmation(spec tuiActionSpec, serviceNames []string) {
	body := "该操作需要确认。"
	if spec.confirmBody != nil {
		body = spec.confirmBody(c.app, serviceNames)
	}
	modal := tview.NewModal().
		SetText(body).
		AddButtons([]string{"取消", "确认执行"}).
		SetDoneFunc(func(buttonIndex int, buttonLabel string) {
			c.root.RemovePage("confirm")
			c.setFocusPanel(tuiFocusActions)
			if buttonLabel == "确认执行" {
				c.startAction(spec, serviceNames)
			}
		})
	modal.SetTitle(spec.confirmTitle).SetBorder(true)
	c.root.AddPage("confirm", modal, true, true)
	c.ui.SetFocus(modal)
}

func (c *tuiController) pendingDetail(spec tuiActionSpec, serviceNames []string) string {
	selection := "无需服务选择"
	if len(serviceNames) > 0 {
		selection = strings.Join(serviceNames, ", ")
	}
	commandPreview := strings.Join(cliPreviewArgs(c.app, spec.cliArgs(serviceNames)), " ")
	return strings.Join([]string{
		"[#fbbf24]任务已提交，正在执行...[-]",
		"",
		fmt.Sprintf("动作：%s", spec.title),
		fmt.Sprintf("服务：%s", selection),
		fmt.Sprintf("命令：%s", commandPreview),
	}, "\n")
}

// ---------------------------------------------------------------------------
// Detail 文本
// ---------------------------------------------------------------------------

func (c *tuiController) defaultDetail() string {
	return strings.Join([]string{
		"[#cbd5e1::b]devctl 控制台[::-]",
		"",
		"[#94a3b8]操作指南[-]",
		"  Space 勾选/取消服务    Tab 切换面板    ←/→ 切换动作组",
		"  Enter 执行当前动作     z 全屏输出面板   q 退出",
		"  字母快捷键直接触发对应动作（见动作列表中的 [x] 标记）",
		"",
		fmt.Sprintf("[#94a3b8]状态文件[-]  %s", relativePath(c.app.RepoRoot, c.app.StatePath)),
		fmt.Sprintf("[#94a3b8]日志目录[-]  %s", relativePath(c.app.RepoRoot, c.app.LogsDir)),
	}, "\n")
}

func (c *tuiController) setDetailText(value string) {
	c.detail.SetText(strings.TrimSpace(value))
	c.detail.ScrollToBeginning()
}

// ---------------------------------------------------------------------------
// 动作执行引擎
// ---------------------------------------------------------------------------

func runInteractiveAction(app *App, spec tuiActionSpec, serviceNames []string) (string, error) {
	switch spec.id {
	case "refresh":
		return formatDetailSection("状态已刷新", buildInteractiveSummary(app)), nil
	default:
		exePath, err := os.Executable()
		if err != nil {
			return "", err
		}
		args := cliPreviewArgs(app, spec.cliArgs(serviceNames))
		output, err := app.captureCombinedCommand(exePath, args, RunOptions{Dir: app.RepoRoot})
		if err != nil {
			body := strings.TrimSpace(output)
			if body == "" {
				return "", err
			}
			return formatDetailSection(spec.title, body), err
		}
		body := strings.TrimSpace(output)
		if body == "" {
			body = "操作已完成"
		}
		detail := formatDetailSection(spec.title, body)
		if spec.selection == tuiSelectionCurrentOrMarked || spec.selection == tuiSelectionSingle || spec.id == "doctor" || spec.id == "status" {
			detail += "\n\n" + buildInteractiveSummary(app)
		}
		return detail, nil
	}
}

// ---------------------------------------------------------------------------
// 默认动作组
// ---------------------------------------------------------------------------

func defaultTUIActionGroups() []tuiActionGroup {
	return []tuiActionGroup{
		{
			name:   "服务",
			hotkey: '1',
			actions: []tuiActionSpec{
				{id: "service.start", title: "启动所选", key: 's', selection: tuiSelectionCurrentOrMarked, cliArgs: func(s []string) []string { return append([]string{"service", "start"}, s...) }},
				{id: "service.stop", title: "停止所选", key: 'x', selection: tuiSelectionCurrentOrMarked, cliArgs: func(s []string) []string { return append([]string{"service", "stop"}, s...) }},
				{id: "service.restart", title: "重启所选", key: 'r', selection: tuiSelectionCurrentOrMarked, cliArgs: func(s []string) []string { return append([]string{"service", "restart"}, s...) }},
				{id: "service.logs", title: "查看日志", key: 'l', selection: tuiSelectionSingle, cliArgs: func(s []string) []string { return append([]string{"service", "logs"}, s...) }},
			},
		},
		{
			name:   "构建",
			hotkey: '2',
			actions: []tuiActionSpec{
				{id: "build.backend", title: "后端", key: 'b', selection: tuiSelectionNone, cliArgs: func(_ []string) []string { return []string{"build", "backend"} }},
				{id: "build.admin", title: "管理端", key: 'a', selection: tuiSelectionNone, cliArgs: func(_ []string) []string { return []string{"build", "admin"} }},
				{id: "build.mobile", title: "移动端", key: 'm', selection: tuiSelectionNone, cliArgs: func(_ []string) []string { return []string{"build", "mobile"} }},
				{id: "build.showcase", title: "Showcase", selection: tuiSelectionNone, cliArgs: func(_ []string) []string { return []string{"build", "showcase"} }},
				{id: "build.frontend", title: "前端全量", key: 'f', selection: tuiSelectionNone, cliArgs: func(_ []string) []string { return []string{"build", "frontend"} }},
				{id: "build.docker", title: "Docker 镜像", key: 'd', selection: tuiSelectionNone, cliArgs: func(_ []string) []string { return []string{"build", "docker"} }},
				{id: "build.all", title: "后端+前端", selection: tuiSelectionNone, cliArgs: func(_ []string) []string { return []string{"build", "all"} }},
			},
		},
		{
			name:   "质量",
			hotkey: '3',
			actions: []tuiActionSpec{
				{id: "test.backend", title: "测试后端", key: 'b', selection: tuiSelectionNone, cliArgs: func(_ []string) []string { return []string{"test", "backend"} }},
				{id: "test.frontend", title: "测试前端", key: 'f', selection: tuiSelectionNone, cliArgs: func(_ []string) []string { return []string{"test", "frontend"} }},
				{id: "test.all", title: "测试全量", key: 't', selection: tuiSelectionNone, cliArgs: func(_ []string) []string { return []string{"test", "all"} }},
				{id: "typecheck", title: "类型检查", key: 'y', selection: tuiSelectionNone, cliArgs: func(_ []string) []string { return []string{"typecheck"} }},
				{id: "openapi", title: "同步 OpenAPI", key: 'o', selection: tuiSelectionNone, cliArgs: func(_ []string) []string { return []string{"openapi"} }},
				{id: "fmt", title: "格式化 Go", key: 'g', selection: tuiSelectionNone, cliArgs: func(_ []string) []string { return []string{"fmt"} }},
			},
		},
		{
			name:   "环境",
			hotkey: '4',
			actions: []tuiActionSpec{
				{id: "doctor", title: "运行自检", key: 'd', selection: tuiSelectionNone, cliArgs: func(_ []string) []string { return []string{"doctor"} }},
				{id: "env", title: "环境摘要", key: 'e', selection: tuiSelectionNone, cliArgs: func(_ []string) []string { return []string{"env"} }},
				{id: "status", title: "查看状态", selection: tuiSelectionNone, cliArgs: func(_ []string) []string { return []string{"status"} }},
				{id: "setup", title: "初始化开发环境", key: 'p', selection: tuiSelectionNone, cliArgs: func(_ []string) []string { return []string{"setup"} }},
				{id: "deps.all", title: "安装全部依赖", key: 'i', selection: tuiSelectionNone, cliArgs: func(_ []string) []string { return []string{"deps", "all"} }},
				{id: "migrate", title: "数据库迁移", key: 'm', selection: tuiSelectionNone, cliArgs: func(_ []string) []string { return []string{"migrate"} }},
				{id: "refresh", title: "刷新状态", key: 'u', selection: tuiSelectionNone, cliArgs: func(_ []string) []string { return nil }},
				{id: "reinit", title: "重置本地环境", key: 'n', selection: tuiSelectionNone, cliArgs: func(_ []string) []string { return []string{"reinit", "--yes"} }, requiresConfirm: true, confirmTitle: "确认 reinit", confirmBody: func(app *App, _ []string) string {
					return strings.Join([]string{
						"该操作会清理本地开发环境产物。",
						"",
						"影响范围：",
						fmt.Sprintf("- %s", relativePath(app.RepoRoot, filepath.Join(app.RepoRoot, ".tmp", "go"))),
						fmt.Sprintf("- %s", relativePath(app.RepoRoot, filepath.Join(app.RepoRoot, ".tmp", "bin"))),
						fmt.Sprintf("- %s", relativePath(app.RepoRoot, filepath.Join(app.RepoRoot, ".tmp", "docker"))),
						fmt.Sprintf("- %s", relativePath(app.RepoRoot, filepath.Join(app.RepoRoot, "temp", "devctl"))),
						fmt.Sprintf("- %s", relativePath(app.RepoRoot, app.AdminDistDir)),
						fmt.Sprintf("- %s", relativePath(app.RepoRoot, app.MobileDistDir)),
						fmt.Sprintf("- %s", relativePath(app.RepoRoot, app.ShowcaseDistDir)),
						fmt.Sprintf("- %s", relativePath(app.RepoRoot, app.RootDistDir)),
						fmt.Sprintf("- %s", relativePath(app.RepoRoot, app.BackendBinary)),
						fmt.Sprintf("- %s", relativePath(app.RepoRoot, app.DevctlBinary)),
						fmt.Sprintf("- %s", relativePath(app.RepoRoot, app.InstallLockFile)),
						"",
						"并会尝试停止当前项目相关的 Docker 应用栈与开发基础设施。",
					}, "\n")
				}},
			},
		},
		{
			name:   "Docker",
			hotkey: '5',
			actions: []tuiActionSpec{
				{id: "docker-up", title: "启动应用栈", key: 'u', selection: tuiSelectionNone, cliArgs: func(_ []string) []string { return []string{"docker-up"} }},
				{id: "docker-down", title: "停止应用栈", key: 'd', selection: tuiSelectionNone, cliArgs: func(_ []string) []string { return []string{"docker-down"} }},
				{id: "deploy", title: "构建并启动", key: 'p', selection: tuiSelectionNone, cliArgs: func(_ []string) []string { return []string{"deploy"} }},
			},
		},
	}
}

// ---------------------------------------------------------------------------
// CLI 参数构建
// ---------------------------------------------------------------------------

func cliPreviewArgs(app *App, args []string) []string {
	cliArgs := []string{
		"--repo-root", app.RepoRoot,
		"--config", filepath.ToSlash(app.ConfigFile),
		"--project-prefix", app.ProjectPrefix,
	}
	cliArgs = append(cliArgs, args...)
	return cliArgs
}

// ---------------------------------------------------------------------------
// 交互式摘要
// ---------------------------------------------------------------------------

func buildInteractiveSummary(app *App) string {
	snapshot, _ := app.ReconcileState()
	total, running, starting, failed := 0, 0, 0, 0
	var lines []string
	for _, service := range allServices(app) {
		state := currentServiceState(snapshot, service)
		total++
		switch state.Status {
		case serviceStatusRunning:
			running++
		case serviceStatusStarting:
			starting++
		case serviceStatusFailed:
			failed++
		}
	}
	lines = append(lines, fmt.Sprintf("运行中 %d/%d  启动中 %d  失败 %d", running, total, starting, failed))
	lines = append(lines, "")
	for _, service := range allServices(app) {
		state := currentServiceState(snapshot, service)
		lines = append(lines, fmt.Sprintf("  %s  %s / :%d / %s",
			serviceStatusTag(state.Status),
			serviceTitle(service),
			service.Port,
			displayMode(state.Mode),
		))
		if state.LastError != "" {
			lines = append(lines, "    最近错误："+state.LastError)
		}
	}
	return strings.Join(lines, "\n")
}

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------

func currentServiceState(snapshot RuntimeState, service ServiceSpec) ServiceState {
	current := snapshot.Services[service.Name]
	if current.Status == "" {
		current.Status = serviceStatusStopped
	}
	if current.Mode == "" {
		current.Mode = service.DefaultMode
	}
	return current
}

func displayMode(mode string) string {
	switch mode {
	case "terminal":
		return "独立终端"
	case "inline":
		return "当前终端"
	case "docker":
		return "Docker"
	default:
		return mode
	}
}

func serviceStatusTag(status string) string {
	switch status {
	case serviceStatusRunning:
		return "[RUN]"
	case serviceStatusStarting:
		return "[BOOT]"
	case serviceStatusFailed:
		return "[FAIL]"
	case serviceStatusStopped:
		return "[STOP]"
	default:
		return "[UNKN]"
	}
}

func serviceTitle(service ServiceSpec) string {
	return service.Name + " / " + service.Label
}

func formatDetailSection(title, body string) string {
	body = strings.TrimSpace(body)
	if body == "" {
		body = "暂无内容"
	}
	return title + "\n" + strings.Repeat("─", len(title)) + "\n" + body
}

func statusColor(status string) tcell.Color {
	switch status {
	case serviceStatusRunning:
		return tuiColorSuccess
	case serviceStatusStarting:
		return tuiColorWarning
	case serviceStatusFailed:
		return tuiColorDanger
	case serviceStatusStopped:
		return tuiColorMuted
	default:
		return tuiColorText
	}
}

func modeColor(mode string) tcell.Color {
	switch mode {
	case "terminal":
		return tuiColorAccent
	case "inline":
		return tcell.NewHexColor(0x5EEAD4)
	case "docker":
		return tcell.NewHexColor(0xC4B5FD)
	default:
		return tuiColorText
	}
}

func relativePath(base, target string) string {
	rel, err := filepath.Rel(base, target)
	if err != nil {
		return target
	}
	return rel
}
