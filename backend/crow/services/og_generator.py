from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
from ..models import Project

# OG card dimensions
WIDTH, HEIGHT = 1200, 630
BG_COLOR = "#1a1a1a"
CARD_COLOR = "#252525"
PRIMARY = "#ac3509"
SECONDARY = "#006a63"
TEXT_COLOR = "#f0eded"
MUTED_COLOR = "#8d7169"

# Font paths — fallback to default if not found
_FONT_PATHS = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
    "/Library/Fonts/Arial Bold.ttf",
]
_FONT_PATHS_REGULAR = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
    "/Library/Fonts/Arial.ttf",
]


def _load_font(paths: list[str], size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in paths:
        try:
            return ImageFont.truetype(path, size)
        except (IOError, OSError):
            continue
    return ImageFont.load_default()


def generate_og_card(project: Project) -> bytes:
    img = Image.new("RGB", (WIDTH, HEIGHT), color=BG_COLOR)
    draw = ImageDraw.Draw(img)

    # Card background
    draw.rounded_rectangle([40, 40, WIDTH - 40, HEIGHT - 40], radius=24, fill=CARD_COLOR)

    # Project color accent bar (left side)
    draw.rounded_rectangle([40, 40, 56, HEIGHT - 40], radius=8, fill=project.color)

    font_large = _load_font(_FONT_PATHS, 72)
    font_medium = _load_font(_FONT_PATHS_REGULAR, 36)
    font_small = _load_font(_FONT_PATHS_REGULAR, 28)

    # Project name
    draw.text((100, 120), project.name[:40], fill=TEXT_COLOR, font=font_large)

    # Description
    if project.description:
        desc = project.description[:120] + ("..." if len(project.description) > 120 else "")
        draw.text((100, 230), desc, fill=MUTED_COLOR, font=font_medium)

    # Tech tags
    tag_x = 100
    for tag in project.tech_tags[:6]:
        tag_w = len(tag) * 16 + 24
        draw.rounded_rectangle([tag_x, 330, tag_x + tag_w, 375], radius=8, fill="#333333")
        draw.text((tag_x + 12, 337), tag, fill=SECONDARY, font=font_small)
        tag_x += tag_w + 12

    # Territory size badge
    badge_text = f"{project.territory_size} cells"
    draw.text((100, 430), badge_text, fill=PRIMARY, font=font_medium)

    # Status indicator
    status_colors = {"alive": "#2ecc71", "dying": "#f39c12", "dead": "#7f8c8d"}
    status_color = status_colors.get(project.status, MUTED_COLOR)
    draw.ellipse([100, 500, 120, 520], fill=status_color)
    draw.text((132, 498), project.status.upper(), fill=status_color, font=font_small)

    # Crow branding
    draw.text((100, HEIGHT - 100), "CROW", fill=MUTED_COLOR, font=font_medium)
    draw.text((WIDTH - 300, HEIGHT - 100), "Digital Darwinism", fill=MUTED_COLOR, font=font_small)

    buf = BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()
