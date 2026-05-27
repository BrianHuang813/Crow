import random

# 20 visually distinct colors that read well on a dark (#1a1a1a) grid background
TERRITORY_COLORS = [
    "#ac3509", "#006a63", "#4a90d9", "#e6c229", "#9b59b6",
    "#e74c3c", "#2ecc71", "#f39c12", "#1abc9c", "#3498db",
    "#e91e63", "#ff5722", "#8bc34a", "#00bcd4", "#673ab7",
    "#ff9800", "#4caf50", "#2196f3", "#9c27b0", "#f44336",
]


def pick_color(exclude: list[str] | None = None) -> str:
    """Pick a random color from the palette, avoiding recently-used ones."""
    available = [c for c in TERRITORY_COLORS if c not in (exclude or [])]
    return random.choice(available or TERRITORY_COLORS)
