def remove_negatives(numbers):
    result = numbers
    for n in numbers:
        if n < 0:
            result.remove(n)
    return result
