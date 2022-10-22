// globals
// let turnCount = 0;
const numRows = 6;
const numColumns = 7;
const winLength = 4;

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

function checkForWinState(rowIndex, colIndex, player, board) {
    const horizontalWinner = checkForHorizontalWin(rowIndex, colIndex, board);
    if (horizontalWinner) {
        return horizontalWinner
    }
    const verticalWinner = checkForVerticalWin(rowIndex, colIndex, board);
    if (verticalWinner) {
        return verticalWinner
    }
    const forwardDiagonalWinner = checkForForwardDiagonalWin(rowIndex, colIndex, board);
    if (forwardDiagonalWinner) {
        return forwardDiagonalWinner
    }
    const backwardDiagonalWinner = checkForBackwardDiagonalWin(rowIndex, colIndex, board);
    if (backwardDiagonalWinner) {
        return backwardDiagonalWinner
    }
    return false;
}


function checkForHorizontalWin(rowIndex, colIndex, board) {
    const row = board[rowIndex];
    const currentCellValue = board[rowIndex][colIndex]
    const slices = getRowSlices(row, rowIndex, colIndex);
    const winningSlice = slices.find(slice => slice.every(cell => cell.columnValue === currentCellValue))
    return winningSlice;
}

function getRowSlices(row, rowIndex, colIndex) {
    const slices = [];
    for (let i = winLength - 1; i >= 0; i--) {
        if (colIndex - i >= 0 && colIndex - i + winLength <= numColumns) {
            let slice = row.slice(colIndex - i, colIndex - i + winLength);
            slices.push(slice.map((columnValue, sliceIndex) => { return { rowIndex, columnIndex: colIndex - i + sliceIndex, columnValue } }))
        }
    }

    return slices;
}

function checkForVerticalWin(rowIndex, colIndex, board) {
    const currentCellValue = board[rowIndex][colIndex]
    const column = getColumn(colIndex, board)
    const slices = getColumnSlices(column, rowIndex, colIndex);
    const winningSlice = slices.find(slice => slice.every(cell => cell.columnValue === currentCellValue))
    return winningSlice;
}

function getColumnSlices(column, rowIndex, colIndex) {
    const slices = [];
    for (let i = winLength - 1; i >= 0; i--) {
        if (rowIndex - i >= 0 && rowIndex - i + winLength <= numRows) {
            let slice = column.slice(rowIndex - i, rowIndex - i + winLength);
            slices.push(slice.map((columnValue, sliceIndex) => { return { rowIndex: rowIndex - i + sliceIndex, columnIndex: colIndex, columnValue } }))
        }
    }

    return slices;
}

function checkForForwardDiagonalWin(rowIndex, colIndex, board) {
    const currentCellValue = board[rowIndex][colIndex];
    for (let i = 0; i < winLength; i++) {
        try {
            const slice = []

            for (let j = 3; j >= 0; j--) {
                const sliceRowIndex = rowIndex + j - i
                const sliceColIndex = colIndex - j + i
                slice.push({
                    rowIndex: sliceRowIndex,
                    columnIndex: sliceColIndex,
                    columnValue: board[sliceRowIndex][sliceColIndex]
                })
            }

            if (slice.every(cell => cell.columnValue === currentCellValue)) {
                return slice;
            }
        } catch (e) {
            // This is going to be reached.. a lot.
        }
    }
}

function checkForBackwardDiagonalWin(rowIndex, colIndex, board) {
    const currentCellValue = board[rowIndex][colIndex];
    for (let i = 0; i < winLength; i++) {
        try {
            const slice = []

            for (let j = 3; j >= 0; j--) {
                const sliceRowIndex = rowIndex - j + i
                const sliceColIndex = colIndex - j + i
                slice.push({
                    rowIndex: sliceRowIndex,
                    columnIndex: sliceColIndex,
                    columnValue: board[sliceRowIndex][sliceColIndex]
                })
            }

            if (slice.every(cell => cell.columnValue === currentCellValue)) {
                return slice;
            }
        } catch (e) {
            // This is going to be reached.. a lot.
        }
    }
}





function updateBoard(rowIndex, colIndex, player, board) {
    board[rowIndex][colIndex] = player
}


/**
 * getNextCell(colIndex) returns the rowIndex of the 
 * next available row in column specifed by 'colIndex'
 * or throws an Error if column is full
 * @param {*} colIndex 
 * @returns int
 */
function getNextCell(colIndex, board) {
    const column = getColumn(colIndex, board)
    let lastPlacedRowIndex = column.findIndex(row => row === 0 || row === 1)
    if (lastPlacedRowIndex === 0) {
        throw new Error('Column is full.')
    }
    else if (lastPlacedRowIndex === -1) {
        lastPlacedRowIndex = numRows;
    }
    return lastPlacedRowIndex - 1

}

/**
 * getColumn(colIndex) returns an Array comprising the values
 * of the board at colIndex 
 * @param {Array<CellValue>} colIndex 
 * @returns 
 */
function getColumn(colIndex, board) {
    return board.flatMap(row => row[colIndex]);
}

module.exports = {
    resetBoard,
    getNextCell,
    updateBoard,
    checkForWinState

}