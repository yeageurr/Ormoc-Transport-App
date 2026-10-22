import secrets


# Crockford-style alphabet: omits I, L, O, U and the digits 0/1 to avoid
# references that are difficult to read over the phone or in a busy terminal.
TICKET_REFERENCE_ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789"
TICKET_REFERENCE_LENGTH = 8


def generate_ticket_reference() -> str:
  """Generate an eight-character, human-readable ticket reference."""
  return "".join(
    secrets.choice(TICKET_REFERENCE_ALPHABET)
    for _ in range(TICKET_REFERENCE_LENGTH)
  )
