from PIL import Image, ImageDraw, ImageFont
import re

WIDTH = 1200
HEIGHT = 630

# Syntax highlighting colors (matching the reference image)
KEYWORD_COLOR = "#c678dd"      # Purple - public, class, static, void, new, int
TYPE_COLOR = "#e5c07b"         # Yellow - Main, Arena, String
STRING_COLOR = "#98c379"       # Green - strings
NUMBER_COLOR = "#d19a66"       # Orange - numbers
METHOD_COLOR = "#61afef"       # Blue - method names
TEXT_COLOR = "#c9d1d9"         # Light gray - default text
OUTPUT_COLOR = "#06f967"       # Green - output text

JAVA_KEYWORDS = {
    "public", "class", "static", "void", "new", "int",
    "return", "private", "protected", "final", "if", "else",
    "for", "while", "do", "switch", "case", "import", "package",
    "boolean", "double", "float", "long", "short", "byte", "char",
    "try", "catch", "throw", "throws", "extends", "implements"
}

JAVA_TYPES = {
    "String", "System", "Scanner", "ArrayList", "HashMap",
    "Integer", "Boolean", "Double", "Float", "Object",
    "List", "Map", "Set", "Arrays", "Collections",
    "Arena", "Main"
}


def create_gradient_background():
    img = Image.new("RGB", (WIDTH, HEIGHT), "#0D1117")
    draw = ImageDraw.Draw(img)

    for y in range(HEIGHT):
        r = int(13 + (28 - 13) * (y / HEIGHT))
        g = int(17 + (33 - 17) * (y / HEIGHT))
        b = int(23 + (40 - 23) * (y / HEIGHT))
        draw.line([(0, y), (WIDTH, y)], fill=(r, g, b))

    return img


def draw_syntax_line(draw, line, x, y, font):
    """Draw a line of Java code with syntax highlighting"""
    # Tokenize: split into words, strings, and non-word chars
    tokens = re.findall(r'"[^"]*"|\'[^\']*\'|\b\w+\b|[^\w\s]|\s+', line)

    cursor_x = x
    in_string = False

    for token in tokens:
        color = TEXT_COLOR

        # String literal
        if token.startswith('"') and token.endswith('"'):
            color = STRING_COLOR
        # Number
        elif token.isdigit():
            color = NUMBER_COLOR
        # Keyword
        elif token in JAVA_KEYWORDS:
            color = KEYWORD_COLOR
        # Type / Class name
        elif token in JAVA_TYPES:
            color = TYPE_COLOR
        # Method call (word followed by `(` — we check next token, but simpler: known patterns)
        elif re.match(r'^[a-z]\w*$', token) and token not in JAVA_KEYWORDS:
            # Check if it looks like a method (lowercase start)
            # We'll color known method-like tokens
            if token in {"main", "println", "out", "format", "initialize", "println"}:
                color = METHOD_COLOR
            else:
                color = TEXT_COLOR

        draw.text((cursor_x, y), token, fill=color, font=font)
        cursor_x += draw.textlength(token, font=font)


