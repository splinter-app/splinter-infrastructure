import os
import json
import openai
import pinecone

# Initialize OpenAI and Pinecone clients once to avoid reinitialization in each function call
openai_client = openai.OpenAI(api_key=os.environ['OPENAI_API_KEY'])
pinecone_client = pinecone.Pinecone(api_key=os.environ['PINECONE_API_KEY'])
pinecone_index = pinecone_client.Index(os.environ['PINECONE_INDEX_NAME'])
model_name = os.environ['EMBEDDING_MODEL_NAME']

def lambda_handler(event, context):
    # Parse the incoming JSON request body
    body = json.loads(event['body'])
    question = body['question']

    # Step 1: Convert question into vector using OpenAI embeddings
    embedding = openai_embed(question)

    # Step 2: Perform similarity search to retrieve relevant chunks of data
    context = pinecone_similarity_search(embedding)

    # Step 3: Generate the prompt and get response from OpenAI API
    prompt = generate_prompt(question, context)
    response = openai_query(prompt)

    # Step 4: Return answer and relevant chunks of data
    return {
        "statusCode": 200,
        "body": json.dumps({
            "question": question,
            "response": response,
            "prompt": prompt,
            "context": context
        }),
        "headers": {
            "Content-Type": "application/json"
        }
    }

def openai_embed(question: str) -> list:
    response = openai_client.embeddings.create(
        input=question,
        model=model_name
    )
    return response.data[0].embedding

def pinecone_similarity_search(embedding: list) -> list:
    top_k = 5
    all_results = []

    # Get all namespaces and search across them
    namespaces = list(pinecone_index.describe_index_stats()['namespaces'].keys())
    for namespace in namespaces:
        query_response = pinecone_index.query(
            vector=embedding,
            top_k=top_k,
            namespace=namespace,
            include_metadata=True
        )
        all_results.extend(query_response["matches"])

    # Sort results across all namespaces by score and return only top_k results
    all_results = sorted(all_results, key=lambda x: x["score"], reverse=True)[:top_k]
    return [{'text': result['metadata']['text'], 'score': result['score']} for result in all_results]

def openai_query(prompt: str):
    response = openai_client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": prompt}
        ]
    )
    return response.choices[0].message.content

def generate_prompt(question: str, contexts: list):
    limit = 3000
    prompt_start = ""
    prompt_end = f"The above documents are provided to assist you in answering the following question. Use only the provided documents to generate a response, if the documents do not provide sufficient information to answer the question respond saying there isn't enough information. Do not use any sources outside of the context above \n\nQuestion: {question}\nAnswer:"
    context_texts = [context["text"] for context in contexts]

    for i in range(1, len(context_texts)):
        if len("\n\n---\n\n".join(context_texts[:i])) >= limit:
            return prompt_start + "\n\n---\n\n".join(context_texts[:i-1]) + prompt_end
        elif i == len(context_texts) - 1:
            return prompt_start + "\n\n---\n\n".join(context_texts) + prompt_end
        