const ROOM = window.ROOM_CODE;
const USERNAME = window.USERNAME;

const socket = io();

const log = document.getElementById("log");
const listenerList = document.getElementById("listener-list");
const typingRow = document.getElementById("typing-row");
const composer = document.getElementById("composer");
const input = document.getElementById("message-input");
const signalIndicator = document.getElementById("signal-indicator");
const copyBtn = document.getElementById("copy-btn");
const sendBtn = composer.querySelector(".btn-send");

let typingTimeout = null;
const typingUsers = new Set();

socket.on("connect", () => {
  signalIndicator.classList.add("live");
  socket.emit("join", { room: ROOM, username: USERNAME });
});

socket.on("disconnect", () => {
  signalIndicator.classList.remove("live");
});

socket.on("history", (data) => {
  log.innerHTML = "";
  data.messages.forEach(renderMessage);
  scrollToBottom();
});

socket.on("message", (msg) => {
  renderMessage(msg);
  scrollToBottom();
});

socket.on("system", (msg) => {
  renderSystem(msg.text);
  scrollToBottom();
});

socket.on("user_list", (data) => {
  listenerList.innerHTML = "";
  data.users.forEach((name) => {
    const li = document.createElement("li");
    li.textContent = name;
    listenerList.appendChild(li);
  });
});

socket.on("typing", (data) => {
  if (data.username === USERNAME) return;
  typingUsers.add(data.username);
  renderTyping();
});

socket.on("stop_typing", (data) => {
  typingUsers.delete(data.username);
  renderTyping();
});

composer.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  socket.emit("send_message", { room: ROOM, username: USERNAME, text });
  socket.emit("stop_typing", { room: ROOM, username: USERNAME });
  input.value = "";

  sendBtn.classList.remove("sent");
  void sendBtn.offsetWidth;
  sendBtn.classList.add("sent");
});

input.addEventListener("input", () => {
  socket.emit("typing", { room: ROOM, username: USERNAME });
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit("stop_typing", { room: ROOM, username: USERNAME });
  }, 1500);
});

copyBtn.addEventListener("click", () => {
  navigator.clipboard.writeText(ROOM).then(() => {
    const original = copyBtn.textContent;
    copyBtn.textContent = "copied";
    copyBtn.classList.add("copied");
    setTimeout(() => {
      copyBtn.textContent = original;
      copyBtn.classList.remove("copied");
    }, 1200);
  });
});

function renderMessage(msg) {
  const wrap = document.createElement("div");
  wrap.className = "msg " + (msg.user === USERNAME ? "mine" : "theirs");

  const meta = document.createElement("div");
  meta.className = "msg-meta";
  meta.textContent = `${msg.user} · ${msg.time}`;

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";
  bubble.textContent = msg.text;

  wrap.appendChild(meta);
  wrap.appendChild(bubble);
  log.appendChild(wrap);
}

function renderSystem(text) {
  const wrap = document.createElement("div");
  wrap.className = "msg system";
  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";
  bubble.textContent = text;
  wrap.appendChild(bubble);
  log.appendChild(wrap);
}

function renderTyping() {
  const names = [...typingUsers];
  if (names.length === 0) {
    typingRow.classList.remove("visible");
    typingRow.innerHTML = "";
    return;
  }

  const label =
    names.length === 1
      ? `${names[0]} is transmitting`
      : `${names.join(", ")} are transmitting`;

  typingRow.innerHTML = `${label}<span class="typing-dots"><span></span><span></span><span></span></span>`;
  typingRow.classList.add("visible");
}

function scrollToBottom() {
  log.scrollTop = log.scrollHeight;
}
