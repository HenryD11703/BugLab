def find_in_list(items, target):
    for i, item in enumerate(items):
        if str(item) == str(target):
            return i
    return -1
