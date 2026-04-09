package devctl

import (
	"bytes"
	"errors"
	"fmt"
	"path/filepath"
	"runtime"
	"sort"
	"strings"
	"time"

	"github.com/gdamore/tcell/v2"
	"github.com/rivo/tview"
	"github.com/spf13/cobra"
)

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

type tuiController struct {
	app      *App
	ui       *tview.Application
	services []ServiceSpec
	selected map[string]bool

	summary *tview.TextView
	table   *tview.Table
	actions *tview.List
	detail  *tview.TextView

	actionOrder []string
	busy        bool
	lastState   RuntimeState
	lastEvent   string
	hotUntil    time.Time
}

func runTUIProgram(app *App) error {
	controller := newTUIController(app)
	return controller.run()
}

func newTUIController(app *App) *tuiController {
	controller := &tuiController{
		app:      app,
		ui:       tview.NewApplication(),
		services: allServices(app),
		selected: map[string]bool{},
	}

	controller.summary = tview.NewTextView().
		SetDynamicColors(true).
		SetWrap(true)
	controller.summary.SetBorder(true).SetTitle(" 总览 ")

	controller.table = tview.NewTable().
		SetSelectable(true, false).
		SetFixed(1, 0).
		SetEvaluateAllRows(true).
		SetSeparator(' ')
	controller.table.SetBorder(true).SetTitle(" 服务列表 ")

	controller.actions = tview.NewList().
		ShowSecondaryText(false)
	controller.actions.SetBorder(true).SetTitle(" 动作 ")

	controller.detail = tview.NewTextView().
		SetDynamicColors(true).
		SetWrap(true).
		SetScrollable(true)
	controller.detail.SetBorder(true).SetTitle(" 输出 / 日志 ")

	controller.applyTheme()
	controller.installActions()
	controller.refreshViews(true)
	controller.setDetailText(controller.defaultDetail())
	controller.setFocus(controller.table)
	controller.installKeybindings()
	return controller
}

func (c *tuiController) run() error {
	left := tview.NewFlex().SetDirection(tview.FlexRow).
		AddItem(c.summary, 8, 0, false).
		AddItem(c.table, 0, 1, true)

	top := tview.NewFlex().
		AddItem(left, 0, 3, true).
		AddItem(c.actions, 34, 0, false)

	root := tview.NewFlex().SetDirection(tview.FlexRow).
		AddItem(top, 0, 3, true).
		AddItem(c.detail, 12, 0, false)

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

	return c.ui.SetRoot(root, true).Run()
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

	c.summary.SetBackgroundColor(tuiColorPanel)
	c.summary.SetTextColor(tuiColorText)

	c.table.SetBackgroundColor(tuiColorPanel)
	c.table.SetSelectedStyle(tcell.StyleDefault.Background(tuiColorSelection).Foreground(tuiColorText).Bold(true))

	c.actions.SetBackgroundColor(tuiColorPanel)
	c.actions.SetMainTextColor(tuiColorText)
	c.actions.SetSelectedTextColor(tuiColorText)
	c.actions.SetSelectedBackgroundColor(tuiColorSelection)

	c.detail.SetBackgroundColor(tuiColorPanelAlt)
	c.detail.SetTextColor(tuiColorText)
}

func (c *tuiController) installActions() {
	actions := []struct {
		id    string
		title string
		key   rune
	}{
		{id: "start", title: "启动所选服务", key: 's'},
		{id: "stop", title: "停止所选服务", key: 'x'},
		{id: "restart", title: "重启所选服务", key: 'r'},
		{id: "logs", title: "查看服务日志", key: 'l'},
		{id: "doctor", title: "运行环境自检", key: 'd'},
		{id: "refresh", title: "刷新状态面板", key: 'u'},
		{id: "quit", title: "退出控制台", key: 'q'},
	}

	for _, item := range actions {
		actionID := item.id
		c.actionOrder = append(c.actionOrder, actionID)
		c.actions.AddItem(item.title, "", item.key, func() {
			c.executeAction(actionID)
		})
	}
	c.actions.SetCurrentItem(0)
}

