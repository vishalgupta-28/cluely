import os
import uuid
import requests
from io import BytesIO
from langchain.document_loaders.pdf import PyPDFDirectoryLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_core.documents import Document
from dotenv import load_dotenv
from pinecone.grpc import PineconeGRPC
from llama_parse import LlamaParse
import nest_asyncio

# Apply nest_asyncio to handle async operations
nest_asyncio.apply()

INDEX_NAME = os.getenv("PINECONE_INDEX_NAME")
pc = PineconeGRPC(api_key=os.getenv("PINECONE_API_KEY"))
api_key = os.getenv("GEMINI_API_KEY")
API_SECRET_KEY = os.environ.get("SECRET_KEY")

if not api_key:
    raise ValueError("GEMINI_API_KEY is not set. Please check your .env file.")
os.environ['GEMINI_API_KEY'] = api_key

def load_env_variables():
    load_dotenv()
    return {
        "DATA_PATH": os.getenv("DATA_PATH"),
    }

def get_text_nodes(json_list):
    """Convert LlamaParse JSON pages to Document objects - maintains compatibility with existing schema"""
    documents = []
    
    for page_num, page_data in enumerate(json_list, 1):
        # Extract text content from the page - try multiple possible keys
        text_content = ""
        
        # Try different possible keys where text might be stored
        if isinstance(page_data, dict):
            # Common keys in LlamaParse JSON response
            text_content = (
                page_data.get('text', '') or 
                page_data.get('content', '') or 
                page_data.get('markdown', '') or
                page_data.get('page_content', '') or
                str(page_data)  # fallback to string representation
            )
        else:
            text_content = str(page_data)
        
        # Only add non-empty pages
        if text_content and text_content.strip():
            # Create Document object with same metadata structure as existing code
            doc = Document(
                page_content=text_content.strip(),
                metadata={
                    'page': page_num,
                    'source': 'multimodal_parse'  # Will be updated with actual source in main function
                }
            )
            documents.append(doc)
    
    return documents

