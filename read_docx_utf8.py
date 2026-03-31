import zipfile
import re
import sys

def read_docx(path):
    try:
        with zipfile.ZipFile(path) as docx:
            xml_content = docx.read('word/document.xml').decode('utf-8')
            paragraphs = xml_content.split('<w:p')
            with open('agape_utf8.txt', 'w', encoding='utf-8') as f:
                for p in paragraphs:
                    if '>' in p:
                        text = re.sub('<[^<]+>', '', p[p.find('>'):])
                        text = text.strip()
                        if text:
                            f.write(text + '\n')
    except Exception as e:
        print(f"Error reading docx: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        read_docx(sys.argv[1])
    else:
        print("Provide path to docx")
