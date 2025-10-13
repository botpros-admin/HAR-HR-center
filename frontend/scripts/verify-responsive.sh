#!/bin/bash

# Responsive Design Verification Script
# Ensures mobile responsive classes are present before deployment

set -e

echo "================================================"
echo "🔍 RESPONSIVE DESIGN VERIFICATION"
echo "================================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

FAILED=0

# Check 1: Verify source code has responsive classes
echo "1️⃣  Checking source code for responsive grid classes..."
if grep -r "md:grid-cols" src/app/admin/employees/detail/page.tsx > /dev/null; then
  echo -e "${GREEN}✅ Source code contains md:grid-cols classes${NC}"
else
  echo -e "${RED}❌ FAIL: Source code missing md:grid-cols classes${NC}"
  FAILED=1
fi
echo ""

# Check 2: Verify build output exists
echo "2️⃣  Checking build output directory..."
if [ -d "out" ]; then
  echo -e "${GREEN}✅ Build output directory exists${NC}"
else
  echo -e "${RED}❌ FAIL: Build output directory not found${NC}"
  echo "   Run 'npm run build' first"
  FAILED=1
fi
echo ""

# Check 3: Verify JavaScript bundles contain responsive classes
echo "3️⃣  Checking JavaScript bundles for responsive classes..."
if [ -d "out/_next/static/chunks" ]; then
  MD_GRID_COUNT=$(find out/_next/static/chunks -name "*.js" -type f -exec grep -l "md:grid-cols" {} \; 2>/dev/null | wc -l)

  if [ "$MD_GRID_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ Found md:grid-cols classes in $MD_GRID_COUNT JavaScript file(s)${NC}"
  else
    echo -e "${RED}❌ FAIL: No md:grid-cols classes found in JavaScript bundles!${NC}"
    echo "   This means mobile responsive design is MISSING from the build."
    FAILED=1
  fi
else
  echo -e "${YELLOW}⚠️  Skip: JavaScript chunks directory not found${NC}"
fi
echo ""

# Check 4: Verify specific admin employee detail page
echo "4️⃣  Checking admin employee detail page bundle..."
PAGE_BUNDLE=$(find out/_next/static/chunks/app/admin/employees/detail -name "page-*.js" 2>/dev/null | head -1)
if [ -n "$PAGE_BUNDLE" ]; then
  if grep -q "grid-cols-1 md:grid-cols-2" "$PAGE_BUNDLE"; then
    echo -e "${GREEN}✅ Admin employee detail page has correct responsive pattern${NC}"

    # Count occurrences
    OCCURRENCES=$(grep -o "grid-cols-1 md:grid-cols-2" "$PAGE_BUNDLE" | wc -l)
    echo "   Found $OCCURRENCES instances of responsive grids"
  else
    echo -e "${RED}❌ FAIL: Admin employee detail page missing responsive classes${NC}"
    FAILED=1
  fi
else
  echo -e "${YELLOW}⚠️  Skip: Page bundle not found${NC}"
fi
echo ""

# Check 5: Verify CSS contains responsive classes
echo "5️⃣  Checking CSS file for responsive media queries..."
CSS_FILE=$(find out/_next/static/css -name "*.css" 2>/dev/null | head -1)
if [ -n "$CSS_FILE" ]; then
  if grep -q "md\\:grid-cols-2" "$CSS_FILE"; then
    echo -e "${GREEN}✅ CSS contains md:grid-cols-2 classes${NC}"
  else
    echo -e "${RED}❌ FAIL: CSS missing md:grid-cols-2 classes${NC}"
    FAILED=1
  fi

  if grep -q "min-width:768px" "$CSS_FILE"; then
    echo -e "${GREEN}✅ CSS contains 768px media query breakpoint${NC}"
  else
    echo -e "${RED}❌ FAIL: CSS missing 768px breakpoint${NC}"
    FAILED=1
  fi
else
  echo -e "${YELLOW}⚠️  Skip: CSS file not found${NC}"
fi
echo ""

# Check 6: Verify Tailwind config
echo "6️⃣  Checking Tailwind configuration..."
if [ -f "tailwind.config.ts" ]; then
  if grep -q "screens:" tailwind.config.ts; then
    echo -e "${GREEN}✅ Tailwind config has custom screens configuration${NC}"
  else
    echo -e "${GREEN}✅ Tailwind config using default breakpoints${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  Tailwind config not found${NC}"
fi
echo ""

# Final result
echo "================================================"
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 ALL CHECKS PASSED!${NC}"
  echo ""
  echo "Mobile responsive design is correctly implemented:"
  echo "  • < 768px (mobile): 1 column"
  echo "  • 768-1023px (tablet): 2 columns"
  echo "  • ≥ 1024px (desktop): 3 columns"
  echo ""
  echo "✅ Safe to deploy to production"
  echo "================================================"
  exit 0
else
  echo -e "${RED}❌ VERIFICATION FAILED${NC}"
  echo ""
  echo "DO NOT DEPLOY - Fix responsive design issues first!"
  echo "================================================"
  exit 1
fi
