from chat import retrieve_multi_query, chain
from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate
import os
from pydantic import BaseModel, Field
os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"

questions = [
    "What is the deadline for reporting a lost company laptop?",
    "How many days of sick leave do employees receive, and what is required if they are sick for 3 days?",
    "Does the company reimburse employees for home-fitness equipment?",
    "A Band C employee has 20 days of unused privilege leave at the end of the year. What happens to these days?",
    "An intern wants to store the company's unpublished policies on their local personal laptop. Is this allowed according to the security and data classifications?",
    "What are the combined mental health and optical benefits for an employee in Band D?",
    """I am a full-time employee in Band B, and I joined the company exactly halfway through the year on July 1st. In November, I am planning to undergo a minor surgery that will require 4 days of recovery at home, followed immediately by a 5-day vacation with my family where I plan to submit expenses for Leave Travel Allowance (LTA). While on vacation, I want to use my personal laptop to check my work email and download some internal org charts and wikis so I can read them offline.

Based on company policies, please answer the following:

1. What is my total allocation of Sick Leave and Casual Leave for this calendar year?

2. What is the maximum LTA limit I can claim for this trip?

3. Am I allowed to combine my sick leave for the surgery with privilege leave for the vacation?

4. Does my plan to use my personal laptop for email and downloading internal wikis comply with the IT Security Policy?"""
]
answers = []
contexts = []

def prepare_dataset(chain):
    for question in questions:
        ans = chain.invoke(question)
        answers.append(ans)
        context = retrieve_multi_query(question)
        print(context)
        contexts.append(context)

prepare_dataset(chain)

class EvaluationResult(BaseModel):
    score: float = Field(description="A score between 0.0 and 1.0 representing accuracy/alignment.")
    reasoning: str = Field(description="A comprehensive reason justifying the assigned score.")

base_llm = ChatOllama(model="llama3.2", temperature=0)
faithfulness_grader = base_llm.with_structured_output(EvaluationResult, method="json_mode")
faithfulness_prompt = ChatPromptTemplate.from_messages([
    ("system", (
        "You are a strict, objective quality assurance evaluator. "
        "Analyze if the generated 'Answer' is entirely derived from and supported by the provided 'Context'. every context block starts with a 'Document Title' and there can be multiple context blocks.\n"
        "You must output exclusively a valid JSON object matching this schema structure:\n"
        '{{"score": (score from 0.0 to 1.0), "reasoning": "your explanation text here"}}\n'
        "Do not output any markdown code blocks, schemas, introduction, or postscript text."
    )),
    ("human", "Context:\n{context}\n\nAnswer:\n{answer}")
])
faithfulness_chain = faithfulness_prompt | faithfulness_grader


class RelevancyResult(BaseModel):
    reasoning: str = Field(description="Analysis of how directly the answer targets the question, identifying any fluff or missing info.")
    score: float = Field(description="Score from 0.0 to 1.0 based on precision, completeness, and lack of redundant filler text.")

relevancy_llm = base_llm.with_structured_output(RelevancyResult, method="json_mode")

relevancy_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a quality control analyst evaluating a question-answering system. Identify core requests, penalize fluff or missing info, and explain the evaluation in 'reasoning' before assigning a score."),
    ("human", "User Question:\n{question}\n\nGenerated Answer:\n{answer}")
])
relevancy_chain = relevancy_prompt | relevancy_llm


for q, ans, ctx in zip(questions, answers, contexts):
    try:
        res = faithfulness_chain.invoke({"context": ctx, "answer": ans})
        print("-----Faithfulness Result-------")
        print(res)
        res = relevancy_chain.invoke({"question": q, "answer": ans})
        print("-----Relevancy Result-------")
        print(res, end="\n\n")
    except:
        pass