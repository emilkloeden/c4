let globalRoomId;
let playerId;
let turnCount = 0;
const numRows = 6;
const numColumns = 7;
const winLength = 4;
let winState = false;
let waitingForConnection = false;

let root = document.documentElement;

let board = resetBoard()

/**
 * resetBoard()
 * @returns a new, empty board
 */
function resetBoard() {
    const b = []
    for (let i = 0; i < numRows; i++) {
        let row = [];
        for (let j = 0; j < numColumns; j++) {
            row.push(-1)
        }
        b.push(row)
    }
    return b;
}

function requestReset() {
    socket.emit('reset', globalRoomId)
    setStatus("Requesting a reset...")
}
/**
 * dropCoin(colIndex) places a coin at the next available row
 * in the column specified by 'colIndex', calls 'reDrawBoard'
 * to update the UI and then 'checkForWin(rowIndex, colIndex)'
 * to see if the move resulted in  victory.
 * Alternatively calls 'reset' if game is currently in a 'winState'
 * @param {*} colIndex 
 */
function dropCoin(colIndex) {
    if (winState) {
        requestReset()
    }
    else {
        play(colIndex)
    }
}

// Socket.io event handlers
socket.on('joined room', ({ roomId, player, board: gameBoard, turn }) => {
    playerId = player
    globalRoomId = roomId
    board = gameBoard
    waitingForConnection = false
    setHoverColor(player)
    const message = `Joined room ${roomId} as Player ${player + 1}`
    setStatus(message)
    document.getElementById('room').innerText = roomId
    document.getElementById('player').innerText = player + 1
    document.getElementById('turn').innerText = turn === player ? "Your turn." : "Their turn."
    console.log(message)
})

socket.on("player disconnected", () => {
    const message = "Other player left. Waiting for new opponent."
    waitingForConnection = true
    document.getElementById("status").innerText = message
    document.getElementById("turn").innerText = "Waiting for new opponent..."
    console.log(message)
})

socket.on('player connected', ({ player, roomId }) => {
    const message = `Player ${player + 1} joined room ${roomId}.`
    waitingForConnection = false
    setStatus(message)
    console.log(message)
})

socket.on('not your turn', () => {
    setStatus("Please wait for your opponent to take their turn.")
})

socket.on("placement received", ({ rowIndex, colIndex, player }) => {
    updateBoardOnMessage(rowIndex, colIndex, player)
    reDrawBoard()
    document.getElementById('turn').innerText = "Their turn."
    setStatus(`You played in column ${colIndex + 1}.`)
})

socket.on('other user played', ({ rowIndex, colIndex, player }) => {
    updateBoardOnMessage(rowIndex, colIndex, player)
    reDrawBoard()
    document.getElementById('turn').innerText = "Your turn."
    setStatus(`They played in column ${colIndex + 1}.`)
})

socket.on('victory', ({ player, winningSlice }) => {
    setStatus(`Player ${player + 1} wins!`)
    drawWin(winningSlice)
    winState = true;
})

socket.on("game reset", (newBoard) => {
    board = newBoard;
    reset()
})

function setStatus(message) {
    document.getElementById('status').innerText = message
}

function updateBoardOnMessage(rowIndex, colIndex, player) {
    if (player === 0 || player === 1) {
        board[rowIndex][colIndex] = player
    }
}

function setHoverColor(player) {
    root.style.setProperty('--current-color', player === 0 ? 'var(--first-color)' : 'var(--second-color)')
}
/**
 * reDrawBoard() repaints the UI based on the current board state
 * by setting a 'data-color' attribute on each element 
 * of class '.game-col' corresponding to the value of the 
 * corresponding cell in 'board'
 */
function reDrawBoard() {
    document.querySelectorAll('.game-row').forEach((row, i) => {
        row.querySelectorAll('.game-col').forEach((cell, j) => {
            if (board[i][j] === 0) {
                cell.setAttribute('data-color', '0')
            } else if (board[i][j] === 1) {
                cell.setAttribute('data-color', '1')
            }
        })
    })
}

/**
 * checkForWin(rowIndex, colIndex) returns true if last play
 * results in a win for either player
 * @param {*} rowIndex 
 * @param {*} colIndex 
 * @returns 
 */
