const express = require('express');
const session = require("express-session");
const bcrypt = require("bcryptjs");
const http = require("http");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const servers = {}; // Obiekt przechowujący uruchomione serwery

// Serwowanie plików frontend
app.use(express.static(path.join(__dirname, "..", "frontend")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sesje
app.use(session({
  secret: "tajnyklucz",
  resave: false,
  saveUninitialized: true,
}));

// "Baza danych" – plik users.json
const USERS_FILE = path.join(__dirname, "users.json");
function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  return JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
}
function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Strona główna
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "README.html"));
});

// Rejestracja
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  const users = loadUsers();
  if (users.find(u => u.username === username)) {
    return res.send("Użytkownik już istnieje");
  }

  const hash = await bcrypt.hash(password, 10);
  users.push({ username, password: hash });
  saveUsers(users);

  const userDir = path.join(__dirname, "..", "serwery", username);
  fs.mkdirSync(userDir, { recursive: true });

  const jarSource = path.join(__dirname, "..", "paper-1.21-130.jar");
  const jarDest = path.join(userDir, "paper-1.21-130.jar");
  if (fs.existsSync(jarSource)) {
    fs.copyFileSync(jarSource, jarDest);
  }

  res.redirect("/login.html");
});

// Logowanie
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const users = loadUsers();
  const user = users.find(u => u.username === username);
  if (!user || !await bcrypt.compare(password, user.password)) {
    return res.send("Błędny login lub hasło");
  }
  req.session.user = username;
  res.redirect("/panel.html");
});

// Strony logowania i rejestracji
app.get("/rejestracja.html", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "rejestracja.html"));
});

app.get("/login.html", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "login.html"));
});

// Autoryzacja
app.get("/auth", (req, res) => {
  if (req.session.user) return res.json({ ok: true, user: req.session.user });
  res.status(401).json({ ok: false });
});

// Socket.IO
io.on("connection", socket => {
  socket.on("login", user => {
    socket.user = user;
  });

  // START serwera
  socket.on("start", () => {
    const user = socket.user;
    if (!user) return socket.emit("console", "[System] Brak użytkownika w sesji!");
    if (servers[user]) return socket.emit("console", "[System] Serwer już działa");

    const userDir = path.join(__dirname, "..", "serwery", user);
    const jarPath = path.join(userDir, "paper-1.21-130.jar");

    if (!fs.existsSync(jarPath)) return socket.emit("console", "[System] Brak pliku .jar!");

    const eulaPath = path.join(userDir, "eula.txt");
    if (!fs.existsSync(eulaPath)) {
      fs.writeFileSync(eulaPath, "eula=true\n");
      socket.emit("console", "[System] Plik eula.txt został utworzony automatycznie.");
    }

    const logPath = path.join(userDir, "console.log");
    const logStream = fs.createWriteStream(logPath, { flags: "a" });

    const proc = spawn("java", [
      "--enable-native-access=ALL-UNNAMED",
      "-Xmx1G",
      "-jar",
      "paper-1.21-130.jar",
      "nogui"
    ], { cwd: userDir });

    servers[user] = proc;

    proc.stdout.on("data", data => {
      const text = data.toString();
      socket.emit("console", text);
      logStream.write(`[STDOUT] ${text}`);
    });

    proc.stderr.on("data", data => {
      const text = data.toString();
      socket.emit("console", "[ERR] " + text);
      logStream.write(`[STDERR] ${text}`);
    });

    proc.on("close", code => {
      socket.emit("console", `[System] Serwer zakończony z kodem ${code}`);
      logStream.write(`[CLOSE] Kod zakończenia: ${code}\n`);
      logStream.end();
      delete servers[user];
    });

    socket.emit("console", "[System] Serwer uruchomiony");
  });

  // STOP serwera
  socket.on("stop", () => {
    const proc = servers[socket.user];
    if (!proc) return socket.emit("console", "[System] Serwer nie jest uruchomiony");
    proc.stdin.write("stop\n");
  });

  // Komendy
  socket.on("command", cmd => {
    const proc = servers[socket.user];
    if (!proc) return socket.emit("console", "[System] Serwer nie jest uruchomiony");
    proc.stdin.write(cmd + "\n");
  });
});

server.listen(4000, () => {
  console.log("Hosting działa na http://localhost:4000");
});
