def word_frequency(words):
    freq = {}
    for word in words:
        freq[word] = freq.get(word, 0) + 1
    return freq