function checkForWin(rowIndex, colIndex) {
    const horizontalWinner = checkForHorizontalWin(rowIndex, colIndex);
    if (horizontalWinner) {
        drawWin(horizontalWinner)
        return true;
    }
    const verticalWinner = checkForVerticalWin(rowIndex, colIndex);
    if (verticalWinner) {
        drawWin(verticalWinner);
        return true;
    }
    const forwardDiagonalWinner = checkForForwardDiagonalWin(rowIndex, colIndex);
    if (forwardDiagonalWinner) {
        drawWin(forwardDiagonalWinner);
        return true; // TODO, consider printing all winners. Would require a flag, and each checkFor...Winner function to return an array of slices
    }
    const backwardDiagonalWinner = checkForBackwardDiagonalWin(rowIndex, colIndex);
    if (backwardDiagonalWinner) {
        drawWin(backwardDiagonalWinner);
        return true; // TODO, consider printing all winners. Would require a flag, and each checkFor...Winner function to return an array of slices
    }
    return false;
}

/**
 * drawWin(winningSlice) draws the board UI in the event of a win
 * @param {Array<CellData>} winningSlice 
 */
function drawWin(winningSlice) {
    const winningColor = winningSlice[0].columnValue;
    colorBackgroundInWinningColor(winningColor);
    drawWinningSlice(winningSlice);
}

/**
 * colorBackgroundInWinningColor(winningColor) 
 * colors all cells with the winner's color
 * @param {*} winningColor 
 */
function colorBackgroundInWinningColor(winningColor) {
    console.log(`winningColor: ${winningColor}`)
    document.querySelectorAll('.game-row').forEach(row => row.setAttribute('data-bg-color', `${winningColor} `));
}

/**
 * drawWinningSlice(winningSlice)
 * colors cells in 'winningSlice' with var(--win-color)
 * by setting the cell's 'data-color' atribute to 2
 * @param {*} winningSlice 
 */
function drawWinningSlice(winningSlice) {
    document.querySelectorAll('.game-row').forEach((row, i) => {
        row.querySelectorAll('.game-col').forEach((cell, j) => {
            winningSlice.forEach(winningCell => {
                if (winningCell.rowIndex === i && winningCell.columnIndex === j) {
                    cell.setAttribute('data-color', '2');
                }
            });
        });
    });
}

// function checkForHorizontalWin(rowIndex, colIndex) {
//     const row = board[rowIndex];
//     const currentCellValue = board[rowIndex][colIndex]
//     const slices = getRowSlices(row, rowIndex, colIndex);
//     const winningSlice = slices.find(slice => slice.every(cell => cell.columnValue === currentCellValue))
//     return winningSlice;
// }

// function getRowSlices(row, rowIndex, colIndex) {
//     const slices = [];
//     for (let i = winLength - 1; i >= 0; i--) {
//         if (colIndex - i >= 0 && colIndex - i + winLength <= numColumns) {
//             let slice = row.slice(colIndex - i, colIndex - i + winLength);
//             slices.push(slice.map((columnValue, sliceIndex) => { return { rowIndex, columnIndex: colIndex - i + sliceIndex, columnValue } }))
//         }
//     }

//     return slices;
// }

// function checkForVerticalWin(rowIndex, colIndex) {
//     const currentCellValue = board[rowIndex][colIndex]
//     const column = getColumn(colIndex)
//     const slices = getColumnSlices(column, rowIndex, colIndex);
//     const winningSlice = slices.find(slice => slice.every(cell => cell.columnValue === currentCellValue))
//     return winningSlice;
// }

// function getColumnSlices(column, rowIndex, colIndex) {
//     const slices = [];
//     for (let i = winLength - 1; i >= 0; i--) {
//         if (rowIndex - i >= 0 && rowIndex - i + winLength <= numRows) {
//             let slice = column.slice(rowIndex - i, rowIndex - i + winLength);
//             slices.push(slice.map((columnValue, sliceIndex) => { return { rowIndex: rowIndex - i + sliceIndex, columnIndex: colIndex, columnValue } }))
//         }
//     }

//     return slices;
// }

// function checkForForwardDiagonalWin(rowIndex, colIndex) {
//     const currentCellValue = board[rowIndex][colIndex];
//     for (let i = 0; i < winLength; i++) {
//         try {
//             const slice = [
//                 { rowIndex: rowIndex + 3 - i, columnIndex: colIndex + i - 3, columnValue: board[rowIndex + 3 - i][colIndex + i - 3] },
//                 { rowIndex: rowIndex + 2 - i, columnIndex: colIndex + i - 2, columnValue: board[rowIndex + 2 - i][colIndex + i - 2] },
//                 { rowIndex: rowIndex + 1 - i, columnIndex: colIndex + i - 1, columnValue: board[rowIndex + 1 - i][colIndex + i - 1] },
//                 { rowIndex: rowIndex + 0 - i, columnIndex: colIndex + i - 0, columnValue: board[rowIndex + 0 - i][colIndex + i - 0] },
//             ]
//             if (slice.every(cell => cell.columnValue === currentCellValue)) {
//                 return slice;
//             }
//         } catch (e) {
//             // This is going to be reached.. a lot.
//         }