def parse_pdf_multimodal(file_path, use_multimodal=True):
    """Parse PDF using LlamaParse with multimodal capabilities - optimized version"""
    
    # Comprehensive parsing instruction for multimodal content
    parsing_instruction = """
    You are parsing a comprehensive document that may contain text, tables, charts, and images.
    
    For text content:
    - Extract all headings, subheadings, and body text
    - Maintain the original structure and hierarchy
    - Preserve formatting like bullet points and numbered lists
    
    For tables:
    - Convert all tables to markdown format
    - Preserve all data, headers, and structure
    - Include table captions if present
    
    For charts and graphs:
    - Describe the chart type and what it represents
    - Extract all numerical values, labels, and legends
    - Create a 2D table of relevant values when possible
    - Include chart titles and axis labels
    
    For images and diagrams:
    - Provide detailed descriptions of visual content
    - List all visible text, labels, and annotations
    - Describe relationships between components
    - Extract any embedded text or data
    
    Make sure to parse content in the correct reading order and maintain document structure.
    """
    
    if use_multimodal:
        print("🦙 Using multimodal parsing with LlamaParse...")
        parser = LlamaParse(
            api_key=os.getenv("LLAMA_API_KEY"), # api key for llama parse - have to secure it later
            result_type="markdown", # change this to markdown because it will benefit us in frontend for perplexity like ui(markdown-ui)
            use_vendor_multimodal_model=True,
            vendor_multimodal_model_name="gemini-2.0-flash-001",
            invalidate_cache=True,
            system_prompt=parsing_instruction,
            verbose=True,  # Enable verbose for debugging
            show_progress=True,  # Show progress
            max_timeout=300  # 5 minute timeout
        )
        
        try:
            print("⏳ Starting LlamaParse processing...")
            
            # Verify file exists and is readable
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"File not found: {file_path}")
            
            if not os.path.isfile(file_path):
                raise ValueError(f"Path is not a file: {file_path}")
            
            file_size = os.path.getsize(file_path)
            print(f"📄 File size: {file_size / (1024*1024):.2f} MB")
            
            if file_size == 0:
                raise ValueError("File is empty")
            
            if file_size > 50 * 1024 * 1024:  # 50MB limit
                print("⚠️  File is large, this may take longer to process...")
            
            # Try to get JSON result for more detailed processing
            print("🔄 Calling LlamaParse API...")
            json_objs = parser.get_json_result(file_path)
            
            if not json_objs:
                print("⚠️  LlamaParse returned None")
                raise ValueError("LlamaParse returned no results")
                
            print(f"📄 LlamaParse returned {len(json_objs)} objects")
            
            if len(json_objs) == 0:
                raise ValueError("LlamaParse returned empty results")
            
            # Check if the first object has pages
            if "pages" not in json_objs[0]:
                print(f"⚠️  Available keys in result: {list(json_objs[0].keys())}")
                raise ValueError("LlamaParse result does not contain 'pages' key")
                
            json_list = json_objs[0]["pages"]
            print(f"📑 Processing {len(json_list)} pages from LlamaParse")
            
            if len(json_list) == 0:
                raise ValueError("No pages found in LlamaParse result")
            
            # Convert to Document objects
            documents = get_text_nodes(json_list)
            print(f"✅ Multimodal parsing extracted {len(documents)} pages")
            
        except Exception as e:
            print(f"❌ LlamaParse failed: {str(e)}")
            print("🔄 Falling back to standard parsing...")
            # Fallback to standard parsing
            loader = PyPDFDirectoryLoader(os.path.dirname(file_path))
            documents = loader.load()
            
            # Filter to only the specific file we want
            documents = [doc for doc in documents if doc.metadata.get('source', '').endswith(os.path.basename(file_path))]
            print(f"📄 Standard parsing extracted {len(documents)} pages")
        
    else:
        print("�📄 Using standard PDF parsing...")
        # Fallback to standard parsing if multimodal fails
        loader = PyPDFDirectoryLoader(os.path.dirname(file_path))
        documents = loader.load()
        
        # Filter to only the specific file we want
        documents = [doc for doc in documents if doc.metadata.get('source', '').endswith(os.path.basename(file_path))]
        print(f"✅ Standard parsing extracted {len(documents)} pages")
    
    return documents

# def add_to_chroma(chunks, chroma_path):
#     db = Chroma(persist_directory=chroma_path, embedding_function=OpenAIEmbeddings())
#     chunks_with_ids = calculate_chunk_ids(chunks)
#     existing_items = db.get(include=[])
#     existing_ids = set(existing_items["ids"])
#     new_chunks = [chunk for chunk in chunks_with_ids if chunk.metadata["id"] not in existing_ids]
    
#     if new_chunks:
#         new_chunk_ids = [chunk.metadata["id"] for chunk in new_chunks]
#         db.add_documents(new_chunks, ids=new_chunk_ids)
#         db.persist()
#         print("✅ Documents added successfully!")
#     else:
#         print("✅ No new documents to add")


