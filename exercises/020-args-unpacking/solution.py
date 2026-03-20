def multiply_all(*args):
    result = 1
    for n in args:
        result *= n
    return result


def product_of_list(numbers):
    return multiply_all(*numbers)