func (c *tuiController) installKeybindings() {
	c.ui.SetInputCapture(func(event *tcell.EventKey) *tcell.EventKey {
		switch event.Key() {
		case tcell.KeyTAB:
			c.toggleFocus()
			return nil
		case tcell.KeyBacktab:
			c.toggleFocus()
			return nil
		case tcell.KeyEnter:
			c.executeAction(c.currentAction())
			return nil
		case tcell.KeyCtrlC:
			c.ui.Stop()
			return nil
		}

		switch event.Rune() {
		case ' ':
			if c.ui.GetFocus() == c.table {
				c.toggleCurrentServiceSelection()
				return nil
			}
		case 's':
			c.executeAction("start")
			return nil
		case 'x':
			c.executeAction("stop")
			return nil
		case 'r':
			c.executeAction("restart")
			return nil
		case 'l':
			c.executeAction("logs")
			return nil
		case 'd':
			c.executeAction("doctor")
			return nil
		case 'u':
			c.executeAction("refresh")
			return nil
		case 'q':
			c.ui.Stop()
			return nil
		}
		return event
	})
}

func (c *tuiController) toggleFocus() {
	if c.ui.GetFocus() == c.actions {
		c.setFocus(c.table)
		return
	}
	c.setFocus(c.actions)
}

func (c *tuiController) setFocus(primitive tview.Primitive) {
	c.ui.SetFocus(primitive)
	if primitive == c.actions {
		c.table.SetTitle(" 服务列表 ")
		c.actions.SetTitle(" 动作 / 已聚焦 ")
		c.table.SetBorderColor(tuiColorBorder)
		c.actions.SetBorderColor(tuiColorBorderFocus)
		c.detail.SetBorderColor(tuiColorBorder)
		return
	}
	c.table.SetTitle(" 服务列表 / 已聚焦 ")
	c.actions.SetTitle(" 动作 ")
	c.table.SetBorderColor(tuiColorBorderFocus)
	c.actions.SetBorderColor(tuiColorBorder)
	c.detail.SetBorderColor(tuiColorBorder)
}

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

	c.summary.SetText(c.summaryText(snapshot))
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

func (c *tuiController) summaryText(snapshot RuntimeState) string {
	total := 0
	running := 0
	starting := 0
	failed := 0
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

	focusLabel := "服务列表"
	if c.ui.GetFocus() == c.actions {
		focusLabel = "动作栏"
	}

	return strings.Join([]string{
		"[#cbd5e1::b]devctl control center[::-]",
		fmt.Sprintf("[#94a3b8]平台[-] %s    [#94a3b8]焦点[-] %s", runtime.GOOS, focusLabel),
		fmt.Sprintf("[#34d399]运行中[-] %d/%d    [#fbbf24]启动中[-] %d    [#f87171]失败[-] %d", running, total, starting, failed),
		fmt.Sprintf("[#94a3b8]当前动作[-] %s", c.actionTitle(c.currentAction())),
		fmt.Sprintf("[#94a3b8]状态文件[-] %s", relativePath(c.app.RepoRoot, c.app.StatePath)),
		fmt.Sprintf("[#94a3b8]日志目录[-] %s", relativePath(c.app.RepoRoot, c.app.LogsDir)),
		"[#60a5fa]快捷键[-] Space 勾选  Enter 执行动作  Tab 切换面板  s/x/r/l/d/u/q 直接操作",
	}, "\n")
}