def add_to_pinecone(chunks, namespace):
    """Optimized function to upload chunks to Pinecone with batch processing and error handling"""
    print(f"🚀 Starting to upload {len(chunks)} chunks to Pinecone...")
    
    try:
        index = pc.Index(name=INDEX_NAME)
        embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")

        chunks_with_ids = calculate_chunk_ids(chunks)
        
        # Process in batches for better performance and memory management
        batch_size = 100  # Optimal batch size for Pinecone
        total_batches = (len(chunks_with_ids) + batch_size - 1) // batch_size
        
        for batch_idx in range(0, len(chunks_with_ids), batch_size):
            batch_chunks = chunks_with_ids[batch_idx:batch_idx + batch_size]
            vectors = []
            
            # Generate embeddings for the batch
            batch_texts = [chunk.page_content for chunk in batch_chunks]
            batch_embeddings = embeddings.embed_documents(batch_texts)
            
            # Prepare vectors for upsert
            for chunk, embedding in zip(batch_chunks, batch_embeddings):
                vectors.append({
                    "id": str(chunk.metadata["id"]),
                    "values": embedding,
                    "metadata": chunk.metadata
                })
            
            # Upsert batch to Pinecone
            index.upsert(vectors=vectors, namespace=namespace)
            
            current_batch = (batch_idx // batch_size) + 1
            print(f"📦 Processed batch {current_batch}/{total_batches} ({len(vectors)} vectors)")
        
        print(f"✅ All {len(chunks_with_ids)} documents added successfully to namespace: {namespace}")
        
    except Exception as e:
        print(f"❌ Error uploading to Pinecone: {e}")
        raise




def calculate_chunk_ids(chunks):
    last_page_id = None
    current_chunk_index = 0
    
    for chunk in chunks:
        source = chunk.metadata.get("source")
        page = chunk.metadata.get("page")
        chunk.metadata["text"] = chunk.page_content
        current_page_id = f"{source}:{page}"
        
        if current_page_id == last_page_id:
            current_chunk_index += 1
        else:
            current_chunk_index = 0
        
        chunk.metadata["id"] = f"{current_page_id}:{current_chunk_index}"
        last_page_id = current_page_id
    
    return chunks

def split_documents(documents):
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000, 
        chunk_overlap=200,
        separators=["\n\n", "\n", " ", ""]
    )
    return text_splitter.split_documents(documents)

def ADD_EMBEDDINGS_FROM_AZURE(pdf_url, userId, use_multimodal=True):
    """Enhanced function with multimodal RAG capabilities while maintaining existing schema"""
    env_vars = load_env_variables()

    print(f"📥 Processing PDF: {pdf_url}")

    # Fetch PDF from Azure Blob URL directly
    response = requests.get(pdf_url)
    if response.status_code != 200:
        raise Exception("Failed to fetch PDF from Azure Blob URL.")
    
    pdf_content = BytesIO(response.content)

    # Generate a valid filename based on the S3 URL hash
    temp_pdf_path = os.path.join(env_vars["DATA_PATH"], f'{str(uuid.uuid1())}.pdf')

    # Save the file
    with open(temp_pdf_path, "wb") as f:
        f.write(pdf_content.read())

    try:
        # Use multimodal parsing with fallback to standard parsing
        if use_multimodal:
            try:
                documents = parse_pdf_multimodal(temp_pdf_path, use_multimodal=True)
                print("🎯 Using multimodal parsing for enhanced content extraction")
            except Exception as e:
                print(f"⚠️ Multimodal parsing failed: {e}")
                print("🔄 Falling back to standard parsing...")
                documents = parse_pdf_multimodal(temp_pdf_path, use_multimodal=False)
        else:
            documents = parse_pdf_multimodal(temp_pdf_path, use_multimodal=False)
        
        # Ensure all documents have the correct source metadata (maintaining existing schema)
        for doc in documents:
            doc.metadata["source"] = pdf_url
        
        # Split documents and add to Pinecone (unchanged process)
        chunks = split_documents(documents)
        add_to_pinecone(chunks, userId)
        
        print(f"🎉 Successfully processed {len(documents)} pages and {len(chunks)} chunks")
        
    except Exception as e:
        print(f"❌ Error processing PDF: {e}")
        raise
    finally:
        # Clean up temporary file
        if os.path.exists(temp_pdf_path):
            os.remove(temp_pdf_path)

    return {"response": True}

def ADD_EMBEDDINGS_FROM_S3_MULTIMODAL(pdf_url, userId):
    """Convenience function that always uses multimodal parsing with enhanced error handling"""
    return ADD_EMBEDDINGS_FROM_S3(pdf_url, userId, use_multimodal=True)

def ADD_EMBEDDINGS_FROM_S3_STANDARD(pdf_url, userId):
    """Convenience function that uses standard parsing for compatibility"""
    return ADD_EMBEDDINGS_FROM_S3(pdf_url, userId, use_multimodal=False)
