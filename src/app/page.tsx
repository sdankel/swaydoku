"use client";

import React, { useState } from "react";
import ReactDOM from "react-dom";
import "./styles.css";

// Styles for the Sudoku board
const styles: { [key: string]: React.CSSProperties } = {
  board: {
    display: "grid",
    gridTemplateColumns: "repeat(9, 50px)",
    gridTemplateRows: "repeat(9, 50px)",
    justifyContent: "center",
    marginTop: "20px",
  },
  cell: {
    width: "50px",
    height: "50px",
    padding: "1px",
    textAlign: "center",
    fontSize: "18px",
    border: "1px solid #ccc",
    outline: "none",
    color: "black",
  },
  fixedCell: {
    width: "50px",
    height: "50px",
    padding: "1px",
    textAlign: "center",
    fontSize: "18px",
    border: "1px solid #ccc",
    outline: "none",
    backgroundColor: "#ddd",
    color: "black",
    fontWeight: "bold",
  },
  button: {
    marginTop: "20px",
    marginRight: "10px",
    padding: "10px 20px",
    fontSize: "16px",
    cursor: "pointer",
  },
};

const getCellBorderStyle = (rowIndex: number, colIndex: number) => {
  const isThickRow = rowIndex % 3 === 0;
  const isThickCol = colIndex % 3 === 0;

  return {
    borderTop: isThickRow ? "3px solid black" : "1px solid #ccc",
    borderLeft: isThickCol ? "3px solid black" : "1px solid #ccc",
    borderRight: colIndex === 8 ? "3px solid black" : "1px solid #ccc",
    borderBottom: rowIndex === 8 ? "3px solid black" : "1px solid #ccc",
  };
};

type Board = { value: string; fixed: boolean }[][];

// Function to generate a random Sudoku puzzle
const generateSudoku = (): {unsolved: Board, solved: Board} => {
  const emptyBoard: Board = Array.from({ length: 9 }, () =>
    Array(9).fill({ value: "", fixed: false })
  );

  const isValidPlacement = (board: Board, row: number, col: number, num: string): boolean => {
    for (let x = 0; x < 9; x++) {
      if (board[row][x].value === num || board[x][col].value === num) return false;
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
  }

  const fillBoard = (board: Board): boolean => {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (board[row][col].value === "") {
          const nums = shuffle(["1", "2", "3", "4", "5", "6", "7", "8", "9"]);
          for (const num of nums) {
            if (isValidPlacement(board, row, col, num)) {
              board[row][col] = { value: num, fixed: true };
              if (fillBoard(board)) return true;
              board[row][col] = { value: "", fixed: false };
            }
          }
          return false;
        }
      }
    }
    return true;
  };

  fillBoard(emptyBoard);
  const solved = emptyBoard;
  const unsolved = emptyBoard.map((row) => {
    return row.map((cell) => {
      const fixed = Math.random() < 0.3;
      return fixed ? cell : { value: "", fixed: false };
    });
  });

  return {solved, unsolved};
};

export default function Home() {
  const {unsolved, solved} = generateSudoku();

  const [board, setBoard] = useState<Board>(unsolved);
  const [solvedBoard, setSolvedBoard] = useState<Board>(solved);

  // Handle input changes in cells
  const handleChange = (row: number, col: number, value: string): void => {
    if (!board[row][col].fixed && (value === "" || (/^[1-9]$/.test(value) && value.length === 1))) {
      const newBoard = board.map((r, i) =>
        r.map((c, j) => (i === row && j === col ? { ...c, value } : c))
      );
      setBoard(newBoard);
    }
  };

  // Handle generating a new puzzle
  const handleNewPuzzle = (): void => {
    const {unsolved, solved} = generateSudoku(); // todo: set solved
    console.log(unsolved);

    setBoard(unsolved);
    setSolvedBoard(solved);
  };

  // Handle clearing inputs without regenerating the puzzle
  const handleClearBoard = (): void => {
    const clearedBoard = board.map((row) =>
      row.map((cell) => (cell.fixed ? cell : { ...cell, value: "" }))
    );
    
    setBoard(clearedBoard);
  };

    // Handle revealing the solved board
    const handleRevealBoard = (): void => {
      const revealedBoard = solvedBoard.map((row, rowIndex) => {
        return row.map((cell, colIndex) => {
          return board[rowIndex][colIndex].fixed ? cell : { ...cell, fixed: false };
        });
      });
      setBoard(revealedBoard);
    };
  

    // Handle submitting the board
    const handleSubmit = (): void => {
      console.log("Submitted board: ", board);
    };  

  return (
    <div>
      <h1>Sudoku Board</h1>
      <div style={styles.board}>
        {board.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <input
              key={`cell-${rowIndex}-${colIndex}`}
              style={{
                ...(cell.fixed ? styles.fixedCell : styles.cell),
                ...getCellBorderStyle(rowIndex, colIndex),
              }}
              type="text"
              maxLength={1}
              value={cell.value}
              onChange={(e) =>
                handleChange(rowIndex, colIndex, e.target.value)
              }
              disabled={cell.fixed}
            />
          ))
        )}
      </div>
      <button style={styles.button} onClick={handleNewPuzzle}>
        New Puzzle
      </button>
      <button style={styles.button} onClick={handleClearBoard}>
        Clear
      </button>
      <button style={styles.button} onClick={handleRevealBoard}>
        Reveal
      </button>
      <button style={{...styles.button, background: 'green'}} onClick={handleSubmit}>
        Submit
      </button>
      <pre style={{color: 'black'}}>
        {solvedBoard.map(row => row.map(cell => cell.value).join(',')).join('\n')}
      </pre>
    </div>
  );
}
