#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_BASE="http://localhost:3000/api/v1"

# Generate random IDs
PATIENT_ID="P$(shuf -i 1000-9999 -n 1)"
PATIENT_ID_2="P$(shuf -i 1000-9999 -n 1)"
DOCTOR_ID="D$(shuf -i 1000-9999 -n 1)"

echo "🧪 HEALTHCARE BLOCKCHAIN API TESTS"
echo "===================================="
echo "🆔 Generated IDs:"
echo "   Patient 1: $PATIENT_ID"
echo "   Patient 2: $PATIENT_ID_2"
echo "   Doctor:    $DOCTOR_ID"
echo ""

# Test 1: Register Patient
echo "📝 TEST 1: Register Patient $PATIENT_ID"
curl -X POST "$API_BASE/patients/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"patientID\": \"$PATIENT_ID\",
    \"name\": \"John Doe\",
    \"dateOfBirth\": \"1990-01-15\",
    \"phone\": \"5551234567\",
    \"aadharNumber\": \"123456789012\",
    \"fingerprintTemplateID\": 101
  }" | jq .
echo ""
echo "⏳ Waiting 3 seconds..."
sleep 3

# Test 2: Get Patient
echo "🔍 TEST 2: Get Patient $PATIENT_ID"
curl -X GET "$API_BASE/patients/$PATIENT_ID" | jq .
echo ""
sleep 2

# Test 3: Register Doctor
echo "📝 TEST 3: Register Doctor $DOCTOR_ID"
curl -X POST "$API_BASE/doctors/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"doctorID\": \"$DOCTOR_ID\",
    \"name\": \"Dr. Sarah Smith\",
    \"licenseNumber\": \"LIC123456\",
    \"specialization\": \"Cardiology\",
    \"hospitalName\": \"Apollo Hospital\"
  }" | jq .
echo ""
echo "⏳ Waiting 3 seconds..."
sleep 3

# Test 4: Get Doctor
echo "🔍 TEST 4: Get Doctor $DOCTOR_ID"
curl -X GET "$API_BASE/doctors/$DOCTOR_ID" | jq .
echo ""
sleep 2

# Test 5: Verify Doctor (HealthRegistry)
echo "📝 TEST 5: Verify Doctor $DOCTOR_ID (as HealthRegistry)"
curl -X POST "$API_BASE/doctors/$DOCTOR_ID/verify" | jq .
echo ""
echo "⏳ Waiting 3 seconds..."
sleep 3

# Test 6: Get Doctor Again (Check Verification)
echo "🔍 TEST 6: Get Doctor $DOCTOR_ID (Should be verified now)"
curl -X GET "$API_BASE/doctors/$DOCTOR_ID" | jq .
echo ""
sleep 2

# Test 7: Grant Access
echo "📝 TEST 7: Grant Access to Doctor"
ACCESS_RESPONSE=$(curl -s -X POST "$API_BASE/access/grant" \
  -H "Content-Type: application/json" \
  -d "{
    \"patientID\": \"$PATIENT_ID\",
    \"doctorID\": \"$DOCTOR_ID\",
    \"durationHours\": 24,
    \"purpose\": \"Annual health checkup\"
  }")
echo "$ACCESS_RESPONSE" | jq .
ACCESS_KEY=$(echo "$ACCESS_RESPONSE" | jq -r '.data.accessKey // empty')
echo ""
echo "⏳ Waiting 3 seconds..."
sleep 3

# Test 8: Check Access Validity
if [ -n "$ACCESS_KEY" ]; then
    echo "🔍 TEST 8: Check Access Validity"
    curl -X GET "$API_BASE/access/$ACCESS_KEY/validity" | jq .
    echo ""
    sleep 2
else
    echo -e "${YELLOW}⚠️  Skipping TEST 8: No access key generated${NC}"
    echo ""
fi

# Test 9: Get Patient Active Accesses
echo "🔍 TEST 9: Get Patient Active Accesses"
curl -X GET "$API_BASE/patients/$PATIENT_ID/accesses" | jq .
echo ""
sleep 2

# Test 10: Get Patient Audit Trail
echo "🔍 TEST 10: Get Patient Audit Trail"
curl -X GET "$API_BASE/patients/$PATIENT_ID/audit" | jq .
echo ""
sleep 2

# Test 11: Register Second Patient
echo "📝 TEST 11: Register Patient $PATIENT_ID_2"
curl -X POST "$API_BASE/patients/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"patientID\": \"$PATIENT_ID_2\",
    \"name\": \"Jane Smith\",
    \"dateOfBirth\": \"1985-05-20\",
    \"phone\": \"5559876543\",
    \"aadharNumber\": \"987654321098\",
    \"fingerprintTemplateID\": 102
  }" | jq .
echo ""
echo "⏳ Waiting 3 seconds..."
sleep 3

# Test 12: Revoke Access
if [ -n "$ACCESS_KEY" ]; then
    echo "📝 TEST 12: Revoke Access"
    curl -X DELETE "$API_BASE/access/$ACCESS_KEY" | jq .
    echo ""
else
    echo -e "${YELLOW}⚠️  Skipping TEST 12: No access key to revoke${NC}"
    echo ""
fi

echo ""
echo -e "${GREEN}✅ ALL TESTS COMPLETED!${NC}"
echo "===================================="
echo ""
echo "📊 Test Summary:"
echo "   Patient 1: $PATIENT_ID"
echo "   Patient 2: $PATIENT_ID_2"
echo "   Doctor:    $DOCTOR_ID"
if [ -n "$ACCESS_KEY" ]; then
    echo "   Access Key: $ACCESS_KEY"
fi
echo ""
