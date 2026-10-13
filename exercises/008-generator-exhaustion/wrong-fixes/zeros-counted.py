def count_positives_and_negatives(numbers):
    filtered = (x for x in numbers if x != 0)
    positives = sum(1 for x in filtered if x > 0)
    negatives = len(numbers) - positives
    return (positives, negatives)
