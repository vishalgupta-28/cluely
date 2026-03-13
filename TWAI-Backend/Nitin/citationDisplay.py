def extract_used_citations(response, citation_map, all_retrieved_documents):

    print("------------------------------------------------------------------------------------------------------------------")
    print("------------------------------------------------------------------------------------------------------------------")

    print(response)
    print(citation_map)
    print(all_retrieved_documents)

    print("------------------------------------------------------------------------------------------------------------------")
    print("------------------------------------------------------------------------------------------------------------------")
    """
    Extract citation numbers from response and return only used citations.
    
    Args:
        response: The text response containing citations in [x] format
        citation_map: Dictionary mapping citation numbers to source descriptions
        all_retrieved_documents: List of document dictionaries with PDF paths and page numbers
        
    Returns:
        Dictionary of used citations with their descriptions and image data
    """
    print("\n\n\n\n\nExtracting citation numbers from response...")
    used_citation_numbers = set(map(int, re.findall(r"\[(?:[^\]]*?(\d+)[^\]]*?)\]", response)))
    print("Extracted citation numbers:", used_citation_numbers)
    
    used_citations = {}
    # processed_pages = set()  # Track already processed PDF pages
    for num in sorted(used_citation_numbers):
        print(f"Processing citation number: {num}")
        
        if num not in citation_map:
            print(f"Citation number {num} not found in citation_map, skipping...")
            continue
        
        source_desc = citation_map[num]
        print(f"Source description: {source_desc}")


        
        
        # Handle PDF citations
        if (".pdf" in source_desc.lower() and "amazonaws" in source_desc.lower()):
            text_chunk = None
            pdf_found = False
            match = re.search(r"(https?://\S+\.pdf),\s*Page\s*([\d\.]+)", source_desc)
            source_desc_pdf_path = None
            source_desc_page_number = None
            if match:
                source_desc_pdf_path = match.group(1)  # Extract PDF path
                source_desc_page_number = int(float(match.group(2)))  # Convert page number to an integer
            else:
                print("No match found.")
            
            for doc in all_retrieved_documents:
                metadata = doc.get("metadata", {})
                pdf_path = metadata.get("PDF Path", "Unknown Source")
                page_number = int(metadata.get('Page Number', 'Unknown'))
                if source_desc_pdf_path and source_desc_page_number:
                    if pdf_path == source_desc_pdf_path and page_number == source_desc_page_number:
                        pass
                    else:
                        continue
                
                print(f"Checking document: PDF Path = {pdf_path}, Page Number = {page_number}")
                
                if not pdf_path:
                    print("Skipping document as PDF Path is missing.")
                    continue
                    
                # Create a unique ID for this page
                page_id = (pdf_path, page_number)
                # if page_id in processed_pages:
                #     print(f"Page {page_number} of {pdf_path} already processed, skipping...")
                #     continue
                
                # For S3 URLs, extract the filename/UUID part for matching
                pdf_identifier = pdf_path
                if pdf_path.startswith('http'):
                    pdf_identifier = pdf_path.split('/')[-1]  # Get the UUID.pdf part
                
                # Check if the PDF path or its identifier is in the source description
                if pdf_path in source_desc or pdf_identifier in source_desc:
                    print(f"Matching PDF found for citation {num}.")
                    
                    # processed_pages.add(page_id)
                    text_chunk = doc.get("page_content", "")
                    
                    # Try to extract image with highlighted text
                    if text_chunk!="":
                        print("Extracting highlighted image...")
                        img_path = extract_page_image_with_highlight(pdf_path, page_number, text_chunk)
                        if img_path:
                            print(f"Image extracted successfully: {img_path}")
                            base64_image = encode_image_to_base64(img_path)
                            used_citations[num] = {
                                "description": source_desc,
                                "isimg": True,
                                "image_data": base64_image
                            }
                        else:
                            print("Highlight extraction failed, extracting plain image...")
                            img_path = extract_page_image(pdf_path, page_number)
                            base64_image = encode_image_to_base64(img_path)
                            used_citations[num] = {
                                "description": source_desc,
                                "isimg": True,
                                "image_data": base64_image
                            }
                    else:
                        print("No text chunk found, extracting plain image...")
                        img_path = extract_page_image(pdf_path, page_number)
                        base64_image = encode_image_to_base64(img_path)
                        used_citations[num] = {
                            "description": source_desc,
                            "isimg": True,
                            "image_data": base64_image
                        }
                    
                    pdf_found = True
                    break
            
            if not pdf_found:
                print(f"No matching document found for citation {num}, adding fallback entry.")
                used_citations[num] = {
                    "description": source_desc,
                    "isimg": False,
                    "image_data": None
                }
                
        # Handle non-PDF citations (URLs/other sources)
        else:
            print(f"Citation {num} is not a PDF, storing as text-only reference.")
            used_citations[num] = {
                "description": source_desc,
                "isimg": False,
                "image_data": None
            }
    
    # print("Final extracted citations:", used_citations)
    return used_citations