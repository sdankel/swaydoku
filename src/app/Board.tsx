'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  useConnectUI,
  useDisconnect,
  useProvider,
  useWallet,
} from '@fuels/react';
import './styles.css';
import { Verifier } from './generated';
import { ScriptTransactionRequest } from 'fuels';
import { emptyBoard, findIncorrectCells, generateSudoku } from './util';
import BoardCell from './BoardCell';

// Styles for the Sudoku board
const styles: { [key: string]: React.CSSProperties } = {
  boardContainer: {
    width: '500px',
  },
  board: {
    display: 'grid',
    gridTemplateColumns: 'repeat(9, 55px)',
    gridTemplateRows: 'repeat(9, 55px)',
    justifyContent: 'center',
    marginTop: '10px',
  },
  button: {
    marginTop: '20px',
    padding: '10px 20px',
    fontSize: '16px',
    cursor: 'pointer',
  },
  buttonContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
  },
  headerContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: '50px',
  },
  description: {
    color: 'black',
    fontSize: '14px',
    marginTop: '20px',
  },
  notesMode: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: 'black',
    fontSize: '14px',
    marginTop: '10px',
  },
  success: {
    color: 'green',
    fontSize: '20px',
    marginTop: '20px',
  },
  error: {
    color: 'red',
    fontSize: '20px',
    marginTop: '20px',
  },
};

export type Cell = {
  value: string;
  fixed: boolean;
  isIncorrect: boolean | null;
  notes: Set<number>;
};
export type Board = Cell[][];

