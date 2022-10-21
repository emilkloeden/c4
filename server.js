const path = require('path')
const http = require('http')
const express = require('express')
const { Server } = require('socket.io')

const { resetBoard,
    getNextCell,
    updateBoard,
    checkForWinState } = require('./c4gamelogic.js')
const app = express()
const server = http.createServer(app)
const io = new Server(server);
// app.http().io()
const PORT = 3000;

app.use(express.static(path.join(__dirname, "/public")))

app.get('/', (_, res) => res.sendFile('multiplayer.html', { root: path.join(__dirname, "/public") }))
app.get('/one-device', (_, res) => res.sendFile('one-device.html', { root: path.join(__dirname, "/public") }))
app.get('/single-player', (_, res) => res.sendFile('single-player.html', { root: path.join(__dirname, "/public") }))
// app.get('/single-player', (_, res) => res.sendFile('single-player.html'))

let rooms = new Map()

io.on('connection', socket => {
    console.log('a user connected')
    const roomId = chooseRoom(socket)
    joinRoom(roomId, socket.id, socket)
    socket.on('disconnect', () => {
        const room = rooms.get(roomId)
        let players = room.get('players')
        players = players.filter(playerId => playerId !== socket.id)
        console.log(`user disconnected from ${roomId}`)
        console.log(`players remaining in room ${roomId}: ${players.length}`)
        if (!players.length) {
            rooms.delete(roomId)
        } else {
            io.to(roomId).emit("player disconnected")
            // TODO: Do we want to reset the game here? 
            // What about when another player joins that room?
        }

    })
    socket.on('reset', (roomId) => {
        console.log(`Reset of room ${roomId} requested`)
        const room = rooms.get(roomId)
        const newBoard = resetBoard()
        room.set('board', newBoard)
        room.set('state', false)
        io.to(roomId).emit("game reset", newBoard)
    })
    socket.on('played', ({ roomId, player, colIndex }) => {
        if (isPlayersTurn(roomId, player) && isRoomFull(roomId)) {
            const room = rooms.get(roomId)
            const board = room.get('board')
            console.log(`Player ${player} played in ${colIndex}`)

            const rowIndex = getNextCell(colIndex, board)
            updateBoard(rowIndex, colIndex, player, board)

            const winningSlice = checkForWinState(rowIndex, colIndex, player, board)
            if (winningSlice) {
                room.set('state', true)
                io.to(roomId).emit("victory", { player, winningSlice })
            }
            else {
                io.to(socket.id).emit("placement received", { rowIndex, colIndex, player })
                socket.to(roomId).emit("other user played", { rowIndex, colIndex, player })
            }
            console.log(winningSlice)
            toggleTurn(roomId)
        } else {
            io.to(socket.id).emit("not your turn")
            console.log(`Player ${player + 1} attempted to play out of turn.`)
        }
    })
})

server.listen(process.env.PORT || PORT, () => console.log(`\u{1F680} server started on port ${PORT}`))



function createRoom(roomId) {
    const room = new Map()
    room.set('players', [])
    room.set('board', resetBoard())
    room.set('turn', 0)
    room.set('state', false)
    rooms.set(roomId, room)
}

function joinRoom(roomId, playerId, socket) {
    const room = rooms.get(roomId)
    const players = room.get('players')
    const board = room.get('board')
    const turn = room.get('turn')
    players.push(playerId)
    console.log(`roomId: ${roomId}, players: ${players}`)
    const player = players.length - 1;
    socket.join(roomId)
    console.log(`a user connected to room ${roomId} as player ${player}`)
    socket.to(roomId).emit("player connected", { player, roomId })
    io.to(socket.id).emit("joined room", { player, roomId, board, turn })
}

function getJoinableRoomId() {
    for (let [roomId, room] of rooms) {
        const players = room.get('players')
        if (players.length === 1) {
            return roomId
        }
    }
    return undefined
}

function getMaxRoomId() {
    const roomIds = []
    for (let [roomId, _] of rooms) {
        roomIds.push(roomId)
    }
    return Math.max(...roomIds)
}

function chooseRoom(socket) {
    let roomId;
    if (!rooms.size) {
        roomId = 1;
        createRoom(roomId)
        return roomId;
    }
    roomId = getJoinableRoomId()
    if (roomId) {
        return roomId
    }
    roomId = getMaxRoomId() + 1;
    createRoom(roomId)
    return roomId
}

// deprecated
function chooseRoomOriginal(socket) {
    let i = 1
    while (i < 10) {
        if (!rooms.has(i)) {
            // First player joins a room, create the map
            const room = new Map()
            room.set('players', [socket.id])
            room.set('board', resetBoard())
            room.set('turn', 0)
            room.set('state', false)
            rooms.set(i, room)
            return { roomId: i, player: 0 };
        } else {
            const room = rooms.get(i)
            const players = room.get('players')
            if (players.length === 1) {
                players.push(socket.id)
                return { roomId: i, player: 1 };
            }
        }
        i++
    }
    return { roomId: -1, player: -1 };
}

function isPlayersTurn(roomId, player) {
    const room = rooms.get(roomId)
    const turn = room.get('turn')
    return turn % 2 === player
}

function isRoomFull(roomId) {
    const room = rooms.get(roomId)
    if (!room) return false
    const players = room.get('players')
    return players.length === 2
}

function toggleTurn(roomId) {
    const room = rooms.get(roomId)
    const lastTurn = room.get('turn')
    room.set('turn', (lastTurn + 1) % 2)
}
