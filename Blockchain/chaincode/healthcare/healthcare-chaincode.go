package main

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// HealthcareContract provides functions for managing healthcare access
type HealthcareContract struct {
	contractapi.Contract
}

// Patient represents a registered patient
type Patient struct {
	PatientID             string `json:"patientID"`
	Name                  string `json:"name"`
	DateOfBirth           string `json:"dateOfBirth"`
	Phone                 string `json:"phone"`
	AadharNumber          string `json:"aadharNumber"`
	FingerprintTemplateID int    `json:"fingerprintTemplateID"`
	RegisteredAt          int64  `json:"registeredAt"`
	RegisteredByOrg       string `json:"registeredByOrg"`
}

// Doctor represents a registered doctor
type Doctor struct {
	DoctorID        string `json:"doctorID"`
	Name            string `json:"name"`
	LicenseNumber   string `json:"licenseNumber"`
	Specialization  string `json:"specialization"`
	HospitalName    string `json:"hospitalName"`
	Verified        bool   `json:"verified"`
	RegisteredAt    int64  `json:"registeredAt"`
	RegisteredByOrg string `json:"registeredByOrg"`
}

// AccessRecord represents a time-bound access grant
type AccessRecord struct {
	AccessKey     string `json:"accessKey"`
	PatientID     string `json:"patientID"`
	DoctorID      string `json:"doctorID"`
	GrantedAt     int64  `json:"grantedAt"`
	ExpiryTime    int64  `json:"expiryTime"`
	DurationHours int    `json:"durationHours"`
	Purpose       string `json:"purpose"`
	Revoked       bool   `json:"revoked"`
	RevokedAt     int64  `json:"revokedAt"`
	GrantedByOrg  string `json:"grantedByOrg"`
}

// AuditLog represents an audit trail entry
type AuditLog struct {
	LogID     string `json:"logID"`
	PatientID string `json:"patientID"`
	DoctorID  string `json:"doctorID"`
	Action    string `json:"action"`
	Details   string `json:"details"`
	Timestamp int64  `json:"timestamp"`
	OrgMSP    string `json:"orgMSP"`
	TxID      string `json:"txID"`
}

// ============================================================================
// PATIENT MANAGEMENT
// ============================================================================

// RegisterPatient registers a new patient on the blockchain
func (hc *HealthcareContract) RegisterPatient(ctx contractapi.TransactionContextInterface,
	patientID string, name string, dob string, phone string, aadhar string,
	fingerprintTemplateID int) error {

	// Validate inputs
	if len(patientID) == 0 || len(name) == 0 || len(aadhar) != 12 {
		return fmt.Errorf("invalid patient details")
	}

	// Check if patient already exists
	patientKey := fmt.Sprintf("patient:%s", patientID)
	existingPatient, _ := ctx.GetStub().GetState(patientKey)
	if existingPatient != nil {
		return fmt.Errorf("patient %s already registered", patientID)
	}

	// Get caller organization
	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("failed to get MSP ID: %v", err)
	}

	// Create patient record
	timestamp, _ := ctx.GetStub().GetTxTimestamp()
	patient := Patient{
		PatientID:             patientID,
		Name:                  name,
		DateOfBirth:           dob,
		Phone:                 phone,
		AadharNumber:          aadhar,
		FingerprintTemplateID: fingerprintTemplateID,
		RegisteredAt:          timestamp.Seconds,
		RegisteredByOrg:       mspID,
	}

	patientBytes, _ := json.Marshal(patient)
	err = ctx.GetStub().PutState(patientKey, patientBytes)
	if err != nil {
		return fmt.Errorf("failed to register patient: %v", err)
	}

	// Create audit log
	hc.createAuditLog(ctx, patientID, "", "REGISTER_PATIENT", fmt.Sprintf("Patient registered by %s", mspID))

	// Emit event
	ctx.GetStub().SetEvent("PatientRegistered", []byte(patientID))
	return nil
}

// GetPatient retrieves patient details
func (hc *HealthcareContract) GetPatient(ctx contractapi.TransactionContextInterface,
	patientID string) (*Patient, error) {

	patientKey := fmt.Sprintf("patient:%s", patientID)
	patientBytes, err := ctx.GetStub().GetState(patientKey)
	if err != nil {
		return nil, fmt.Errorf("failed to read patient: %v", err)
	}
	if patientBytes == nil {
		return nil, fmt.Errorf("patient %s does not exist", patientID)
	}

	var patient Patient
	err = json.Unmarshal(patientBytes, &patient)
	if err != nil {
		return nil, err
	}

	return &patient, nil
}

// ============================================================================
// DOCTOR MANAGEMENT
// ============================================================================

