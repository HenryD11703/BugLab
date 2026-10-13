def make_multipliers(n):
    multipliers = []
    for i in range(n):
        multipliers.append(lambda x: x * n)
    return multipliers
