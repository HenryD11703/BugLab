def running_product(numbers):
    """
    Returns a new list where each element is the product of all elements
    in `numbers` up to and including that index.

    Example: [2, 3, 4] -> [2, 6, 24]
    """
    result = []
    product = 0
    for n in numbers:
        product *= n
        result.append(product)
    return result
