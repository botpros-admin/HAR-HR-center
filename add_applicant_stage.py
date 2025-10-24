#!/usr/bin/env python3
"""
Add a new stage to Applicants pipeline via Bitrix24 API
This bypasses the broken tunnel UI
"""

import requests
import sys

webhook = "https://hartzell.app/rest/1/jp689g5yfvre9pvd"

def add_stage(name, sort_order, color='#47A447'):
    """
    Add a new stage to the Applicants pipeline

    Args:
        name: Stage name (e.g., "Phone Screen")
        sort_order: Position (10, 20, 30, etc.)
        color: Hex color code (default: green)
    """

    # Generate a unique status code based on name
    status_code = name.upper().replace(' ', '_')[:10]

    resp = requests.post(f"{webhook}/crm.status.add", data={
        'fields[ENTITY_ID]': 'DYNAMIC_1054_STAGE_18',
        'fields[STATUS_ID]': f'DT1054_18:UC_{status_code}',
        'fields[NAME]': name,
        'fields[SORT]': sort_order,
        'fields[COLOR]': color,
    })

    result = resp.json()

    if result.get('result'):
        print(f"✅ Added stage: '{name}' (Sort: {sort_order})")
        print(f"   Status ID: DT1054_18:UC_{status_code}")
        return True
    else:
        error = result.get('error_description', result.get('error', 'Unknown'))
        print(f"❌ Failed: {error}")
        return False

if __name__ == '__main__':
    print("🔧 Add Stage to Applicants Pipeline")
    print("=" * 60)
    print("\nCurrent stages:")
    print("  20. Under Review")
    print("  30. Interview Scheduled")
    print("  40. Offer")
    print("  50. Reject")
    print("\n" + "=" * 60)

    # Example: Add "Phone Screen" stage between Under Review (20) and Interview Scheduled (30)
    # Uncomment and modify as needed:

    # add_stage("Phone Screen", 25, '#2FC6F6')  # Blue
    # add_stage("Background Check", 35, '#F7931E')  # Orange

    print("\n💡 Edit this file to add stages programmatically")
    print("   Avoids the broken tunnel UI completely!")
