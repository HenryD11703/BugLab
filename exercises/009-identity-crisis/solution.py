def find_in_list(items, target):
    for i, item in enumerate(items):
        if item == target:
            return i
    return -1
