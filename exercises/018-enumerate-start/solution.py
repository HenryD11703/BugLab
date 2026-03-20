def rank_players(scores):
    result = []
    for i, (name, score) in enumerate(scores, 1):
        result.append(f"{i}. {name}: {score}")
    return result
