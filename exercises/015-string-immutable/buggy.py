def toggle_case_first(s):
    """
    Returns the string with the first character's case toggled.
    Uppercase becomes lowercase; lowercase becomes uppercase.
    The rest of the string is unchanged.

    Example: toggle_case_first("Hello") -> "hello"
    """
    if s[0].isupper():
        s[0] = s[0].lower()
    else:
        s[0] = s[0].upper()
    return s
