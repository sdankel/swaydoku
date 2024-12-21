import { Board } from './Board';

// Generates an empty Sudoku board.
export const emptyBoard = (): Board =>
  Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => ({
      value: '',
      fixed: false,
      isIncorrect: null,
      notes: new Set(),
    }))
  );

// Generates a random Sudoku puzzle. Not guaranteed to have a unique solution.
export const generateSudoku = (
  difficulty: number
): { unsolved: Board; solved: Board } => {
  const board = emptyBoard();

  const isValidPlacement = (
    board: Board,
    row: number,
    col: number,
    num: string
  ): boolean => {
    for (let x = 0; x < 9; x++) {
      if (board[row][x].value === num || board[x][col].value === num)
        return false;
      const subgridRow = 3 * Math.floor(row / 3) + Math.floor(x / 3);
      const subgridCol = 3 * Math.floor(col / 3) + (x % 3);
      if (board[subgridRow][subgridCol].value === num) return false;
    }
    return true;
  };

  const shuffle = (array: string[]): string[] => {
    for (let i = array.length - 1; i >= 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  const fillBoard = (board: Board): boolean => {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (board[row][col].value === '') {
          const nums = shuffle(['1', '2', '3', '4', '5', '6', '7', '8', '9']);
          for (const num of nums) {
            if (isValidPlacement(board, row, col, num)) {
              board[row][col] = { ...board[row][col], value: num, fixed: true };
              if (fillBoard(board)) return true;
              board[row][col] = { ...board[row][col], value: '', fixed: false };
            }
          }
          return false;
        }
      }
    }
    return true;
  };

  fillBoard(board);
  const solved = board;
  const unsolved = board.map((row) => {
    return row.map((cell) => {
      const fixed = Math.random() < difficulty;
      return fixed ? cell : { ...cell, value: '', fixed: false };
    });
  });

  return { solved, unsolved };
};

// Find incorrect cells in a board
export const findIncorrectCells = (board: Board): Board => {
  const isValidPlacement = (
    board: Board,
    row: number,
    col: number,
    value: string
  ) => {
    for (let i = 0; i < 9; i++) {
      // Check row and column
      if (board[row][i].value === value && i !== col) return false;
      if (board[i][col].value === value && i !== row) return false;

      // Check 3x3 grid
      const subgridRow = 3 * Math.floor(row / 3) + Math.floor(i / 3);
      const subgridCol = 3 * Math.floor(col / 3) + (i % 3);
      if (
        board[subgridRow][subgridCol].value === value &&
        !(subgridRow === row && subgridCol === col)
      ) {
        return false;
      }
    }
    return true;
  };

  const newBoard = board.map((row, rowIndex) =>
    row.map((cell, colIndex) => {
      const isIncorrect =
        !cell.fixed &&
        cell.value !== '' &&
        !isValidPlacement(board, rowIndex, colIndex, cell.value);
      return {
        ...cell,
        isIncorrect,
      };
    })
  );

  return newBoard;
};
