def is_right_triangle(a, b, c):
    """
    Returns True if a triangle with sides a, b, c is a right triangle.
    The sides can be given in any order.

    Example: is_right_triangle(3, 4, 5) -> True
    """
    sides = sorted([a, b, c])
    return sides[0] ** 2 + sides[1] ** 2 == sides[2] ** 2
