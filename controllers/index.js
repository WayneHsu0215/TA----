import { Router } from "express";
import sql from 'mssql';

const router = Router();

export default router;

// 插入病人資料
router.post('/patients', async (req, res) => {
    const { name, identifier, gender, birthdate, NNTWN, phone, mobile, address, email, emergencyContact, relationship, emergencyPhone } = req.body;

    if (!name || !identifier || !gender || !birthdate || !NNTWN) {
        return res.status(400).send('Missing required fields');
    }

    try {
        const pool = req.app.locals.pool;

        const result = await pool.request()
            .input('Name', sql.NVarChar(255), name)
            .input('Identifier', sql.NVarChar(50), identifier)
            .input('Gender', sql.NVarChar(10), gender)
            .input('Birthdate', sql.Date, birthdate)
            .input('NNTWN', sql.NVarChar(50), NNTWN)
            .input('Phone', sql.NVarChar(20), phone)
            .input('Mobile', sql.NVarChar(20), mobile)
            .input('Address', sql.NVarChar(255), address)
            .input('Email', sql.NVarChar(255), email)
            .input('EmergencyContact', sql.NVarChar(255), emergencyContact)
            .input('Relationship', sql.NVarChar(255), relationship)
            .input('EmergencyPhone', sql.NVarChar(20), emergencyPhone)
            .execute('InsertPatient');

        res.status(201).json({
            message: 'Patient created successfully',
            patient: result.recordset[0]
        });
    } catch (err) {
        console.error('Error inserting into Patients table', err);
        res.status(500).send('Internal Server Error');
    }
});

// 獲取所有病人資料
router.get('/patients', async (req, res) => {
    try {
        const pool = req.app.locals.pool;

        const result = await pool.request().query(`
            SELECT ID, Name, Identifier, Gender, Birthdate, NNTWN, Phone, Mobile, Address, Email, EmergencyContact, Relationship, EmergencyPhone, CONVERT(varchar, CreateDate, 20) AS CreateDate
            FROM Patients
            ORDER BY ID ASC;
        `);

        const totalCount = result.recordset.length;

        res.json({
            totalCount: totalCount,
            patients: result.recordset
        });
    } catch (err) {
        console.error('Error querying Patients table', err);
        res.status(500).send('Internal Server Error');
    }
});

// 獲取單個病人資料
router.get('/patients/:id', async (req, res) => {
    const { id } = req.params;

    // 檢查 ID 是否為有效的數字
    if (!Number.isInteger(Number(id))) {
        return res.status(400).send('Invalid ID parameter');
    }

    try {
        const pool = req.app.locals.pool;

        const result = await pool.request()
            .input('ID', sql.Int, Number(id))
            .query(`
                SELECT ID, Name, Identifier, Gender, Birthdate, NNTWN, Phone, Mobile, Address, Email, EmergencyContact, Relationship, EmergencyPhone, CONVERT(varchar, CreateDate, 20) AS CreateDate 
                FROM Patients 
                WHERE ID = @ID;
            `);

        if (result.recordset.length === 0) {
            return res.status(404).send('Patient not found');
        }

        res.json(result.recordset[0]);
    } catch (err) {
        console.error('Error querying Patients table', err);
        res.status(500).send('Internal Server Error');
    }
});

// 更新病人資料
router.put('/patients/:id', async (req, res) => {
    const { id } = req.params;
    const { name, identifier, gender, birthdate, NNTWN, phone, mobile, address, email, emergencyContact, relationship, emergencyPhone } = req.body;

    if (!name || !identifier || !gender || !birthdate || !NNTWN) {
        return res.status(400).send('Missing required fields');
    }

    try {
        const pool = req.app.locals.pool;

        const result = await pool.request()
            .input('ID', sql.Int, id)
            .input('Name', sql.NVarChar(255), name)
            .input('Identifier', sql.NVarChar(50), identifier)
            .input('Gender', sql.NVarChar(10), gender)
            .input('Birthdate', sql.Date, birthdate)
            .input('NNTWN', sql.NVarChar(50), NNTWN)
            .input('Phone', sql.NVarChar(20), phone)
            .input('Mobile', sql.NVarChar(20), mobile)
            .input('Address', sql.NVarChar(255), address)
            .input('Email', sql.NVarChar(255), email)
            .input('EmergencyContact', sql.NVarChar(255), emergencyContact)
            .input('Relationship', sql.NVarChar(255), relationship)
            .input('EmergencyPhone', sql.NVarChar(20), emergencyPhone)
            .execute('UpdatePatient');

        if (result.recordset.length === 0) {
            return res.status(404).send('Patient not found');
        }

        res.status(200).json({
            message: 'Patient updated successfully',
            patient: result.recordset[0]
        });
    } catch (err) {
        console.error('Error updating Patients table', err);
        res.status(500).send('Internal Server Error');
    }
});

// 刪除病人資料
router.delete('/patients/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const pool = req.app.locals.pool;

        const result = await pool.request()
            .input('ID', sql.Int, id)
            .execute('DeletePatient');

        if (result.recordset.length === 0) {
            return res.status(404).send('Patient not found');
        }

        res.status(200).json({
            message: 'Patient deleted successfully',
            patient: result.recordset[0]
        });
    } catch (err) {
        console.error('Error deleting from Patients table', err);
        res.status(500).send('Internal Server Error');
    }
});

// 獲取病人資料的歷史紀錄
router.get('/patients/history/:id', async (req, res) => {
    const { id } = req.params;

    // 檢查 ID 是否為有效的數字
    if (!Number.isInteger(Number(id))) {
        return res.status(400).send('Invalid ID parameter');
    }

    try {
        const pool = req.app.locals.pool;

        const result = await pool.request()
            .input('PatientID', sql.Int, Number(id))
            .query(`
                SELECT HistoryID, PatientID, Name, Identifier, Gender, Birthdate, NNTWN, Phone, Mobile, Address, Email, EmergencyContact, Relationship, EmergencyPhone, EditDate, OperationType 
                FROM PatientsHistory 
                WHERE PatientID = @PatientID
                ORDER BY EditDate DESC;
            `);

        if (result.recordset.length === 0) {
            return res.status(404).send('No history found for the given patient ID');
        }

        res.json(result.recordset);
    } catch (err) {
        console.error('Error querying PatientsHistory table', err);
        res.status(500).send('Internal Server Error');
    }
});

