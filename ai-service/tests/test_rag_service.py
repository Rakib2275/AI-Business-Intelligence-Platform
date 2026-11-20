from app.schemas.query_schema import RetrievedContext
from app.services.rag_service import retrieve_relevant_context


def test_retrieval_ranks_matching_dataset_history_and_ignores_unrelated_context() -> None:
    documents = [
        RetrievedContext(
            question="Which products had the highest sales?",
            summary="Product A led revenue in the latest result.",
        ),
        RetrievedContext(
            question="How many customers returned orders?",
            summary="Returns were grouped by country.",
        ),
        RetrievedContext(
            question="Compare sales by product.",
            summary="The previous result showed product totals.",
        ),
    ]

    retrieved = retrieve_relevant_context("Compare product sales", documents, limit=2)

    assert [document["question"] for document in retrieved] == [
        "Compare sales by product.",
        "Which products had the highest sales?",
    ]


def test_retrieval_returns_no_context_when_there_is_no_term_overlap() -> None:
    documents = [
        RetrievedContext(
            question="Which products had the highest sales?",
            summary="Product A led revenue.",
        )
    ]

    assert retrieve_relevant_context("What is the weather tomorrow?", documents) == []
