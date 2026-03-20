def remove_negatives(numbers):
    result = []
    for n in numbers:
        if n >= 0:
            result.append(n)
    return result
