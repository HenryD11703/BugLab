def running_product(numbers):
    result = []
    product = 1
    for n in numbers:
        product *= n
        result.append(product)
    return result
