def toggle_case_first(s):
    if s[0].isupper():
        return s[0].lower() + s[1:]
    else:
        return s[0].upper() + s[1:]
