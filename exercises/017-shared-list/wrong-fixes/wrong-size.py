def create_board(size):
    board = [[0] * size for _ in range(size - 1)]
    mid = size // 2
    board[mid][mid] = 1
    return board
