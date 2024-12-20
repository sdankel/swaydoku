predicate;

use std::bytes::Bytes;

fn main(answer: Bytes) -> bool {
    // Sudoku is a 9x9 grid, so the answer should be 81 bytes long
    if (answer.len() != 81) {
        return false;
    }
    
    // Check that each row, column, and 3x3 square contains the numbers 1-9 exactly once
    // We can do this by checking that the sum of each row, column, and square is 45
    // (1 + 2 + ... + 9 = 45)
    // And also by checking that the product of each row, column, and square is 362880
    // (1 * 2 * ... * 9 = 362880)
    let mut i = 0;
    while i < 9 {
        let mut row_sum = 0;
        let mut row_product = 1;
        let mut col_sum = 0;
        let mut col_product = 1;
        let mut square_sum = 0;
        let mut square_product = 1;
        let mut j = 0;
        while j < 9 {
            let row_index = i * 9 + j;
            let col_index = j * 9 + i;
            let square_index = (i / 3) * 27 + (i % 3) * 3 + (j / 3) * 9 + (j % 3);
            row_sum += answer.get(row_index).unwrap().as_u64();
            row_product *= answer.get(row_index).unwrap().as_u64();
            col_sum += answer.get(col_index).unwrap().as_u64();
            col_product *= answer.get(col_index).unwrap().as_u64();
            square_sum += answer.get(square_index).unwrap().as_u64();
            square_product *= answer.get(square_index).unwrap().as_u64();
            j += 1;
        }
        if (row_sum != 45 || row_product != 362880 || col_sum != 45 || col_product != 362880 || square_sum != 45 || square_product != 362880) {
            return false;
        }
        i += 1;
    }
    true
}
