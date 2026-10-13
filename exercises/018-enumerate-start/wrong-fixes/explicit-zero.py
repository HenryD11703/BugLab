def rank_players(scores):
    result = []
    for i, (name, score) in enumerate(scores, start=0):
        result.append(f"{i}. {name}: {score}")
    return result
