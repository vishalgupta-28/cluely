import requests
import os
import uuid
import time  # Add time module for timing measurements
from io import BytesIO

# Add dotenv support to load from .env file
try:
    from dotenv import load_dotenv
    # Load environment variables from .env file
    load_dotenv()
    print("Loaded environment variables from .env file")
except ImportError:
    print("python-dotenv package not installed. If you're using a .env file, install it with: pip install python-dotenv")

# --- Best Practice: Load Secret Key from Environment Variable ---
# Make sure you set the SECRET_KEY environment variable in the
# environment where you run this Python script.
# It should be the SAME value as process.env.SECRET_KEY in your Next.js app.
API_SECRET_KEY = os.environ.get("SECRET_KEY")

if not API_SECRET_KEY:
    print("Error: SECRET_KEY environment variable is not set.")
    print("Please set the SECRET_KEY environment variable before running this script.")
    exit(1) # Exit if the key is essential and not found
# -------------------------------------------------------------

def download_pdf(url, output_path=None, headers=None):
    """
    Download PDF from the given URL using provided headers and save it
    to the specified path or return the BytesIO object if no path is provided.

    Args:
        url (str): URL to download the PDF from
        output_path (str, optional): Path where the PDF will be saved
        headers (dict, optional): Dictionary of HTTP Headers to send with the request

    Returns:
        BytesIO or bool: BytesIO object with PDF content if output_path is None,
                         True if download and save successful, False otherwise
    """
    start_time = time.time()  # Start overall timing
    try:
        # Send GET request to the URL, including any provided headers
        print(f"Requesting URL: {url} with headers: {headers}")
        request_start_time = time.time()  # Start request timing
        response = requests.get(url, headers=headers)
        request_end_time = time.time()  # End request timing
        request_time = request_end_time - request_start_time
        print(f"Request completed in {request_time:.2f} seconds")

        # Check if request was successful
        if response.status_code == 401:
            print(f"Failed to download PDF. Status code: {response.status_code} (Unauthorized)")
            print("Check if the SECRET_KEY provided matches the server's expected key.")
            return False
        elif response.status_code != 200:
            print(f"Failed to download PDF. Status code: {response.status_code}")
            print(f"Response body: {response.text[:500]}") # Print some of the response body for clues
            return False

        # Check content type - expecting application/pdf
        content_type = response.headers.get('content-type', '').lower()
        if 'application/pdf' not in content_type:
            print(f"Warning: Expected Content-Type 'application/pdf' but received '{content_type}'. Proceeding anyway.")

        # Convert response content to BytesIO object
        processing_start_time = time.time()  # Start processing timing
        pdf_content = BytesIO(response.content)

        # Basic validation - check if file starts with PDF signature '%PDF-'
        pdf_content.seek(0) # Rewind the stream to read from the beginning
        header = pdf_content.read(5)
        pdf_content.seek(0) # Rewind again so the full content is available later
        try:
            decoded_header = header.decode('utf-8', errors='ignore')
            if not decoded_header.startswith('%PDF-'):
                print("Invalid PDF structure: File doesn't have a proper PDF header")
                print("Received header bytes:", header)
                return False
        except Exception as decode_err:
            print(f"Could not decode header bytes: {header}. Error: {decode_err}")
            return False

        # If no output path is provided, return the BytesIO object
        if output_path is None:
            end_time = time.time()  # End overall timing
            total_time = end_time - start_time
            print(f"PDF content fetched successfully into BytesIO object in {total_time:.2f} seconds.")
            return pdf_content

        # Create directory if it doesn't exist
        output_dir = os.path.dirname(output_path)
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir)

        # Save the file
        save_start_time = time.time()  # Start save timing
        with open(output_path, 'wb') as f:
            f.write(pdf_content.getbuffer())
        save_end_time = time.time()  # End save timing
        save_time = save_end_time - save_start_time
        
        end_time = time.time()  # End overall timing
        total_time = end_time - start_time
        processing_time = processing_start_time - request_end_time
        
        print(f"PDF successfully downloaded and validated to {output_path}")
        print(f"Time breakdown:")
        print(f"  - Network request: {request_time:.2f} seconds")
        print(f"  - Processing:      {processing_time:.2f} seconds")
        print(f"  - Saving to file:  {save_time:.2f} seconds")
        print(f"  - Total time:      {total_time:.2f} seconds")
        return True

    except requests.exceptions.RequestException as e:
        end_time = time.time()
        print(f"A network error occurred: {str(e)}")
        print(f"Failed after {end_time - start_time:.2f} seconds")
        return False
    except Exception as e:
        end_time = time.time()
        print(f"An unexpected error occurred: {str(e)}")
        print(f"Failed after {end_time - start_time:.2f} seconds")
        return False

if __name__ == "__main__":
    # Start main execution timing
    main_start_time = time.time()
    
    # Use the direct PDF API endpoint instead of the HTML page
    base_url = "http://localhost:3000" # Change if your Next.js app runs elsewhere
    doc_id = "053818d5-1034-4536-8770-52122f0d4396" # Example Doc ID
    pdf_url = f"http://localhost:3000/api/documents/c681ba9a-6a50-4832-8554-100369208b28/view"

    # Create temp directory if it doesn't exist
    os.makedirs('temp', exist_ok=True)

    # Generate a valid filename
    temp_pdf_path = os.path.join('temp', f'{str(uuid.uuid1())}.pdf')

    # --- Prepare the headers ---
    request_headers = {
        'x-api-key': API_SECRET_KEY
    }
    # --------------------------

    try:
        # Use the download_pdf function, passing the headers
        result = download_pdf(pdf_url, temp_pdf_path, headers=request_headers)

        if result:
            print(f"Download function reported success. File saved to {temp_pdf_path}")
        else:
            print("Failed to download the PDF.")
            if os.path.exists(temp_pdf_path):
                try:
                    if os.path.getsize(temp_pdf_path) < 10: # Arbitrary small size check
                        print(f"Cleaning up potentially invalid/empty file: {temp_pdf_path}")
                        os.remove(temp_pdf_path)
                except OSError as e:
                    print(f"Error removing file {temp_pdf_path}: {e}")

        main_end_time = time.time()
        print(f"Total script execution time: {main_end_time - main_start_time:.2f} seconds")

    except Exception as e:
        main_end_time = time.time()
        print(f"Error processing PDF in main block: {str(e)}")
        print(f"Script failed after {main_end_time - main_start_time:.2f} seconds")