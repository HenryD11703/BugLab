def word_frequency(words):
    """
    Returns a dictionary mapping each word to the number of times
    it appears in the list.

    Example: word_frequency(["a", "b", "a"]) -> {"a": 2, "b": 1}
    """
    freq = {}
    for word in words:
        freq[word] += 1
    return freq