export default function PuzzleBoard() {
  // Board state
  const [board, setBoard] = useState<Board>(emptyBoard());
  const [solvedBoard, setSolvedBoard] = useState<Board>(emptyBoard());
  const [selectedCell, setSelectedCell] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [isCorrect, setIsCorrect] = useState(false);
  const [notesMode, setNotesMode] = useState(false);
  type Difficulty = 'easy' | 'medium' | 'hard' | 'extreme';
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [isInitialized, setIsInitialized] = useState(false);

  // Refs for navigation
  const refs = useRef<(HTMLInputElement | null)[][]>(
    Array.from({ length: 9 }, () => Array(9).fill(null))
  );

  // Error handler
  const [error, setError] = useState<string | null>(null);

  // Wallet connector
  const { connect, isConnected } = useConnectUI();
  const { disconnect } = useDisconnect();
  const { provider } = useProvider();
  const { wallet } = useWallet();

  // Handle input changes in cells
  const handleCellChange = useCallback(
    (row: number, col: number, value: string): void => {
      if (
        board[row][col].fixed ||
        !(value === '' || /^[1-9]$/.test(value) || value.length > 1)
      ) {
        return;
      }

      const cell = board[row][col];
      if (notesMode && !cell.value && /^[1-9]$/.test(value)) {
        // Update notes
        console.log('notesMode', notesMode);
        console.log('cell', cell);
        const noteValue = parseInt(value);
        if (cell.notes.has(noteValue)) {
          cell.notes.delete(noteValue);
        } else {
          cell.notes.add(noteValue);
        }
        console.log('row col', row, col);
        const newBoard = [...board];
        newBoard[row][col] = cell;
        console.log('newBoard', newBoard);

        setBoard(newBoard);
      } else {
        // Update cell value
        const newBoard = board.map((r, i) =>
          r.map((c, j) =>
            i === row && j === col
              ? { ...c, value, isIncorrect: false, notes: new Set<number>() }
              : c
          )
        );
        // Update notes of other cells in the same row, column, or 3x3 box
        const subgridRow = 3 * Math.floor(row / 3);
        const subgridCol = 3 * Math.floor(col / 3);
        for (let i = 0; i < 9; i++) {
          if (i !== row) {
            newBoard[i][col].notes.delete(parseInt(value));
          }
          if (i !== col) {
            newBoard[row][i].notes.delete(parseInt(value));
          }
          const subgridRowIdx = subgridRow + Math.floor(i / 3);
          const subgridColIdx = subgridCol + (i % 3);
          if (subgridRowIdx !== row && subgridColIdx !== col) {
            newBoard[subgridRowIdx][subgridColIdx].notes.delete(
              parseInt(value)
            );
          }
        }
        setBoard(newBoard);
      }
    },
    [board, notesMode]
  );

  // Handle generating a new puzzle
  const handleNewPuzzle = useCallback((): void => {
    const difficultyMap: Record<Difficulty, number> = {
      easy: 0.5,
      medium: 0.35,
      hard: 0.25,
      extreme: 0.2,
    };

    const { unsolved, solved } = generateSudoku(difficultyMap[difficulty]);
    setBoard(unsolved);
    setSolvedBoard(solved);
    setSelectedCell(null);
    setIsCorrect(false);
    setError(null);
  }, [
    setBoard,
    setSolvedBoard,
    setSelectedCell,
    setIsCorrect,
    setError,
    difficulty,
  ]);

  // Handle changing difficulty
  const handleDifficultyChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedDifficulty = e.target.value;
      setDifficulty(selectedDifficulty as Difficulty);
      handleNewPuzzle();
    },
    [handleNewPuzzle, setDifficulty]
  );

  // Handle clearing inputs without regenerating the puzzle
  const handleClearBoard = useCallback((): void => {
    const clearedBoard = board.map((row) =>
      row.map((cell) =>
        cell.fixed ? cell : { ...cell, value: '', notes: new Set<number>() }
      )
    );

    setBoard(clearedBoard);
    setIsCorrect(false);
    setError(null);
  }, [board, setBoard, setIsCorrect, setError]);

  // Handle revealing the solved board
  const handleRevealBoard = useCallback((): void => {
    const revealedBoard = solvedBoard.map((row, rowIndex) => {
      return row.map((cell, colIndex) => {
        return board[rowIndex][colIndex].fixed
          ? cell
          : { ...cell, fixed: false };
      });
    });
    setBoard(revealedBoard);
  }, [board, solvedBoard, setBoard]);

  // Handle submitting the board
  const handleSubmit = async (): Promise<void> => {
    if (!provider || !wallet || !isConnected) {
      setError('Wallet not connected');
      return;
    }

    const params = board.flatMap((row) =>
      row.map((cell) => parseInt(cell.value))
    );
    const predicate = new Verifier({ provider, data: [params] });

    // The amount of coins to send to the predicate
    const amountToPredicate = 1_000;

    try {
      // Add some funds to the predicate to be able to spend the predicate
      const transactionRequest = new ScriptTransactionRequest({
        gasLimit: 2000,
        maxFee: 0,
      });

      // Get the resources available to send from the predicate
      const predicateCoins = await predicate.getResourcesToSpend([
        { amount: 2000, assetId: provider.getBaseAssetId() },
      ]);

      // Add the predicate input and resources
      transactionRequest.addResources(predicateCoins);

      // Fund the predicate with some funds from our wallet (sender)
      const fundPredicateTx = await wallet.transfer(
        predicate.address,
        amountToPredicate,
        provider.getBaseAssetId()
      );

      // Wait for the transaction
      await fundPredicateTx.waitForResult();

      // The amount of coins to send from the predicate, to our receiver wallet.
      const amountToReceiver = 1;

      // Transfer funds from the predicate, to our receiver wallet
      const transferFromPredicateTx = await predicate.transfer(
        wallet.address,
        amountToReceiver,
        provider.getBaseAssetId()
      );

      // Wait for the transaction
      const result = await transferFromPredicateTx.waitForResult();
      setIsCorrect(result.isStatusSuccess);
    } catch (e) {
      const errString = `${e}`;
      if (errString.includes('PredicateReturnedNonOne')) {
        setError('Incorrect!');

        // Highlight incorrect cells
        setBoard(findIncorrectCells(board));
      } else {
        setError(errString);
      }
    }
  };

  const isSubmitEnabled = useMemo(() => {
    return (
      isConnected &&
      provider &&
      wallet &&
      board.every((row) => row.every((cell) => /^[1-9]$/.test(cell.value)))
    );
  }, [isConnected, provider, wallet, board]);

  useEffect(() => {
    if (!isInitialized) {
      handleNewPuzzle();
      setIsInitialized(true);
    }
  }, [isInitialized, handleNewPuzzle]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'n') {
        setNotesMode((prev) => !prev);
      }
      if (selectedCell) {
        const { row, col } = selectedCell;
        switch (e.key) {
          case 'ArrowUp':
            if (row > 0) setSelectedCell({ row: row - 1, col });
            break;
          case 'ArrowDown':
            if (row < 8) setSelectedCell({ row: row + 1, col });
            break;
          case 'ArrowLeft':
            if (col > 0) setSelectedCell({ row, col: col - 1 });
            break;
          case 'ArrowRight':
            if (col < 8) setSelectedCell({ row, col: col + 1 });
            break;
          case 'Backspace':
            handleCellChange(row, col, '');
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedCell, handleCellChange]);

  useEffect(() => {
    if (selectedCell) {
      const { row, col } = selectedCell;
      refs.current[row][col]?.focus(); // Focus the selected input field
    }
  }, [selectedCell]);

  console.log(
    solvedBoard.map((row) => row.map((cell) => cell.value).join(' ')).join('\n')
  );
  console.log(
    board.map((row) => row.map((cell) => cell.fixed).join(' ')).join('\n')
  );

  return (
    <div style={styles.boardContainer}>
      <div style={styles.headerContainer}>
        <h1>Swaydoku</h1>
        <button
          style={styles.button}
          onClick={() => (isConnected ? disconnect() : connect())}>
          {isConnected ? 'Disconnect' : 'Connect'}
        </button>
      </div>
      <p style={styles.description}>
        Each row, column, and 3x3 box must contain all the numbers from 1 to 9.
        <br />
        The board will be submitted to a predicate that will verify the
        solution. Connect your Fuel wallet to submit!
      </p>
      <div style={styles.notesMode}>
        <label>
          {'Difficulty Level: '}
          <select
            style={styles.dropdown}
            value={difficulty}
            onChange={handleDifficultyChange}>
            <option value='easy'>Easy</option>
            <option value='medium'>Medium</option>
            <option value='hard'>Hard</option>
            <option value='extreme'>Extreme</option>
          </select>
        </label>

        <label>
          <input
            type='checkbox'
            checked={notesMode}
            onChange={() => setNotesMode(!notesMode)}
          />
          {" Notes Mode (Press 'N' to toggle)"}
        </label>
      </div>
      <div style={styles.board}>
        {board.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <BoardCell
              key={`cell-${rowIndex}-${colIndex}`}
              cell={cell}
              rowIndex={rowIndex}
              colIndex={colIndex}
              selectedCell={selectedCell}
              onChange={(e) =>
                handleCellChange(rowIndex, colIndex, e.target.value)
              }
              onFocus={() => setSelectedCell({ row: rowIndex, col: colIndex })}
              onBlur={() => setSelectedCell(null)}
              inputRef={(el) => (refs.current[rowIndex][colIndex] = el)}
            />
          ))
        )}
      </div>
      <div style={styles.buttonContainer}>
        <div style={styles.buttonGroup}>
          <button style={styles.button} onClick={handleNewPuzzle}>
            New Puzzle
          </button>
          <button style={styles.button} onClick={handleClearBoard}>
            Clear
          </button>
          <button style={styles.button} onClick={handleRevealBoard}>
            Reveal
          </button>
        </div>
        <button
          disabled={!isSubmitEnabled}
          style={{
            ...styles.button,
            background: isSubmitEnabled ? 'green' : 'gray',
            cursor: isSubmitEnabled ? 'pointer' : 'not-allowed',
          }}
          onClick={handleSubmit}>
          Submit
        </button>
      </div>
      {isCorrect ? (
        <p style={styles.success}>Correct!</p>
      ) : error ? (
        <p style={styles.error}>{error}</p>
      ) : (
        <p style={{ ...styles.error, color: 'transparent' }}>Placeholder</p>
      )}
    </div>
  );
}
