const socket = io("http://localhost:8080/", {
    transports: ["websocket"]
});

let username = "";
let current = "public";

const joined = new Set();
const history = { public: [] };

let roomList = [];

const $ = (id) => document.getElementById(id);

// Existing events
socket.on("gyankibaat", (m) =>
    console.log("Message from server", m)
);

socket.on("join", (m) =>
    console.log("Message from server", m)
);

socket.on("announcement", (m) =>
    console.log("Message from server", m)
);

socket.emit("kuchbhi", "welcome to client side ");

socket.on("connect", () => {
    $("status").textContent = "online";

    if (username) {
        socket.emit("set-username", username);

        joined.forEach((r) =>
            socket.emit("join-room", r)
        );
    }
});

socket.on("disconnect", () => {
    $("status").textContent =
        "offline - server check karo";
});

socket.on("connect_error", () => {
    $("status").textContent =
        "server se connect nahi ho raha";
});

// Login
$("loginForm").addEventListener("submit", (e) => {
    e.preventDefault();

    username = $("nameInput").value.trim();

    if (!username) return;

    socket.emit("set-username", username);

    $("meName").textContent = username;
    $("login").hidden = true;

    $("msgInput").focus();
});

// Receive messages
socket.on("chat-message", (m) =>
    addMessage("public", m)
);

socket.on("room-message", (m) =>
    addMessage(m.room, m)
);

socket.on("room-notice", (n) =>
    addMessage(n.room, {
        notice: true,
        text: n.text
    })
);

// Room list
socket.on("room-list", (list) => {
    roomList = list;
    renderRooms();
});

socket.on("joined-room", (room) => {
    joined.add(room);

    history[room] = history[room] || [];

    switchTo(room);
});

socket.on("left-room", (room) => {
    joined.delete(room);

    delete history[room];

    if (current === room) {
        switchTo("public");
    }

    renderRooms();
});

// Send message
$("sendForm").addEventListener("submit", (e) => {
    e.preventDefault();

    const text = $("msgInput").value.trim();

    if (!text) return;

    if (current === "public") {
        socket.emit("chat-message", text);
    } else {
        socket.emit("room-message", {
            room: current,
            text
        });
    }

    $("msgInput").value = "";
});

// Create or join room
$("roomForm").addEventListener("submit", (e) => {
    e.preventDefault();

    const room = $("roomInput").value.trim();

    if (!room) return;

    socket.emit("join-room", room);

    $("roomInput").value = "";
});

// Leave room
$("leave").addEventListener("click", () => {
    socket.emit("leave-room", current);
});

// Public chat
$("publicBtn").addEventListener("click", () => {
    switchTo("public");
});

// Add message
function addMessage(chat, m) {
    if (!history[chat]) return;

    history[chat].push(m);

    if (chat === current) {
        renderMessages();
    }
}

// Switch chat
function switchTo(chat) {
    current = chat;

    const isPublic = chat === "public";

    $("title").textContent = isPublic
        ? "Public chat"
        : "Room: " + chat;

    $("sub").textContent = isPublic
        ? "Yahan sab log dekhte hain"
        : "Sirf is room ke members dekhte hain";

    $("leave").hidden = isPublic;

    renderRooms();
    renderMessages();

    $("msgInput").focus();
}

// Render messages
function renderMessages() {
    const box = $("msgs");

    box.innerHTML = "";

    const list = history[current] || [];

    if (!list.length) {
        const d = document.createElement("div");

        d.className = "empty";
        d.textContent =
            "Abhi koi message nahi. Pehla message bhejo.";

        box.appendChild(d);

        return;
    }

    list.forEach((m) => {
        const d = document.createElement("div");

        if (m.notice) {
            d.className = "notice";
            d.textContent = m.text;
        } else {
            d.className =
                "msg" + (m.user === username ? " mine" : "");

            const who = document.createElement("div");

            who.className = "who";

            who.textContent =
                m.user + " · " +
                new Date(m.time).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit"
                });

            const t = document.createElement("div");

            t.textContent = m.text;

            d.append(who, t);
        }

        box.appendChild(d);
    });

    box.scrollTop = box.scrollHeight;
}

// Create room button
function roomButton(name, users, active) {
    const b = document.createElement("button");

    b.className = "item" + (active ? " active" : "");

    b.innerHTML =
        "<span></span><span class='count'></span>";

    b.children[0].textContent = name;

    b.children[1].textContent =
        users != null ? users + " online" : "";

    return b;
}

// Render rooms
function renderRooms() {
    const mine = $("myRooms");
    const all = $("allRooms");

    mine.innerHTML = "";
    all.innerHTML = "";

    $("publicBtn").classList.toggle(
        "active",
        current === "public"
    );

    if (!joined.size) {
        const p = document.createElement("div");

        p.className = "count";
        p.textContent = "Abhi kisi room me nahi ho";

        mine.appendChild(p);
    }

    joined.forEach((r) => {
        const info = roomList.find(
            (x) => x.name === r
        );

        const b = roomButton(
            r,
            info ? info.users : null,
            current === r
        );

        b.addEventListener("click", () =>
            switchTo(r)
        );

        mine.appendChild(b);
    });

    const others = roomList.filter(
        (r) => !joined.has(r.name)
    );

    if (!others.length) {
        const p = document.createElement("div");

        p.className = "count";
        p.textContent = "Koi aur room nahi hai";

        all.appendChild(p);
    }

    others.forEach((r) => {
        const b = roomButton(
            r.name,
            r.users,
            false
        );

        b.title = "Join karne ke liye click karo";

        b.addEventListener("click", () =>
            socket.emit("join-room", r.name)
        );

        all.appendChild(b);
    });
}

// Initial rendering
renderRooms();
renderMessages();
