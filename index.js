const express = require("express"),
    cors = require("cors"),
    http = require("http"),
    { Server } = require("socket.io"),
    questions = require("./questions.json");

const app = express();
app.use(cors({ origin: "*" }));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

let players = {};
let finishedPlayers = [];

io.on("connection", socket => {
    console.log("New client connected:", socket.id);
    socket.on("join_game", username => {
        players[socket.id] = { username, currentQuestion: 0, score: 0 };
        io.emit("player_list", Object.values(players).map(p => p.username));
    });

    socket.on("start_game", () => {
        console.log("Game started by admin");
        finishedPlayers = [];
        io.emit("game_started");
    });

    socket.on("request_questions", () => {
        const shuffled = [...questions].sort(() => Math.random() - 0.5);
        console.log("Sending questions to", socket.id);
        socket.emit("receive_questions", shuffled);
    });

    socket.on("answer_question", ({ isCorrect, timeTaken }) => {
        const player = players[socket.id];
        if (player) {
            player.score += isCorrect ? (timeTaken <= 4 ? 2 : 1) : 0;
            player.currentQuestion++;

            if (player.currentQuestion >= questions.length) {
                finishedPlayers.push(player.username);

                if (finishedPlayers.length === Object.keys(players).length) {
                    io.emit("game_ended", Object.values(players)
                        .map(p => ({ username: p.username, score: p.score }))
                        .sort((a, b) => b.score - a.score));
                }
            }

            io.emit("score_update", Object.values(players)
                .map(p => ({ username: p.username, score: p.score }))
                .sort((a, b) => b.score - a.score));
        }
    });

    socket.on("disconnect", () => {
        delete players[socket.id];
        io.emit("player_list", Object.values(players).map(p => p.username));
    });
});

server.listen(process.env.PORT || 5000, () => console.log("Server running"));