// RegisterDoctor registers a new doctor on the blockchain
func (hc *HealthcareContract) RegisterDoctor(ctx contractapi.TransactionContextInterface,
	doctorID string, name string, licenseNumber string, specialization string,
	hospitalName string) error {

	if len(doctorID) == 0 || len(name) == 0 || len(licenseNumber) == 0 {
		return fmt.Errorf("invalid doctor details")
	}

	doctorKey := fmt.Sprintf("doctor:%s", doctorID)
	existingDoctor, _ := ctx.GetStub().GetState(doctorKey)
	if existingDoctor != nil {
		return fmt.Errorf("doctor %s already registered", doctorID)
	}

	mspID, _ := ctx.GetClientIdentity().GetMSPID()
	timestamp, _ := ctx.GetStub().GetTxTimestamp()

	doctor := Doctor{
		DoctorID:        doctorID,
		Name:            name,
		LicenseNumber:   licenseNumber,
		Specialization:  specialization,
		HospitalName:    hospitalName,
		Verified:        false,
		RegisteredAt:    timestamp.Seconds,
		RegisteredByOrg: mspID,
	}

	doctorBytes, _ := json.Marshal(doctor)
	err := ctx.GetStub().PutState(doctorKey, doctorBytes)
	if err != nil {
		return fmt.Errorf("failed to register doctor: %v", err)
	}

	hc.createAuditLog(ctx, "", doctorID, "REGISTER_DOCTOR", fmt.Sprintf("Doctor registered by %s", mspID))

	ctx.GetStub().SetEvent("DoctorRegistered", []byte(doctorID))
	return nil
}

// VerifyDoctor verifies a doctor (only HealthRegistryMSP can do this)
func (hc *HealthcareContract) VerifyDoctor(ctx contractapi.TransactionContextInterface,
	doctorID string) error {

	mspID, _ := ctx.GetClientIdentity().GetMSPID()
	if mspID != "AuditOrgMSP" {
		return fmt.Errorf("only AuditOrg can verify doctors")
	}

	doctor, err := hc.GetDoctor(ctx, doctorID)
	if err != nil {
		return err
	}

	doctor.Verified = true

	doctorBytes, _ := json.Marshal(doctor)
	doctorKey := fmt.Sprintf("doctor:%s", doctorID)
	err = ctx.GetStub().PutState(doctorKey, doctorBytes)
	if err != nil {
		return err
	}

	hc.createAuditLog(ctx, "", doctorID, "VERIFY_DOCTOR", "Doctor verified by AuditOrg")

	ctx.GetStub().SetEvent("DoctorVerified", []byte(doctorID))
	return nil
}

// GetDoctor retrieves doctor details
func (hc *HealthcareContract) GetDoctor(ctx contractapi.TransactionContextInterface,
	doctorID string) (*Doctor, error) {

	doctorKey := fmt.Sprintf("doctor:%s", doctorID)
	doctorBytes, err := ctx.GetStub().GetState(doctorKey)
	if err != nil {
		return nil, fmt.Errorf("failed to read doctor: %v", err)
	}
	if doctorBytes == nil {
		return nil, fmt.Errorf("doctor %s does not exist", doctorID)
	}

	var doctor Doctor
	err = json.Unmarshal(doctorBytes, &doctor)
	if err != nil {
		return nil, err
	}

	return &doctor, nil
}

// ============================================================================
// ACCESS CONTROL
// ============================================================================

// GrantAccess grants time-bound access to a doctor
func (hc *HealthcareContract) GrantAccess(ctx contractapi.TransactionContextInterface,
	patientID string, doctorID string, durationHours int, purpose string) (string, error) {

	// Verify patient exists
	_, err := hc.GetPatient(ctx, patientID)
	if err != nil {
		return "", err
	}

	// Verify doctor exists and is verified
	doctor, err := hc.GetDoctor(ctx, doctorID)
	if err != nil {
		return "", err
	}
	if !doctor.Verified {
		return "", fmt.Errorf("doctor %s is not verified", doctorID)
	}

	// Create access record
	timestamp, _ := ctx.GetStub().GetTxTimestamp()
	currentTime := timestamp.Seconds
	accessKey := fmt.Sprintf("access:%s:%s:%d", patientID, doctorID, currentTime)
	expiryTime := currentTime + int64(durationHours*3600)

	mspID, _ := ctx.GetClientIdentity().GetMSPID()

	accessRecord := AccessRecord{
		AccessKey:     accessKey,
		PatientID:     patientID,
		DoctorID:      doctorID,
		GrantedAt:     currentTime,
		ExpiryTime:    expiryTime,
		DurationHours: durationHours,
		Purpose:       purpose,
		Revoked:       false,
		GrantedByOrg:  mspID,
	}

	accessBytes, _ := json.Marshal(accessRecord)
	err = ctx.GetStub().PutState(accessKey, accessBytes)
	if err != nil {
		return "", fmt.Errorf("failed to grant access: %v", err)
	}

	hc.createAuditLog(ctx, patientID, doctorID, "GRANT_ACCESS", fmt.Sprintf("Access granted for %d hours: %s", durationHours, purpose))

	ctx.GetStub().SetEvent("AccessGranted", []byte(accessKey))

	return accessKey, nil
}

