#!/usr/bin/env python3
import csv
import json
import re
from typing import List, Dict, Any

def clean_csv_and_create_json():
    """Parse CSV properly and create clean JSON"""
    csv_file_path = "/Users/pdovhomilja/development/Next.js/datahq.xmation.ai/data-sources/saas-companies/SoftwareSaaS-leadlist.csv"
    output_file_path = "/Users/pdovhomilja/development/Next.js/datahq.xmation.ai/data-sources/saas-companies/SaaS-leadlist-repaired.json"
    
    companies = []
    current_record = {}
    
    print("Parsing CSV file...")
    
    # Expected headers
    headers = [
        'Company Domain',
        'Company name', 
        'Company Type',
        'Country headquarter',
        'LinkedIn Company Page',
        'Industry LinkedIn',
        'Market',
        'Description LoneScale'
    ]
    
    with open(csv_file_path, 'r', encoding='utf-8-sig') as csvfile:
        # Read the file line by line to handle multiline fields properly
        lines = csvfile.readlines()
        
        # Find header line (should be first line)
        header_line = lines[0].strip()
        csv_headers = [h.strip() for h in header_line.split(',')]
        
        # Parse each record manually
        i = 1  # Skip header
        while i < len(lines):
            line = lines[i].strip()
            
            # Skip empty lines
            if not line:
                i += 1
                continue
                
            # Try to parse as CSV row
            try:
                # Split by comma, but handle quoted fields
                fields = []
                current_field = ""
                in_quotes = False
                quote_count = 0
                
                j = 0
                while j < len(line):
                    char = line[j]
                    
                    if char == '"':
                        quote_count += 1
                        in_quotes = not in_quotes
                        current_field += char
                    elif char == ',' and not in_quotes:
                        fields.append(current_field.strip())
                        current_field = ""
                    else:
                        current_field += char
                    j += 1
                
                # Add the last field
                if current_field:
                    fields.append(current_field.strip())
                
                # If we have 8 fields, this might be a complete record
                if len(fields) >= 8:
                    # Clean the fields
                    record = {}
                    for idx, header in enumerate(headers):
                        if idx < len(fields):
                            value = fields[idx].strip().strip('"')
                            # Clean multiline descriptions
                            if header == 'Description LoneScale':
                                value = re.sub(r'\n+', ' ', value)
                                value = re.sub(r'\s+', ' ', value)
                            record[header] = value
                    
                    # Validate record
                    domain = record.get('Company Domain', '')
                    name = record.get('Company name', '')
                    
                    # Check if this looks like a valid company record
                    if (domain and 
                        '.' in domain and 
                        not domain.startswith('-') and
                        not domain.startswith('€') and
                        not domain.startswith('More than') and
                        not domain.startswith('Thanks to') and
                        'raised with VCs' not in domain and
                        len(domain.split()) <= 3 and  # Domains shouldn't be long sentences
                        name and
                        len(name.split()) <= 10):  # Company names shouldn't be too long
                        
                        companies.append(record)
                        print(f"✓ Added: {name} ({domain})")
                    else:
                        print(f"✗ Skipped invalid record: {domain[:50]}...")
                        
                else:
                    # This might be a continuation of a multiline field
                    print(f"? Incomplete record with {len(fields)} fields: {line[:50]}...")
                    
            except Exception as e:
                print(f"Error parsing line {i}: {e}")
                print(f"Line: {line[:100]}...")
            
            i += 1
    
    print(f"\nTotal valid companies extracted: {len(companies)}")
    
    # Write to JSON file
    with open(output_file_path, 'w', encoding='utf-8') as jsonfile:
        json.dump(companies, jsonfile, indent=2, ensure_ascii=False)
    
    print(f"Repaired data saved to: {output_file_path}")
    
    # Validate the output
    print("\nValidation:")
    sample_records = companies[:3] if len(companies) >= 3 else companies
    for i, record in enumerate(sample_records):
        print(f"Sample {i+1}:")
        print(f"  Domain: {record.get('Company Domain')}")
        print(f"  Name: {record.get('Company name')}")
        print(f"  Country: {record.get('Country headquarter')}")
    
    return companies

def alternative_repair_from_json():
    """Alternative approach: clean the existing JSON by removing invalid records"""
    json_file_path = "/Users/pdovhomilja/development/Next.js/datahq.xmation.ai/data-sources/saas-companies/SoftwareSaaS-leadlist.json"
    output_file_path = "/Users/pdovhomilja/development/Next.js/datahq.xmation.ai/data-sources/saas-companies/SaaS-leadlist-repaired-alt.json"
    
    with open(json_file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print(f"Original JSON records: {len(data)}")
    
    # Filter out invalid records
    valid_records = []
    for record in data:
        domain = record.get('Company Domain', '')
        name = record.get('Company name', '')
        
        # Check if this looks like a valid company record
        if (domain and 
            '.' in domain and 
            not domain.startswith('-') and
            not domain.startswith('€') and
            not domain.startswith('More than') and
            not domain.startswith('Thanks to') and
            'raised with VCs' not in domain and
            len(domain.split()) <= 3 and  # Domains shouldn't be long sentences
            name and
            len(name.split()) <= 10):  # Company names shouldn't be too long
            
            valid_records.append(record)
    
    print(f"Valid records after filtering: {len(valid_records)}")
    
    # Write cleaned JSON
    with open(output_file_path, 'w', encoding='utf-8') as f:
        json.dump(valid_records, f, indent=2, ensure_ascii=False)
    
    print(f"Cleaned data saved to: {output_file_path}")
    return valid_records

if __name__ == "__main__":
    print("=== Repairing SaaS Lead List Data ===\n")
    
    print("Method 1: Parsing CSV properly...")
    try:
        csv_companies = clean_csv_and_create_json()
        print(f"CSV method result: {len(csv_companies)} companies")
    except Exception as e:
        print(f"CSV method failed: {e}")
        csv_companies = []
    
    print("\nMethod 2: Cleaning existing JSON...")
    try:
        json_companies = alternative_repair_from_json()
        print(f"JSON cleaning method result: {len(json_companies)} companies")
    except Exception as e:
        print(f"JSON cleaning method failed: {e}")
        json_companies = []
    
    # Use the method that gave better results
    if len(csv_companies) > len(json_companies):
        print(f"\nUsing CSV parsing result ({len(csv_companies)} companies)")
        final_output = "/Users/pdovhomilja/development/Next.js/datahq.xmation.ai/data-sources/saas-companies/SaaS-leadlist-repaired.json"
    elif len(json_companies) > 0:
        print(f"\nUsing JSON cleaning result ({len(json_companies)} companies)")
        # Copy the alternative file to the main output
        import shutil
        shutil.copy(
            "/Users/pdovhomilja/development/Next.js/datahq.xmation.ai/data-sources/saas-companies/SaaS-leadlist-repaired-alt.json",
            "/Users/pdovhomilja/development/Next.js/datahq.xmation.ai/data-sources/saas-companies/SaaS-leadlist-repaired.json"
        )
        print("Final repaired file: SaaS-leadlist-repaired.json")
    else:
        print("Both methods failed!")