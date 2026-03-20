def rank_players(scores):
    """
    Takes a list of (name, score) tuples already sorted from highest to
    lowest and returns a list of ranking strings.

    Ranks start at 1, not 0.

    Example: rank_players([("Alice", 95), ("Bob", 87)])
             -> ["1. Alice: 95", "2. Bob: 87"]
    """
    result = []
    for i, (name, score) in enumerate(scores):
        result.append(f"{i}. {name}: {score}")
    return result
