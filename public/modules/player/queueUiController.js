export function createQueueUiController({
  elements = {},
  getQueue = () => [],
  getCurrentIndex = () => -1,
  getNextPlaybackIndex = () => -1,
  getPlayMode = () => "order",
  renderQueueModeControls = () => "",
  escapeHtml = (value) => String(value ?? ""),
  formatTime = (value) => String(value ?? ""),
  requestAnimationFrameFn = (callback) => callback(),
  setTimeoutFn = (callback) => setTimeout(callback, 0),
  clearTimeoutFn = (timer) => clearTimeout(timer)
} = {}) {
  const {
    body,
    queueList,
    queueToggle,
    queuePopover,
    queuePanelList,
    nextTrackTitle,
    playerQueueBtn,
    playerQueuePanel,
    playerQueueList,
    queueSheet,
    queueSheetList,
    queueSheetMode
  } = elements;

  let playerQueueCloseTimer = null;
  let playerQueueScrollTimer = null;
  let queueCloseTimer = null;
  let queueSheetCloseTimer = null;

  function getCurrentQueueIndex(queue = getQueue()) {
    return getCurrentIndex(queue);
  }

  function renderQueueSheetControls(target = "home") {
    return renderQueueModeControls(getPlayMode(), target);
  }

  function getQueueCountLabel(queue = []) {
    return `${queue.length} 首`;
  }

  function renderPanelItem(track, index, queue, config = {}) {
    const currentIndex = getCurrentQueueIndex(queue);
    const current = index === currentIndex ? " is-current" : "";
    const style = config.includeRowStyle ? ` style="--queue-row:${index}"` : "";
    const sourceAttrs = config.includeSourceAttrs
      ? ` data-source="${escapeHtml(track.source || "")}" data-source-id="${escapeHtml(track.sourceId || "")}"`
      : "";
    const indexLabel = config.plainIndex ? String(index + 1) : String(index + 1).padStart(2, "0");
    return `
        <div class="queue-panel-item${current}" data-track-index="${index}"${style} aria-selected="${index === currentIndex}">
          <span class="queue-panel-index">${indexLabel}</span>
          <button class="queue-panel-copy" type="button" data-${config.playAttr}="${index}"${sourceAttrs}>
            <strong>${escapeHtml(track.title)}</strong>
            <span>${escapeHtml(track.artist || "未知歌手")} / ${formatTime(track.duration)}</span>
          </button>
          <div class="queue-panel-actions">
            <button class="queue-play-next-btn" type="button" data-${config.nextAttr}="${index}" aria-label="下一首播放" title="下一首播放">
              <span aria-hidden="true"></span>
            </button>
            <button class="queue-next-btn" type="button" data-${config.removeAttr}="${index}" aria-label="从播放队列删除" title="删除"${queue.length > 1 ? "" : " disabled"}>
              <span aria-hidden="true"></span>
            </button>
          </div>
        </div>
      `;
  }

  function renderQueue(queue = getQueue()) {
    if (!queueList) return;
    const currentIndex = getCurrentQueueIndex(queue);
    queueList.innerHTML = queue
      .map((track, index) => {
        const active = index === currentIndex ? " now-playing" : "";
        return `
        <button class="queue-item${active}" type="button" data-track-index="${index}">
          <span class="queue-index">${String(index + 1).padStart(2, "0")}</span>
          <span>
            <strong>${escapeHtml(track.title)}</strong>
            <span>${escapeHtml(track.artist || "未知歌手")} / ${formatTime(track.duration)}</span>
          </span>
          <span>${formatTime(track.duration)}</span>
        </button>
      `;
      })
      .join("");
  }

  function syncPlayerQueue(queue = getQueue()) {
    if (!playerQueueList) return;
    const playerQueueCount = playerQueuePanel?.querySelector(".queue-popover-head small");
    if (playerQueueCount) playerQueueCount.textContent = getQueueCountLabel(queue);
    if (!queue.length) {
      playerQueueList.innerHTML = "";
      return;
    }
    playerQueueList.innerHTML = renderQueueSheetControls("player") + queue
      .map((track, index) => renderPanelItem(track, index, queue, {
        playAttr: "player-play-index",
        nextAttr: "player-next-index",
        removeAttr: "player-remove-index",
        includeRowStyle: true,
        plainIndex: true
      }))
      .join("");
  }

  function renderGlobalQueueSheet(queue = getQueue()) {
    if (!queueSheetList) return;
    const count = queueSheet?.querySelector(".queue-popover-head small");
    if (count) count.textContent = getQueueCountLabel(queue);
    if (queueSheetMode) queueSheetMode.innerHTML = renderQueueSheetControls("sheet");
    if (!queue.length) {
      queueSheetList.innerHTML = "";
      return;
    }
    queueSheetList.innerHTML = queue
      .map((track, index) => renderPanelItem(track, index, queue, {
        playAttr: "sheet-play-index",
        nextAttr: "sheet-next-index",
        removeAttr: "sheet-remove-index",
        includeSourceAttrs: true
      }))
      .join("");
  }

  function renderQueueDock(queue = getQueue()) {
    const queueCount = queuePopover?.querySelector(".queue-popover-head small");
    if (queueCount) queueCount.textContent = getQueueCountLabel(queue);
    if (!queue?.length) {
      if (nextTrackTitle) nextTrackTitle.textContent = "暂无队列";
      if (queuePanelList) queuePanelList.innerHTML = "";
      syncPlayerQueue(queue || []);
      return;
    }

    const nextTrack = queue[getNextPlaybackIndex(queue)];
    if (nextTrackTitle) {
      nextTrackTitle.textContent = nextTrack ? `${nextTrack.title} - ${nextTrack.artist || "未知歌手"}` : "准备中";
    }
    if (queuePanelList) {
      queuePanelList.innerHTML = renderQueueSheetControls("home") + queue
        .map((track, index) => renderPanelItem(track, index, queue, {
          playAttr: "play-index",
          nextAttr: "next-index",
          removeAttr: "remove-index",
          includeSourceAttrs: true
        }))
        .join("");
    }
    syncPlayerQueue(queue);
  }

  function scrollCurrentQueueItem(container) {
    const currentItem = container?.querySelector(".queue-panel-item.is-current");
    if (!currentItem) return;
    requestAnimationFrameFn(() => {
      const targetTop = currentItem.offsetTop + currentItem.offsetHeight / 2 - container.clientHeight / 2;
      const maxTop = Math.max(0, container.scrollHeight - container.clientHeight);
      container.scrollTo({
        top: Math.max(0, Math.min(targetTop, maxTop)),
        behavior: "smooth"
      });
    });
  }

  function closePanel(panel, timerSetter) {
    panel?.classList?.remove("is-open");
    panel?.classList?.add("is-closing");
    return setTimeoutFn(() => {
      if (panel) {
        panel.hidden = true;
        panel.classList?.remove("is-closing");
      }
      timerSetter(null);
    }, 260);
  }

  function setPlayerQueueOpen(open) {
    if (!playerQueuePanel || !playerQueueBtn) return;
    clearTimeoutFn(playerQueueCloseTimer);
    clearTimeoutFn(playerQueueScrollTimer);
    playerQueueScrollTimer = null;
    if (open) {
      syncPlayerQueue(getQueue());
      playerQueuePanel.hidden = false;
      playerQueuePanel.classList.remove("is-closing");
      requestAnimationFrameFn(() => {
        playerQueuePanel.classList.add("is-open");
        playerQueueScrollTimer = setTimeoutFn(() => {
          playerQueueScrollTimer = null;
          scrollCurrentQueueItem(playerQueueList);
        }, 120);
      });
    } else {
      playerQueueCloseTimer = closePanel(playerQueuePanel, (timer) => {
        playerQueueCloseTimer = timer;
      });
    }
    playerQueueBtn.setAttribute("aria-expanded", String(open));
    body?.classList?.toggle("player-queue-open", Boolean(open));
  }

  function setQueueOpen(open) {
    if (!queuePopover || !queueToggle) return;
    clearTimeoutFn(queueCloseTimer);
    if (open) {
      renderQueueDock(getQueue());
      queuePopover.hidden = false;
      queuePopover.classList.remove("is-closing");
      requestAnimationFrameFn(() => {
        queuePopover.classList.add("is-open");
        scrollCurrentQueueItem(queuePanelList);
      });
    } else {
      queueCloseTimer = closePanel(queuePopover, (timer) => {
        queueCloseTimer = timer;
      });
    }
    queueToggle.setAttribute("aria-expanded", String(open));
    body?.classList?.toggle("queue-open", Boolean(open));
  }

  function setQueueSheetOpen(open) {
    if (!queueSheet || !queueSheetList) return;
    clearTimeoutFn(queueSheetCloseTimer);
    setQueueOpen(false);
    setPlayerQueueOpen(false);
    if (open) {
      renderGlobalQueueSheet(getQueue());
      queueSheet.hidden = false;
      queueSheet.classList.remove("is-closing");
      requestAnimationFrameFn(() => {
        queueSheet.classList.add("is-open");
        scrollCurrentQueueItem(queueSheetList);
      });
    } else {
      queueSheetCloseTimer = closePanel(queueSheet, (timer) => {
        queueSheetCloseTimer = timer;
      });
    }
    body?.classList?.toggle("queue-sheet-open", Boolean(open));
  }

  return {
    renderGlobalQueueSheet,
    renderQueue,
    renderQueueDock,
    renderQueueSheetControls,
    scrollCurrentQueueItem,
    setPlayerQueueOpen,
    setQueueOpen,
    setQueueSheetOpen,
    syncPlayerQueue
  };
}


