def find_in_list(items, target):
    """
    Returns the first index where target appears in items.
    Returns -1 if not found.

    Example: find_in_list([10, 20, 30], 20) -> 1
    """
    for i, item in enumerate(items):
        if item is target:
            return i
    return -1
