import os
import fitz  # PyMuPDF
from openai import OpenAI
from dotenv import load_dotenv
import spacy
import re
import uuid
import hashlib
import base64
import tempfile
import requests
import boto3
from botocore.exceptions import ClientError
from datetime import datetime
load_dotenv()
API_SECRET_KEY = os.environ.get("SECRET_KEY")

# AWS S3 Configuration
AWS_ACCESS_KEY_ID = os.environ.get("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.environ.get("AWS_REGION", "ap-south-1")
S3_BUCKET_NAME = os.environ.get("S3_BUCKET_NAME", "twai-bucket1")

# Load spaCy model for natural language processing
nlp = spacy.load("en_core_web_sm")


def download_from_url(url):
    """
    Download a file from a public URL to a temporary local file.
    
    Args:
        url: Public URL of the PDF file
        
    Returns:
        Path to the local temporary file or None if download fails
    """
    try:
        # Create a temporary file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
        temp_path = temp_file.name
        temp_file.close()
        
        # Download the file
        response = requests.get(url, stream=True,headers={
        'x-api-key': API_SECRET_KEY
    })
        response.raise_for_status()  # Raise an exception for HTTP errors
        
        with open(temp_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
                
        return temp_path
    except Exception as e:
        print(f"Error downloading from URL: {e}")
        if 'temp_path' in locals() and os.path.exists(temp_path):
            os.unlink(temp_path)  # Remove the temporary file
        return None


def clean_text(text: str):
    """
    Clean and normalize text by removing excessive whitespace.
    
    Args:
        text: The input text to clean
        
    Returns:
        Cleaned text with normalized spacing
    """
    return re.sub(r'\s+', ' ', text).strip()


def upload_image_to_s3(image_path: str, user_id: str = None) -> str:
    """
    Upload an image file to S3 and return the public URL.
    
    Args:
        image_path: Local path to the image file
        user_id: Optional user ID for organizing uploads
        
    Returns:
        Public S3 URL of the uploaded image or None if upload fails
    """
    try:
        # Initialize S3 client
        s3_client = boto3.client(
            's3',
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
            region_name=AWS_REGION
        )
        
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        filename = f"citation_images/{user_id or 'anonymous'}/{timestamp}_{unique_id}.png"
        
        # Upload file to S3
        with open(image_path, 'rb') as file:
            s3_client.upload_fileobj(
                file, 
                S3_BUCKET_NAME, 
                filename,
                ExtraArgs={'ContentType': 'image/png'}
            )
        
        # Return public URL
        s3_url = f"https://{S3_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{filename}"
        
        # Clean up local file
        if os.path.exists(image_path):
            os.unlink(image_path)
            
        return s3_url
        
    except ClientError as e:
        print(f"Error uploading to S3: {e}")
        # Clean up local file on error
        if os.path.exists(image_path):
            os.unlink(image_path)
        return None
    except Exception as e:
        print(f"Unexpected error uploading to S3: {e}")
        # Clean up local file on error
        if os.path.exists(image_path):
            os.unlink(image_path)
        return None


def extract_page_image_with_highlight(pdf_path: str, page_number: int, highlight_text: str):
    """
    Highlight specific text on a PDF page and save it as an image.
    
    Args:
        pdf_path: Path to the PDF file (local path or URL)
        page_number: Zero-based page number to process
        highlight_text: Text to highlight on the page
        
    Returns:
        Path to the saved image file or None if an error occurs
    """
    local_pdf_path = pdf_path
    is_url = pdf_path.startswith(('http://', 'https://'))
    
    try:
        # If it's a URL, download the file first
        if is_url:
            local_pdf_path = download_from_url(pdf_path)
            if not local_pdf_path:
                return None
        
        doc = fitz.open(local_pdf_path)
        if page_number < 0 or page_number >= len(doc):
            print(f"Error: Page number {page_number} is out of range.")
            return None

        page = doc[page_number]
        bbox_list = []

        # First try to find exact text matches
        cleaned_highlight_text = clean_text(highlight_text)
        text_instances = page.search_for(cleaned_highlight_text)
        
        if text_instances:
            bbox_list.extend(text_instances)
        else:
            # If no exact match, try sentence by sentence
            for sentence in nlp(highlight_text).sents:
                cleaned_sentence = clean_text(sentence.text)
                if len(cleaned_sentence) > 10:  # Only search for meaningful sentences
                    text_instances = page.search_for(cleaned_sentence)
                    if text_instances:
                        bbox_list.extend(text_instances)
                        break  # Found at least one match, stop here
            
            # If still no match, try searching for key phrases (words with 5+ chars)
            if not bbox_list:
                words = [word.strip() for word in cleaned_highlight_text.split() if len(word.strip()) >= 5]
                for word in words[:3]:  # Try first 3 meaningful words
                    text_instances = page.search_for(word)
                    if text_instances:
                        bbox_list.extend(text_instances[:2])  # Limit to 2 instances per word
                        break

        # Add highlight annotations if matches were found
        if bbox_list:
            for bbox in bbox_list:
                page.add_highlight_annot(bbox)

        # Save the page as an image with 3x resolution (with or without highlights)
        img_path = tempfile.NamedTemporaryFile(delete=False, suffix='.png').name
        page.get_pixmap(matrix=fitz.Matrix(3, 3)).save(img_path)

        doc.close()
        
        # Clean up temporary PDF if downloaded
        if is_url and os.path.exists(local_pdf_path):
            os.unlink(local_pdf_path)
        
        return img_path
    except Exception as e:
        if is_url and os.path.exists(local_pdf_path):
            os.unlink(local_pdf_path)
        return None


def extract_page_image(pdf_path: str, page_number: int):
    """
    Extract a PDF page as an image without highlights.
    
    Args:
        pdf_path: Path to the PDF file (local path or URL)
        page_number: Zero-based page number to extract
        
    Returns:
        Path to the saved image file
    """
    local_pdf_path = pdf_path
    is_url = pdf_path.startswith(('http://', 'https://'))
    
    try:
        # If it's a URL, download the file first
        if is_url:
            local_pdf_path = download_from_url(pdf_path)
            if not local_pdf_path:
                return None
        
        doc = fitz.open(local_pdf_path)
        page = doc.load_page(page_number)
        img_path = tempfile.NamedTemporaryFile(delete=False, suffix='.png').name
        page.get_pixmap().save(img_path)
        doc.close()
        
        # Clean up the temporary PDF if it was downloaded from a URL
        if is_url and os.path.exists(local_pdf_path):
            os.unlink(local_pdf_path)
            
        return img_path
    except Exception as e:
        print(f"Error extracting page image: {e}")
        # Clean up the temporary PDF if it was downloaded from a URL
        if is_url and local_pdf_path and os.path.exists(local_pdf_path):
            os.unlink(local_pdf_path)
        return None


def generate_unique_filename(pdf_path, page_number):
    """
    Generate a unique filename based on the PDF path and page number.
    
    Args:
        pdf_path: Path to the PDF file
        page_number: The page number
        
    Returns:
        A unique filename string
    """
    # Extract just the UUID part from S3 URLs if possible
    if pdf_path.startswith('http'):
        try:
            filename = pdf_path.split('/')[-1]
            if '-' in filename and '.pdf' in filename.lower():
                pdf_path = filename  # Use just the filename for hashing
        except:
            pass  # If extraction fails, use the full path
            
    pdf_hash = hashlib.md5(pdf_path.encode()).hexdigest()[:8]  # Short hash of PDF path
    unique_id = uuid.uuid4().hex[:8]  # Random unique identifier
    return f"img_{pdf_hash}_{page_number}_{unique_id}.png"


def encode_image_to_base64(image_path):
    """
    Encode an image file to a Base64 string and delete the file after encoding.
    
    Args:
        image_path: Path to the image file
        
    Returns:
        Base64 encoded string or None if the file doesn't exist
    """
    if not image_path or not os.path.exists(image_path):
        return None

    with open(image_path, "rb") as image_file:
        encoded_string = base64.b64encode(image_file.read()).decode("utf-8")
    
    # Delete image after encoding to avoid clutter
    os.remove(image_path)
    return encoded_string


def extract_used_citations(response, citation_map, all_retrieved_documents, user_id: str = None):
    """
    Extract citation numbers from response and return only used citations.
    Optimized to capture citations even with minimal usage through multiple strategies.
    
    Args:
        response: The text response containing citations in [x] format
        citation_map: Dictionary mapping citation numbers to source descriptions
        all_retrieved_documents: List of document dictionaries with PDF paths and page numbers
        user_id: Optional user ID for organizing S3 uploads
        
    Returns:
        Dictionary of used citations with their descriptions and S3 image URLs
    """
    print("🔍 Starting optimized citation extraction...")
    
    # Strategy 1: Extract explicit citation numbers from response using regex
    explicit_citations = set(map(int, re.findall(r"\[(\d+)\]", response)))
    print(f"📝 Found {len(explicit_citations)} explicit citations: {explicit_citations}")
    
    # Strategy 2: Semantic matching - find documents whose content appears in response
    semantic_citations = set()
    response_lower = response.lower()
    
    for i, doc in enumerate(all_retrieved_documents):
        doc_num = i + 1
        if doc_num in explicit_citations:
            continue  # Already found explicitly
            
        text_chunk = doc.get("page_content", "")
        if len(text_chunk) < 10:  # Skip very short chunks
            continue
            
        # Extract key phrases (3+ words) from document
        words = text_chunk.split()
        for j in range(len(words) - 2):  # Check 3-word phrases
            phrase = " ".join(words[j:j+3]).lower()
            phrase = re.sub(r'[^\w\s]', '', phrase)  # Remove punctuation
            
            if len(phrase) > 10 and phrase in response_lower:
                semantic_citations.add(doc_num)
                print(f"🎯 Semantic match found for doc {doc_num}: '{phrase[:50]}...'")
                break
    
    print(f"🧠 Found {len(semantic_citations)} semantic citations: {semantic_citations}")
    
    # Strategy 3: Fallback - if no citations found but documents were retrieved, include top relevant ones
    fallback_citations = set()
    if not explicit_citations and not semantic_citations and all_retrieved_documents:
        # Include top 2 most relevant documents as potential sources
        fallback_count = min(2, len(all_retrieved_documents))
        fallback_citations = set(range(1, fallback_count + 1))
        print(f"🔄 No citations found, using fallback for top {fallback_count} documents: {fallback_citations}")
    
    # Combine all strategies
    used_citation_numbers = explicit_citations | semantic_citations | fallback_citations
    print(f"✅ Total citations to process: {len(used_citation_numbers)} - {sorted(used_citation_numbers)}")
    
    used_citations = {}
    
    for num in sorted(used_citation_numbers):
        # Handle missing citation_map entries by creating fallback descriptions
        if num not in citation_map:
            if num <= len(all_retrieved_documents):
                doc = all_retrieved_documents[num - 1]
                metadata = doc.get("metadata", {})
                pdf_path = metadata.get("PDF Path", "Unknown Source")
                page_number = metadata.get('Page Number', 'Unknown')
                source_desc = f"{pdf_path}, Page {page_number}" if pdf_path != "Unknown Source" else f"Document {num}"
                print(f"⚠️  Created fallback citation for {num}: {source_desc}")
            else:
                print(f"❌ Skipping citation {num}: not in citation_map and no corresponding document")
                continue
        else:
            source_desc = citation_map[num]
        
        # Find the corresponding document
        doc_found = False
        for i, doc in enumerate(all_retrieved_documents):
            if i + 1 == num:  # Documents are 1-indexed in citation_map
                metadata = doc.get("metadata", {})
                pdf_path = metadata.get("PDF Path", "Unknown Source")
                page_number = metadata.get('Page Number', 'Unknown')
                text_chunk = doc.get("page_content", "")
                
                # Enhanced logging for citation processing
                print(f"📄 Processing citation {num}: {pdf_path}, Page {page_number}")
                
                # Handle different source types with improved error handling
                if pdf_path and pdf_path != "Unknown Source" and ".pdf" in pdf_path.lower():
                    try:
                        # Try to extract image with highlighted text first
                        img_path = extract_page_image_with_highlight(pdf_path, int(float(str(page_number))) - 1, text_chunk[:300])  # Use first 300 chars for highlighting
                        
                        # If highlighting fails, try to extract page without highlights
                        if not img_path:
                            img_path = extract_page_image(pdf_path, int(float(str(page_number))) - 1)
                        
                        if img_path:
                            # Upload image to S3 and get public URL
                            image_url = upload_image_to_s3(img_path, user_id)
                            
                            used_citations[num] = {
                                "source": source_desc,
                                "type": "pdf",
                                "image": image_url,  # S3 URL instead of base64
                                "text_preview": text_chunk[:200] + "..." if len(text_chunk) > 200 else text_chunk
                            }
                            print(f"✅ Successfully processed citation {num} with image")
                        else:
                            used_citations[num] = {
                                "source": source_desc,
                                "type": "pdf",
                                "image": None,
                                "text_preview": text_chunk[:200] + "..." if len(text_chunk) > 200 else text_chunk
                            }
                            print(f"⚠️  Processed citation {num} without image (image extraction failed)")
                    except Exception as e:
                        print(f"❌ Error processing citation {num}: {str(e)}")
                        used_citations[num] = {
                            "source": source_desc,
                            "type": "pdf",
                            "image": None,
                            "text_preview": text_chunk[:200] + "..." if len(text_chunk) > 200 else text_chunk
                        }
                else:
                    used_citations[num] = {
                        "source": source_desc,
                        "type": "web",
                        "image": None,
                        "text_preview": text_chunk[:200] + "..." if len(text_chunk) > 200 else text_chunk
                    }
                
                doc_found = True
                break
        
        if not doc_found:
            used_citations[num] = {
                "source": source_desc,
                "type": "unknown",
                "image": None,
                "text_preview": "Document not found"
            }
    
    print(f"🎆 Citation extraction complete! Found {len(used_citations)} total citations:")
    for num, citation in used_citations.items():
        print(f"  📝 {num}: {citation['type']} - {citation['source'][:60]}...")
    
    return used_citations