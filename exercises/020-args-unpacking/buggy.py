def multiply_all(*args):
    """Helper: returns the product of all its arguments."""
    result = 1
    for n in args:
        result *= n
    return result


def product_of_list(numbers):
    """
    Returns the product of all numbers in a list.
    Uses multiply_all internally.

    Example: product_of_list([2, 3, 4]) -> 24
    """
    return multiply_all(numbers)