// RevokeAccess revokes an access grant
func (hc *HealthcareContract) RevokeAccess(ctx contractapi.TransactionContextInterface,
	accessKey string) error {

	accessBytes, err := ctx.GetStub().GetState(accessKey)
	if err != nil || accessBytes == nil {
		return fmt.Errorf("access key %s not found", accessKey)
	}

	var accessRecord AccessRecord
	err = json.Unmarshal(accessBytes, &accessRecord)
	if err != nil {
		return err
	}

	if accessRecord.Revoked {
		return fmt.Errorf("access already revoked")
	}

	timestamp, _ := ctx.GetStub().GetTxTimestamp()
	accessRecord.Revoked = true
	accessRecord.RevokedAt = timestamp.Seconds

	accessBytes, _ = json.Marshal(accessRecord)
	err = ctx.GetStub().PutState(accessKey, accessBytes)
	if err != nil {
		return err
	}

	hc.createAuditLog(ctx, accessRecord.PatientID, accessRecord.DoctorID, "REVOKE_ACCESS", "Access manually revoked")

	ctx.GetStub().SetEvent("AccessRevoked", []byte(accessKey))
	return nil
}

// CheckAccessValidity checks if an access grant is still valid
func (hc *HealthcareContract) CheckAccessValidity(ctx contractapi.TransactionContextInterface,
	accessKey string) (map[string]interface{}, error) {

	accessBytes, err := ctx.GetStub().GetState(accessKey)
	if err != nil || accessBytes == nil {
		return map[string]interface{}{
			"valid":  false,
			"reason": "Access key not found",
		}, nil
	}

	var accessRecord AccessRecord
	err = json.Unmarshal(accessBytes, &accessRecord)
	if err != nil {
		return nil, err
	}

	timestamp, _ := ctx.GetStub().GetTxTimestamp()
	currentTime := timestamp.Seconds

	if accessRecord.Revoked {
		return map[string]interface{}{
			"valid":     false,
			"reason":    "Access revoked",
			"revokedAt": accessRecord.RevokedAt,
		}, nil
	}

	if currentTime > accessRecord.ExpiryTime {
		return map[string]interface{}{
			"valid":     false,
			"reason":    "Access expired",
			"expiredAt": accessRecord.ExpiryTime,
		}, nil
	}

	return map[string]interface{}{
		"valid":      true,
		"patientID":  accessRecord.PatientID,
		"doctorID":   accessRecord.DoctorID,
		"expiresIn":  accessRecord.ExpiryTime - currentTime,
		"expiryTime": time.Unix(accessRecord.ExpiryTime, 0).Format(time.RFC3339),
	}, nil
}

// GetActiveAccessesForPatient retrieves all active access grants for a patient
func (hc *HealthcareContract) GetActiveAccessesForPatient(ctx contractapi.TransactionContextInterface,
	patientID string) ([]AccessRecord, error) {

	queryString := fmt.Sprintf(`{"selector":{"patientID":"%s","revoked":false}}`, patientID)

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var activeAccesses []AccessRecord
	timestamp, _ := ctx.GetStub().GetTxTimestamp()
	currentTime := timestamp.Seconds

	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var access AccessRecord
		err = json.Unmarshal(queryResponse.Value, &access)
		if err != nil {
			continue
		}

		// Only include non-expired accesses
		if currentTime <= access.ExpiryTime {
			activeAccesses = append(activeAccesses, access)
		}
	}

	return activeAccesses, nil
}

// ============================================================================
// AUDIT TRAIL
// ============================================================================

func (hc *HealthcareContract) createAuditLog(ctx contractapi.TransactionContextInterface,
	patientID string, doctorID string, action string, details string) error {

	timestamp, _ := ctx.GetStub().GetTxTimestamp()
	logID := fmt.Sprintf("log:%d:%s:%s", timestamp.Seconds, patientID, doctorID)

	mspID, _ := ctx.GetClientIdentity().GetMSPID()
	txID := ctx.GetStub().GetTxID()

	auditLog := AuditLog{
		LogID:     logID,
		PatientID: patientID,
		DoctorID:  doctorID,
		Action:    action,
		Details:   details,
		Timestamp: timestamp.Seconds,
		OrgMSP:    mspID,
		TxID:      txID,
	}

	logBytes, _ := json.Marshal(auditLog)
	err := ctx.GetStub().PutState(logID, logBytes)
	if err != nil {
		return fmt.Errorf("failed to create audit log: %v", err)
	}

	return nil
}

// GetAuditTrail retrieves audit trail for a patient
func (hc *HealthcareContract) GetAuditTrail(ctx contractapi.TransactionContextInterface,
	patientID string) ([]AuditLog, error) {

	queryString := fmt.Sprintf(`{"selector":{"patientID":"%s"}}`, patientID)

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var logs []AuditLog
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var log AuditLog
		err = json.Unmarshal(queryResponse.Value, &log)
		if err != nil {
			continue
		}
		logs = append(logs, log)
	}

	return logs, nil
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// InitLedger initializes the ledger with sample data
func (hc *HealthcareContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	// Initialize with sample patient and doctor
	return nil
}

// ============================================================================
// MAIN
// ============================================================================

func main() {
	chaincode, err := contractapi.NewChaincode(&HealthcareContract{})
	if err != nil {
		fmt.Printf("Error creating healthcare chaincode: %v\n", err)
		return
	}

	if err := chaincode.Start(); err != nil {
		fmt.Printf("Error starting healthcare chaincode: %v\n", err)
	}
}
