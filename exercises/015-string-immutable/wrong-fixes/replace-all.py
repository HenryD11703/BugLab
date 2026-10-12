def toggle_case_first(s):
    if s[0].isupper():
        return s.replace(s[0], s[0].lower())
    return s.replace(s[0], s[0].upper())
