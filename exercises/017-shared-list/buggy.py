def create_board(size):
    """
    Creates a square game board of the given size, filled with zeros,
    then places a 1 in the center cell. Returns the board.

    Only the center cell should be 1 — all other cells should be 0.

    Example: create_board(3) -> [[0, 0, 0], [0, 1, 0], [0, 0, 0]]
    """
    board = [[0] * size] * size
    mid = size // 2
    board[mid][mid] = 1
    return board
