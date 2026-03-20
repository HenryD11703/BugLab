def get_median(numbers):
    """
    Returns the median value of a list of numbers.
    For odd-length lists, returns the middle element.
    For even-length lists, returns the average of the two middle elements.

    Example: get_median([3, 1, 4, 1, 5]) -> 3
    """
    sorted_nums = numbers.sort()
    n = len(numbers)
    if n % 2 == 1:
        return sorted_nums[n // 2]
    else:
        return (sorted_nums[n // 2 - 1] + sorted_nums[n // 2]) / 2
