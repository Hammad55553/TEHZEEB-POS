import re

with open("src/pages/POS.jsx", "r") as f:
    content = f.read()

# I will replace the hardcoded colors with modern CSS variables to fix the color theme globally in POS
content = content.replace("'#FF8A1E'", "'var(--primary)'")
content = content.replace("'#D2691E'", "'var(--primary-hover)'")
content = content.replace("'#8B2500'", "'var(--sidebar-active)'")
content = content.replace("'#7A1E0C'", "'var(--sidebar-active)'")
content = content.replace("'#FFF7E6'", "'var(--primary-light)'")
content = content.replace("'#F7941D'", "'var(--primary)'")

with open("src/pages/POS.jsx", "w") as f:
    f.write(content)

with open("src/pages/Dashboard.jsx", "r") as f:
    content = f.read()

content = content.replace("'#FF8A1E'", "'var(--primary)'")
content = content.replace("'#D2691E'", "'var(--primary-hover)'")
content = content.replace("'#FFF7E6'", "'var(--primary-light)'")
content = content.replace("'#F7941D'", "'var(--primary)'")

with open("src/pages/Dashboard.jsx", "w") as f:
    f.write(content)

