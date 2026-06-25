import re

with open('src/DataImporter.jsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace(r'\`', '`')
c = c.replace(r'\${', '${')
c = c.replace(r'\\d', r'\d')

with open('src/DataImporter.jsx', 'w', encoding='utf-8') as f:
    f.write(c)

print('Fixed escaped chars')
