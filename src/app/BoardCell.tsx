import { useCallback } from 'react';
import { Cell } from './Board';
import { on } from 'events';

// Styles for the Sudoku board
const styles: { [key: string]: React.CSSProperties } = {
  cell: {
    width: '55px',
    height: '55px',
    padding: '1px',
    textAlign: 'center',
    fontSize: '26px',
    border: '1px solid #ccc',
    outline: 'none',
    color: 'blue',
    backgroundColor: 'white',
  },
  fixedCell: {
    color: 'black',
  },
  highlightedCell: {
    backgroundColor: '#f0f8ff',
  },
  selectedCell: {
    backgroundColor: '#cae6ff',
  },
  notes: {
    fontSize: '12px',
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    alignItems: 'center',
    justifyItems: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
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

function BoardCell({
  cell,
  rowIndex,
  colIndex,
  selectedCell,
  onChange,
  onFocus,
  onBlur,
  inputRef,
}: {
  cell: Cell;
  rowIndex: number;
  colIndex: number;
  selectedCell: { row: number; col: number } | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus: () => void;
  onBlur: () => void;
  inputRef: (el: HTMLInputElement | null) => void;
}) {
  const isHighlighted =
    !!selectedCell &&
    (selectedCell.row === rowIndex ||
      selectedCell.col === colIndex ||
      (Math.floor(rowIndex / 3) === Math.floor(selectedCell.row / 3) &&
        Math.floor(colIndex / 3) === Math.floor(selectedCell.col / 3)));
  const isSelected =
    !!selectedCell &&
    selectedCell.row === rowIndex &&
    selectedCell.col === colIndex;

  return (
    <div style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        style={{
          ...styles.cell,
          ...(cell.fixed ? styles.fixedCell : {}),
          ...(isHighlighted ? styles.highlightedCell : {}),
          ...(isSelected ? styles.selectedCell : {}),
          ...getCellBorderStyle(rowIndex, colIndex),
          position: 'relative',
          cursor: 'default',
          caretColor: 'transparent',
        }}
        type='text'
        maxLength={1}
        value={cell.value}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        disabled={cell.fixed}
      />
      <div
        style={{
          ...styles.notes,
        }}>
        {[...Array(9)].map((_, i) => (
          <span
            key={`note-${rowIndex}-${colIndex}-${i + 1}`}
            style={{
              color: cell.notes.has(i + 1) ? '#4d4d4d' : 'transparent',
            }}>
            {i + 1}
          </span>
        ))}
      </div>
    </div>
  );
}

export default BoardCell;
