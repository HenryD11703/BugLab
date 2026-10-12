def rank_players(scores):
    result = []
    for i, (name, score) in enumerate(scores):
        result.append(f"{i + 2}. {name}: {score}")
    return result