//     }
// }

// function checkForBackwardDiagonalWin(rowIndex, colIndex) {
//     const currentCellValue = board[rowIndex][colIndex];
//     for (let i = 0; i < winLength; i++) {
//         try {
//             const slice = [
//                 { rowIndex: rowIndex - 3 - i, columnIndex: colIndex + i - 3, columnValue: board[rowIndex - 3 - i][colIndex + i - 3] },
//                 { rowIndex: rowIndex - 2 - i, columnIndex: colIndex + i - 2, columnValue: board[rowIndex - 2 - i][colIndex + i - 2] },
//                 { rowIndex: rowIndex - 1 - i, columnIndex: colIndex + i - 1, columnValue: board[rowIndex - 1 - i][colIndex + i - 1] },
//                 { rowIndex: rowIndex - 0 - i, columnIndex: colIndex + i - 0, columnValue: board[rowIndex - 0 - i][colIndex + i - 0] },
//             ]
//             if (slice.every(cell => cell.columnValue === currentCellValue)) {
//                 return slice;
//             }
//         } catch (e) {
//             // This is going to be reached.. a lot.
//         }

//     }
// }

// /**
//  * getNextCell(colIndex) returns the rowIndex of the 
//  * next available row in column specifed by 'colIndex'
//  * or throws an Error if column is full
//  * @param {*} colIndex 
//  * @returns int
//  */
// function getNextCell(colIndex) {
//     const column = getColumn(colIndex)
//     let lastPlacedRowIndex = column.findIndex(row => row === 0 || row === 1)
//     if (lastPlacedRowIndex === 0) {
//         throw new Error('Column is full.')
//     }
//     else if (lastPlacedRowIndex === -1) {
//         lastPlacedRowIndex = numRows;
//     }
//     return lastPlacedRowIndex - 1

// }

// /**
//  * getColumn(colIndex) returns an Array comprising the values
//  * of the board at colIndex 
//  * @param {Array<CellValue>} colIndex 
//  * @returns 
//  */
// function getColumn(colIndex) {
//     return board.flatMap(row => row[colIndex]);
// }


/**
 * makeDropCoin(colIndex), used to add desired event handler
 * to placement cells
 * @param {*} colIndex 
 * @returns function dropCoin
 */
function makeDropCoin(colIndex) {
    return function dropCoin() {
        if (winState) {
            requestReset()
        } else {
            play(colIndex)
        }
    }
}

function play(colIndex) {
    socket.emit('played', { roomId: globalRoomId, player: playerId, colIndex })
}

function toggleCurrentColor() {
    root.style.setProperty('--current-color',
        turnCount % 2 == 0 ? 'var(--first-color)' : 'var(--second-color)');
}

/**
 * reset()
 * resets the board, board UI and game state.
 */
function reset() {
    setTimeout(() => {
        clearBoardUI();
        reDrawBoard()
        winState = false
        setStatus("The game has been reset.")
    }, 200)

}

function clearBoardUI() {
    document.querySelectorAll('.game-row').forEach(row => row.removeAttribute('data-bg-color'));
    document.querySelectorAll('.game-col').forEach(el => el.removeAttribute('data-color'));
}

/**
 * handleKeys(e) calls dropCoin(key - 1) 
 * if key in range or reset() on 'Esc'
 * @param {*} e 
 */
function handleKeys(e) {
    switch (e.key) {
        case 'Escape':
            requestReset();
            break;
        case '1':
            dropCoin(0);
            break;
        case '2':
            dropCoin(1);
            break;
        case '3':
            dropCoin(2);
            break;
        case '4':
            dropCoin(3);
            break;
        case '5':
            dropCoin(4);
            break;
        case '6':
            dropCoin(5);
            break;
        case '7':
            dropCoin(6);
            break;

        default:
            break;
    }
}

function addEventListeners() {
    const placements = document.querySelectorAll('.placement-col');
    placements.forEach((placement, i) => {
        placement.addEventListener('click', makeDropCoin(i));
    });
    document.querySelector('#reset').addEventListener('click', requestReset)
    window.addEventListener('keyup', handleKeys)
}

function onLoad() {
    addEventListeners()
    reDrawBoard()

}

window.onload = onLoad;