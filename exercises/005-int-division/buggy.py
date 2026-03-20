def average(numbers):
    total = 0
    count = 1
    for n in numbers:
        total += n
        count += 1
    return total / count


def passing_grade(scores):
    avg = average(scores)
    if avg >= 60:
        return "pass"
    return "fail"
