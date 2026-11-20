import math
import re
from collections import Counter

from app.schemas.query_schema import RetrievedContext

_STOPWORDS = {
    "a", "an", "and", "are", "by", "for", "from", "how", "in", "is", "it",
    "of", "on", "or", "the", "to", "was", "what", "which", "who", "with",
    "show", "find", "tell", "me", "আমাকে", "এবং", "কি", "কোন", "দেখাও",
}


def _tokens(text: str) -> list[str]:
    return [
        token
        for token in re.findall(r"[\w]+", text.casefold(), flags=re.UNICODE)
        if len(token) > 1 and token not in _STOPWORDS
    ]


def retrieve_relevant_context(
    question: str,
    documents: list[RetrievedContext],
    limit: int = 3,
) -> list[dict[str, str]]:
    query_terms = set(_tokens(question))
    if not query_terms or not documents or limit < 1:
        return []

    tokenized_documents = [
        _tokens(f"{document.question} {document.summary}")
        for document in documents
    ]
    document_frequencies = Counter(
        token
        for tokens in tokenized_documents
        for token in set(tokens)
    )
    ranked: list[tuple[float, int, RetrievedContext]] = []
    document_count = len(documents)
    for index, (document, tokens) in enumerate(
        zip(documents, tokenized_documents, strict=True)
    ):
        frequencies = Counter(tokens)
        score = sum(
            math.log1p(
                (document_count + 1) / (document_frequencies[term] + 1)
            )
            * min(frequencies[term], 3)
            for term in query_terms
            if frequencies[term]
        )
        if score > 0:
            ranked.append((score, index, document))

    ranked.sort(key=lambda item: (-item[0], item[1]))
    return [
        {"question": document.question, "summary": document.summary}
        for _, _, document in ranked[:limit]
    ]