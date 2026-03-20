def find_max(lst):
    """
    Recursively finds and returns the maximum value in a non-empty list.

    Example: find_max([3, 1, 4, 1, 5, 9]) -> 9
    """
    if len(lst) == 1:
        return lst[0]
    rest_max = find_max(lst[1:])
    if lst[0] > rest_max:
        return lst[0]
