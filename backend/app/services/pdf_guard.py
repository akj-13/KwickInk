from pathlib import Path

from app.services.crypto import is_pdf_magic


class PdfValidationError(ValueError):
    pass


def validate_and_page_count(path: str) -> int:
    data = Path(path).read_bytes()
    if not is_pdf_magic(data[:8]):
        raise PdfValidationError("Rejected: file magic bytes are not PDF")

    try:
        import pdfplumber

        with pdfplumber.open(path) as pdf:
            pages = len(pdf.pages)
            if pages < 1:
                raise PdfValidationError("PDF has no extractable pages")
            return pages
    except Exception:
        from pypdf import PdfReader

        reader = PdfReader(path)
        pages = len(reader.pages)
        if pages < 1:
            raise PdfValidationError("PDF has no extractable pages")
        return pages