func (c *tuiController) rebuildServiceTable(snapshot RuntimeState, selectedRow int) {
	c.table.Clear()

	headers := []string{"选择", "服务", "状态", "模式", "端口", "日志"}
	for col, title := range headers {
		cell := tview.NewTableCell(title).
			SetSelectable(false).
			SetTextColor(tuiColorMuted).
			SetBackgroundColor(tuiColorPanelAlt).
			SetAlign(tview.AlignLeft).
			SetExpansion(1)
		c.table.SetCell(0, col, cell)
	}

	for idx, service := range c.services {
		row := idx + 1
		state := currentServiceState(snapshot, service)
		selected := "未选"
		if c.selected[service.Name] {
			selected = "已选"
		}

		logText := "-"
		if service.Kind == ServiceLocal {
			logPath := state.LogPath
			if logPath == "" {
				logPath = filepath.Join(c.app.LogsDir, service.Name+".log")
			}
			logText = relativePath(c.app.RepoRoot, logPath)
		}

		values := []string{
			selected,
			fmt.Sprintf("%s / %s", service.Name, service.Label),
			displayStatus(state.Status),
			displayMode(state.Mode),
			fmt.Sprintf(":%d", service.Port),
			logText,
		}

		for col, value := range values {
			cell := tview.NewTableCell(value).
				SetSelectable(col == 0).
				SetAlign(tview.AlignLeft).
				SetExpansion(1)

			rowBackground := tuiColorPanel
			if row%2 == 0 {
				rowBackground = tuiColorPanelAlt
			}
			cell.SetBackgroundColor(rowBackground)

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
	for idx, actionID := range c.actionOrder {
		title := c.actionTitle(actionID)
		if c.busy && actionID == c.currentAction() {
			title += "（执行中）"
		}
		c.actions.SetItemText(idx, title, "")
	}
}

func (c *tuiController) currentAction() string {
	index := c.actions.GetCurrentItem()
	if index < 0 || index >= len(c.actionOrder) {
		return "start"
	}
	return c.actionOrder[index]
}

func (c *tuiController) actionTitle(action string) string {
	switch action {
	case "start":
		return "启动所选服务"
	case "stop":
		return "停止所选服务"
	case "restart":
		return "重启所选服务"
	case "logs":
		return "查看服务日志"
	case "doctor":
		return "运行环境自检"
	case "refresh":
		return "刷新状态面板"
	case "quit":
		return "退出控制台"
	default:
		return action
	}
}

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

func (c *tuiController) executeAction(action string) {
	if c.busy {
		c.setDetailText("[#fbbf24]已有任务在执行，请稍候刷新结果。[-]")
		return
	}
	if action == "quit" {
		c.ui.Stop()
		return
	}

	serviceNames := c.selectedServices(action == "start" || action == "stop" || action == "restart" || action == "logs")
	if action == "logs" && len(serviceNames) != 1 {
		c.setDetailText("[#f87171]查看日志时必须且只能选中一个服务；未勾选时默认读取当前高亮服务。[-]")
		return
	}

	c.busy = true
	c.lastEvent = ""
	c.hotUntil = time.Now().Add(10 * time.Second)
	c.refreshViews(false)
	c.setDetailText(c.pendingDetail(action, serviceNames))

	go func() {
		detail, err := runInteractiveAction(c.app, action, serviceNames)
		c.ui.QueueUpdateDraw(func() {
			c.busy = false
			if err != nil {
				c.setDetailText(fmt.Sprintf("[#f87171]执行失败[-]\n\n动作：%s\n错误：%v", c.actionTitle(action), err))
			} else {
				c.setDetailText(detail)
			}
			c.refreshViews(false)
		})
	}()
}

func (c *tuiController) pendingDetail(action string, serviceNames []string) string {
	selection := "无需服务选择"
	if len(serviceNames) > 0 {
		selection = strings.Join(serviceNames, ", ")
	}
	return strings.Join([]string{
		"[#fbbf24]任务已提交，正在执行...[-]",
		"",
		fmt.Sprintf("动作：%s", c.actionTitle(action)),
		fmt.Sprintf("服务：%s", selection),
		fmt.Sprintf("日志目录：%s", c.app.LogsDir),
	}, "\n")
}

func (c *tuiController) defaultDetail() string {
	return strings.Join([]string{
		"[#cbd5e1::b]devctl 控制台[::-]",
		"",
		"[#94a3b8]1.[-] 左侧用方向键移动到服务，按 Space 勾选或取消勾选。",
		"[#94a3b8]2.[-] Tab 切到右侧动作栏，或直接按 s/x/r/l/d/u/q 触发动作。",
		"[#94a3b8]3.[-] Enter 会执行右侧当前高亮动作，不再只是“确认字段”。",
		"",
		fmt.Sprintf("状态文件：%s", c.app.StatePath),
		fmt.Sprintf("日志目录：%s", c.app.LogsDir),
	}, "\n")
}

func (c *tuiController) setDetailText(value string) {
	c.detail.SetText(strings.TrimSpace(value))
	c.detail.ScrollToBeginning()
}

func runInteractiveAction(app *App, action string, serviceNames []string) (string, error) {
	switch action {
	case "refresh":
		return formatDetailSection("状态已刷新", buildInteractiveSummary(app)), nil
	case "doctor":
		return formatDetailSection("环境自检", strings.Join(app.doctorReport(), "\n")) + "\n\n" + buildInteractiveSummary(app), nil
	case "logs":
		if len(serviceNames) != 1 {
			return "", errors.New("查看日志时必须且只能选择一个服务")
		}
		tail, err := app.serviceLogTail(serviceNames[0], 80)
		if err != nil {
			return "", err
		}
		logPath := filepath.Join(app.LogsDir, serviceNames[0]+".log")
		return formatDetailSection("服务日志", fmt.Sprintf("服务：%s\n日志文件：%s\n\n%s", serviceNames[0], logPath, tail)), nil
	case "start", "stop", "restart":
		services, err := normalizeServiceList(app, serviceNames)
		if err != nil {
			return "", err
		}
		var output bytes.Buffer
		switch action {
		case "start":
			err = app.StartServices(services, &output)
		case "stop":
			err = app.StopServices(services, &output)
		case "restart":
			err = app.RestartServices(services, &output)
		}
		if err != nil {
			return "", err
		}
		result := strings.TrimSpace(output.String())
		if result == "" {
			result = "操作已完成"
		}
		return formatDetailSection("最近操作", result) + "\n\n" + buildInteractiveSummary(app), nil
	default:
		return "", fmt.Errorf("未知动作：%s", action)
	}
}

func buildInteractiveSummary(app *App) string {
	snapshot, _ := app.ReconcileState()
	total := 0
	running := 0
	starting := 0
	failed := 0
	var lines []string
	lines = append(lines, "概览")
	lines = append(lines, fmt.Sprintf("- 平台: %s", runtime.GOOS))
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
	lines = append(lines, fmt.Sprintf("- 已启动: %d/%d", running, total))
	lines = append(lines, fmt.Sprintf("- 启动中: %d", starting))
	lines = append(lines, fmt.Sprintf("- 失败: %d", failed))
	lines = append(lines, fmt.Sprintf("- 状态文件: %s", app.StatePath))
	lines = append(lines, fmt.Sprintf("- 日志目录: %s", app.LogsDir))
	lines = append(lines, "")
	lines = append(lines, "服务概览")
	for _, service := range allServices(app) {
		state := currentServiceState(snapshot, service)
		lines = append(lines, fmt.Sprintf("- %s  %s / :%d / %s",
			serviceStatusTag(state.Status),
			serviceTitle(service),
			service.Port,
			displayMode(state.Mode),
		))
		if state.LastError != "" {
			lines = append(lines, "  最近错误："+state.LastError)
		}
	}
	return strings.Join(lines, "\n")
}

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
	return title + "\n" + strings.Repeat("=", len(title)) + "\n" + body
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
