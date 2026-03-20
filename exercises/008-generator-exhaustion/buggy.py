def count_positives_and_negatives(numbers):
    """
    Returns a tuple (pos, neg) with the count of positive
    and negative numbers in the list. Zeros are excluded.

    Example: [1, -2, 3, -4, 0] -> (2, 2)
    """
    filtered = (x for x in numbers if x != 0)
    positives = sum(1 for x in filtered if x > 0)
    negatives = sum(1 for x in filtered if x < 0)
    return (positives, negatives)
