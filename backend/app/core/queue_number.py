MAX_DAILY_QUEUE_NUMBER = 9999


def format_queue_number(route_prefix: str, sequence: int) -> str:
  """Format the route code and its daily sequence for display (for example 192-0001)."""
  if not route_prefix or not route_prefix.isalnum():
    raise ValueError("Route queue prefix must contain only letters and digits")
  if not 1 <= sequence <= MAX_DAILY_QUEUE_NUMBER:
    raise ValueError(f"Queue sequence must be between 1 and {MAX_DAILY_QUEUE_NUMBER}")
  return f"{route_prefix}-{sequence:04d}"
