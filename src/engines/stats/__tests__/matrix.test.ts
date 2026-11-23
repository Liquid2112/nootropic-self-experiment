import {
  invert,
  matMul,
  matVec,
  SingularMatrixError,
  solve,
  transpose,
} from '../matrix';

/** The matrix primitives the OLS fit is built on. */
describe('matrix primitives', () => {
  it('transposes a rectangular matrix', () => {
    expect(transpose([[1, 2, 3], [4, 5, 6]])).toEqual([
      [1, 4],
      [2, 5],
      [3, 6],
    ]);
  });

  it('multiplies two matrices', () => {
    expect(
      matMul(
        [
          [1, 2],
          [3, 4],
        ],
        [
          [5, 6],
          [7, 8],
        ],
      ),
    ).toEqual([
      [19, 22],
      [43, 50],
    ]);
  });

  it('multiplies a matrix by a vector', () => {
    expect(matVec([[1, 2], [3, 4]], [1, 1])).toEqual([3, 7]);
  });

  it('solves a 2x2 system', () => {
    // x + y = 3, 2x + y = 5  ->  x=2, y=1.
    const x = solve(
      [
        [1, 1],
        [2, 1],
      ],
      [3, 5],
    );
    expect(x[0]).toBeCloseTo(2, 10);
    expect(x[1]).toBeCloseTo(1, 10);
  });

  it('solves a system needing a row pivot (zero leading entry)', () => {
    // First pivot is 0, forcing a row swap.
    const x = solve(
      [
        [0, 1],
        [1, 0],
      ],
      [2, 3],
    );
    expect(x[0]).toBeCloseTo(3, 10);
    expect(x[1]).toBeCloseTo(2, 10);
  });

  it('inverts a matrix (A * A^-1 = I)', () => {
    const a = [
      [4, 3],
      [6, 3],
    ];
    const inv = invert(a);
    const prod = matMul(a, inv);
    expect(prod[0]![0]).toBeCloseTo(1, 10);
    expect(prod[0]![1]).toBeCloseTo(0, 10);
    expect(prod[1]![0]).toBeCloseTo(0, 10);
    expect(prod[1]![1]).toBeCloseTo(1, 10);
  });

  it('throws SingularMatrixError on a singular system', () => {
    expect(() => solve([[1, 2], [2, 4]], [1, 2])).toThrow(SingularMatrixError);
  });

  it('does not mutate its inputs', () => {
    const a = [
      [0, 1],
      [1, 0],
    ];
    const b = [2, 3];
    solve(a, b);
    expect(a).toEqual([
      [0, 1],
      [1, 0],
    ]);
    expect(b).toEqual([2, 3]);
  });
});
