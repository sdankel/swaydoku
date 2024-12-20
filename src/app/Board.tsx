'use client';

import React, { useMemo, useState } from 'react';
import {
  useConnectUI,
  useDisconnect,
  useProvider,
  useWallet,
} from '@fuels/react';
import './styles.css';
import { Verifier } from './generated';
import { ScriptTransactionRequest } from 'fuels';

// Styles for the Sudoku board
const styles: { [key: string]: React.CSSProperties } = {
  board: {
    display: 'grid',
    gridTemplateColumns: 'repeat(9, 55px)',
    gridTemplateRows: 'repeat(9, 55px)',
    justifyContent: 'center',
    marginTop: '20px',
  },
  cell: {
    width: '55px',
    height: '55px',
    padding: '1px',
    textAlign: 'center',
    fontSize: '26px',
    border: '1px solid #ccc',
    outline: 'none',
    color: 'blue',
  },
  fixedCell: {
    width: '55px',
    height: '55px',
    padding: '1px',
    textAlign: 'center',
    fontSize: '26px',
    border: '1px solid #ccc',
    outline: 'none',
    color: 'black',
  },
  button: {
    marginTop: '20px',
    marginRight: '10px',
    padding: '10px 20px',
    fontSize: '16px',
    cursor: 'pointer',
  },
  headerContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  description: {
    color: 'black',
    fontSize: '14px',
  },
};

const getCellBorderStyle = (rowIndex: number, colIndex: number) => {
  const isThickRow = rowIndex % 3 === 0;
  const isThickCol = colIndex % 3 === 0;

  return {
    borderTop: isThickRow ? '3px solid black' : '1px solid #ccc',
    borderLeft: isThickCol ? '3px solid black' : '1px solid #ccc',
    borderRight: colIndex === 8 ? '3px solid black' : '1px solid #ccc',
    borderBottom: rowIndex === 8 ? '3px solid black' : '1px solid #ccc',
  };
};

type Board = { value: string; fixed: boolean }[][];

// Function to generate a random Sudoku puzzle
const generateSudoku = (): { unsolved: Board; solved: Board } => {
  const emptyBoard: Board = Array.from({ length: 9 }, () =>
    Array(9).fill({ value: '', fixed: false })
  );

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
              board[row][col] = { value: num, fixed: true };
              if (fillBoard(board)) return true;
              board[row][col] = { value: '', fixed: false };
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
      return fixed ? cell : { value: '', fixed: false };
    });
  });

  return { solved, unsolved };
};

export default function PuzzleBoard() {
  // Board state
  const { unsolved, solved } = generateSudoku();
  const [board, setBoard] = useState<Board>(unsolved);
  const [solvedBoard, setSolvedBoard] = useState<Board>(solved);
  const [isCorrect, setIsCorrect] = useState(false);

  // Error handler
  const [error, setError] = useState<string | null>(null);

  // Wallet connector
  const { connect, isConnected } = useConnectUI();
  const { disconnect } = useDisconnect();
  const { provider } = useProvider();
  const { wallet } = useWallet();

  // Handle input changes in cells
  const handleChange = (row: number, col: number, value: string): void => {
    if (
      !board[row][col].fixed &&
      (value === '' || (/^[1-9]$/.test(value) && value.length === 1))
    ) {
      const newBoard = board.map((r, i) =>
        r.map((c, j) => (i === row && j === col ? { ...c, value } : c))
      );
      setBoard(newBoard);
    }
  };

  // Handle generating a new puzzle
  const handleNewPuzzle = (): void => {
    const { unsolved, solved } = generateSudoku();
    setBoard(unsolved);
    setSolvedBoard(solved);
    setIsCorrect(false);
    setError(null);
  };

  // Handle clearing inputs without regenerating the puzzle
  const handleClearBoard = (): void => {
    const clearedBoard = board.map((row) =>
      row.map((cell) => (cell.fixed ? cell : { ...cell, value: '' }))
    );

    setBoard(clearedBoard);
    setIsCorrect(false);
    setError(null);
  };

  // Handle revealing the solved board
  const handleRevealBoard = (): void => {
    const revealedBoard = solvedBoard.map((row, rowIndex) => {
      return row.map((cell, colIndex) => {
        return board[rowIndex][colIndex].fixed
          ? cell
          : { ...cell, fixed: false };
      });
    });
    setBoard(revealedBoard);
  };

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
      let result = await transferFromPredicateTx.waitForResult();
      setIsCorrect(result.isStatusSuccess);
    } catch (e) {
      const errString = `${e}`;
      if (errString.includes('PredicateReturnedNonOne')) {
        setError('Incorrect!');
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

  return (
    <div>
      <div style={styles.headerContainer}>
        <h1>Swaydoku</h1>
        <button
          style={styles.button}
          onClick={() => (isConnected ? disconnect() : connect())}>
          {isConnected ? 'Disconnect' : 'Connect'}
        </button>
      </div>
      <p style={styles.description}>
        Fill in the board with numbers from 1 to 9
      </p>
      <p style={styles.description}>
        Each row, column, and 3x3 subgrid must contain all the numbers from 1 to
        9
      </p>
      <p style={styles.description}>
        The board will be submitted to a predicate that will verify the solution
      </p>
      <div style={styles.board}>
        {board.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <input
              key={`cell-${rowIndex}-${colIndex}`}
              style={{
                ...(cell.fixed ? styles.fixedCell : styles.cell),
                ...getCellBorderStyle(rowIndex, colIndex),
              }}
              type='text'
              maxLength={1}
              value={cell.value}
              onChange={(e) => handleChange(rowIndex, colIndex, e.target.value)}
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
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {isCorrect && <p style={{ color: 'green' }}>Correct!</p>}
    </div>
  );
}