def draw_code_editor(img, code_text, output_text=None):
    draw = ImageDraw.Draw(img)

    # Load Fonts
    try:
        font_regular = ImageFont.truetype(
            "./fonts/JetBrainsMono-Regular.ttf", 26)
        font_mono = ImageFont.truetype("./fonts/JetBrainsMono-Regular.ttf", 26)
        font_small = ImageFont.truetype(
            "./fonts/JetBrainsMono-Regular.ttf", 20)
        font_label = ImageFont.truetype(
            "./fonts/JetBrainsMono-Regular.ttf", 16)
        font_brand = ImageFont.truetype(
            "./fonts/JetBrainsMono-Regular.ttf", 32)
        font_brand_small = ImageFont.truetype(
            "./fonts/JetBrainsMono-Regular.ttf", 14)
    except:
        try:
            font_regular = ImageFont.truetype("./fonts/arial.ttf", 26)
            font_mono = ImageFont.truetype("./fonts/consolas.ttf", 26)
            font_small = ImageFont.truetype("./fonts/arial.ttf", 20)
            font_label = ImageFont.truetype("./fonts/arial.ttf", 16)
            font_brand = ImageFont.truetype("./fonts/arial.ttf", 32)
            font_brand_small = ImageFont.truetype("./fonts/arial.ttf", 14)
        except:
            font_regular = ImageFont.load_default()
            font_mono = ImageFont.load_default()
            font_small = ImageFont.load_default()
            font_label = ImageFont.load_default()
            font_brand = ImageFont.load_default()
            font_brand_small = ImageFont.load_default()

    editor_x = 80
    editor_y = 60
    editor_width = 1040
    editor_height = 420

    if output_text:
        editor_height = 480

    # Editor Background
    draw.rounded_rectangle(
        [editor_x, editor_y, editor_x + editor_width, editor_y + editor_height],
        radius=20,
        fill="#1c2128"
    )

    # Header
    header_height = 50
    draw.rounded_rectangle(
        [editor_x, editor_y, editor_x + editor_width, editor_y + header_height],
        radius=20,
        fill="#161B22"
    )
    # Fill bottom corners of header (so only top is rounded)
    draw.rectangle(
        [editor_x, editor_y + 20, editor_x +
            editor_width, editor_y + header_height],
        fill="#161B22"
    )

    # Window Buttons (slightly larger)
    dot_y = editor_y + 18
    draw.ellipse((editor_x+22, dot_y, editor_x+40, dot_y+18), fill="#ff5f56")
    draw.ellipse((editor_x+50, dot_y, editor_x+68, dot_y+18), fill="#ffbd2e")
    draw.ellipse((editor_x+78, dot_y, editor_x+96, dot_y+18), fill="#27c93f")

    # File Name with icon (centered)
    file_text = "\U0001F4C4 Main.java"
    file_w = draw.textlength(file_text, font=font_small)
    draw.text((editor_x + (editor_width - file_w) // 2, editor_y + 15),
              file_text, fill="#8b949e", font=font_small)

    # Draw Code with syntax highlighting
    code_y = editor_y + header_height + 25
    line_spacing = 38

    code_lines = code_text.split("\n")
    for line in code_lines:
        draw_syntax_line(draw, line, editor_x + 40, code_y, font_mono)
        code_y += line_spacing

    # Output Section
    if output_text:
        output_section_height = 130
        output_top = editor_y + editor_height - output_section_height

        # Output background
        draw.rounded_rectangle(
            [editor_x, output_top,
             editor_x + editor_width, editor_y + editor_height],
            radius=20,
            fill="#0d1117"
        )
        # Fill top corners (so only bottom is rounded)
        draw.rectangle(
            [editor_x, output_top, editor_x + editor_width, output_top + 20],
            fill="#0d1117"
        )

        # Separator line
        draw.line(
            [(editor_x, output_top), (editor_x + editor_width, output_top)],
            fill="#21262d", width=2
        )

        # OUTPUT label with icon
        draw.text((editor_x + 40, output_top + 12),
                  "\U0001F4CB OUTPUT", fill="#8b949e", font=font_label)

        # Output lines
        out_y = output_top + 40
        for line in output_text.split("\n"):
            draw.text((editor_x + 40, out_y), "$ " + line,
                      fill=OUTPUT_COLOR, font=font_small)
            out_y += 32

    # Branding (bottom right)
    draw.text((WIDTH - 250, HEIGHT - 70),
              "SHARED VIA", fill="#8b949e", font=font_brand_small)
    draw.text((WIDTH - 250, HEIGHT - 50),
              "JavaRena \u26a1", fill="#ffffff", font=font_brand)

    return img


def generate_image(code, output=None):
    """Wrapper function for compatibility with server.py"""
    img = create_gradient_background()
    img = draw_code_editor(img, code, output_text=output)
    return img


if __name__ == "__main__":
    # Example Usage
    code = """public class Main {
    public static void main(String[] args) {
        Arena arena = new Arena("JavaRena");
        arena.initialize();

        int players = 1024;
        System.out.println("Welcome to the Arena!");
        System.out.format("Active players: %d", players);
    }
}"""

    output = """Welcome to the Arena!
Active players: 1024"""

    img = generate_image(code, output)
    img.save("javarena_social.png")
