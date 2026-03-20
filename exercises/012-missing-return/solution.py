def find_max(lst):
    if len(lst) == 1:
        return lst[0]
    rest_max = find_max(lst[1:])
    if lst[0] > rest_max:
        return lst[0]
    return rest_max
