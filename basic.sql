-- 使用 master 資料庫
USE master;
GO

-- 檢查資料庫是否存在，存在則刪除
IF DB_ID('Hospital') IS NOT NULL
    DROP DATABASE Hospital;
GO

-- 新建資料庫
CREATE DATABASE Hospital
    COLLATE Chinese_PRC_CI_AS;
GO

-- 使用新建的資料庫
USE Hospital;
GO

-- 新建 Patients 資料表
CREATE TABLE Patients
(
    ID               INT IDENTITY (1,1) PRIMARY KEY,
    Name             NVARCHAR(255) NOT NULL,    -- 姓名
    Identifier       NVARCHAR(50)  NOT NULL,    -- 病歷號碼
    Gender           NVARCHAR(10)  NOT NULL,    -- 性別
    Birthdate        DATE          NOT NULL,    -- 生日
    NNTWN            NVARCHAR(50)  NOT NULL,    -- 身分證字號
    Phone            NVARCHAR(20),              -- 電話
    Mobile           NVARCHAR(20),              -- 手機
    Address          NVARCHAR(255),             -- 地址
    Email            NVARCHAR(255),             -- 電子信箱
    EmergencyContact NVARCHAR(255),             -- 緊急聯絡人
    Relationship     NVARCHAR(255),             -- 關係
    EmergencyPhone   NVARCHAR(20),              -- 聯絡電話
    CreateDate       DATETIME DEFAULT GETDATE() -- 建立日期
);
GO

-- 新建 PatientsHistory 資料表
CREATE TABLE PatientsHistory
(
    HistoryID        INT IDENTITY (1,1) PRIMARY KEY,
    PatientID        INT,
    Name             NVARCHAR(255),
    Identifier       NVARCHAR(50),
    Gender           NVARCHAR(10),
    Birthdate        DATE,
    NNTWN            NVARCHAR(50),
    Phone            NVARCHAR(20),
    Mobile           NVARCHAR(20),
    Address          NVARCHAR(255),
    Email            NVARCHAR(255),
    EmergencyContact NVARCHAR(255),
    Relationship     NVARCHAR(255),
    EmergencyPhone   NVARCHAR(20),
    EditDate         DATETIME DEFAULT GETDATE(),
    OperationType    NVARCHAR(10)
);
GO

-- 新建觸發器
CREATE TRIGGER trg_PatientsHistory
    ON Patients
    AFTER INSERT, UPDATE, DELETE
    AS
BEGIN
    -- 插入操作
    IF EXISTS (SELECT * FROM inserted) AND NOT EXISTS (SELECT * FROM deleted)
        BEGIN
            INSERT INTO PatientsHistory (PatientID, Name, Identifier, Gender, Birthdate, NNTWN, Phone, Mobile, Address,
                                         Email, EmergencyContact, Relationship, EmergencyPhone, OperationType)
            SELECT ID,
                   Name,
                   Identifier,
                   Gender,
                   Birthdate,
                   NNTWN,
                   Phone,
                   Mobile,
                   Address,
                   Email,
                   EmergencyContact,
                   Relationship,
                   EmergencyPhone,
                   'INSERT'
            FROM inserted;
        END

    -- 更新操作
    IF EXISTS (SELECT * FROM inserted) AND EXISTS (SELECT * FROM deleted)
        BEGIN
            INSERT INTO PatientsHistory (PatientID, Name, Identifier, Gender, Birthdate, NNTWN, Phone, Mobile, Address,
                                         Email, EmergencyContact, Relationship, EmergencyPhone, OperationType)
            SELECT ID,
                   Name,
                   Identifier,
                   Gender,
                   Birthdate,
                   NNTWN,
                   Phone,
                   Mobile,
                   Address,
                   Email,
                   EmergencyContact,
                   Relationship,
                   EmergencyPhone,
                   'UPDATE'
            FROM inserted;
        END

    -- 刪除操作
    IF EXISTS (SELECT * FROM deleted) AND NOT EXISTS (SELECT * FROM inserted)
        BEGIN
            INSERT INTO PatientsHistory (PatientID, Name, Identifier, Gender, Birthdate, NNTWN, Phone, Mobile, Address,
                                         Email, EmergencyContact, Relationship, EmergencyPhone, OperationType)
            SELECT ID,
                   Name,
                   Identifier,
                   Gender,
                   Birthdate,
                   NNTWN,
                   Phone,
                   Mobile,
                   Address,
                   Email,
                   EmergencyContact,
                   Relationship,
                   EmergencyPhone,
                   'DELETE'
            FROM deleted;
        END
END;
GO

-- 儲存過程：插入病人資料
CREATE PROCEDURE InsertPatient @Name NVARCHAR(255),
                               @Identifier NVARCHAR(50),
                               @Gender NVARCHAR(10),
                               @Birthdate DATE,
                               @NNTWN NVARCHAR(50),
                               @Phone NVARCHAR(20),
                               @Mobile NVARCHAR(20),
                               @Address NVARCHAR(255),
                               @Email NVARCHAR(255),
                               @EmergencyContact NVARCHAR(255),
                               @Relationship NVARCHAR(255),
                               @EmergencyPhone NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @InsertedRows TABLE
                          (
                              ID               INT,
                              Name             NVARCHAR(255),
                              Identifier       NVARCHAR(50),
                              Gender           NVARCHAR(10),
                              Birthdate        DATE,
                              NNTWN            NVARCHAR(50),
                              Phone            NVARCHAR(20),
                              Mobile           NVARCHAR(20),
                              Address          NVARCHAR(255),
                              Email            NVARCHAR(255),
                              EmergencyContact NVARCHAR(255),
                              Relationship     NVARCHAR(255),
                              EmergencyPhone   NVARCHAR(20),
                              CreateDate       DATETIME
                          );

    -- 插入 Patients 資料表並獲取新插入記錄的 ID
    INSERT INTO Patients (Name, Identifier, Gender, Birthdate, NNTWN, Phone, Mobile, Address, Email, EmergencyContact,
                          Relationship, EmergencyPhone)
    OUTPUT INSERTED.ID,
           INSERTED.Name,
           INSERTED.Identifier,
           INSERTED.Gender,
           INSERTED.Birthdate,
           INSERTED.NNTWN,
           INSERTED.Phone,
           INSERTED.Mobile,
           INSERTED.Address,
           INSERTED.Email,
           INSERTED.EmergencyContact,
           INSERTED.Relationship,
           INSERTED.EmergencyPhone,
           INSERTED.CreateDate
        INTO @InsertedRows
    VALUES (@Name, @Identifier, @Gender, @Birthdate, @NNTWN, @Phone, @Mobile, @Address, @Email, @EmergencyContact,
            @Relationship, @EmergencyPhone);

    -- 返回插入的記錄
    SELECT * FROM @InsertedRows;
END;
GO

-- 儲存過程：更新病人資料
CREATE PROCEDURE UpdatePatient @ID INT,
                               @Name NVARCHAR(255),
                               @Identifier NVARCHAR(50),
                               @Gender NVARCHAR(10),
                               @Birthdate DATE,
                               @NNTWN NVARCHAR(50),
                               @Phone NVARCHAR(20),
                               @Mobile NVARCHAR(20),
                               @Address NVARCHAR(255),
                               @Email NVARCHAR(255),
                               @EmergencyContact NVARCHAR(255),
                               @Relationship NVARCHAR(255),
                               @EmergencyPhone NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @UpdatedRows TABLE
                         (
                             ID               INT,
                             Name             NVARCHAR(255),
                             Identifier       NVARCHAR(50),
                             Gender           NVARCHAR(10),
                             Birthdate        DATE,
                             NNTWN            NVARCHAR(50),
                             Phone            NVARCHAR(20),
                             Mobile           NVARCHAR(20),
                             Address          NVARCHAR(255),
                             Email            NVARCHAR(255),
                             EmergencyContact NVARCHAR(255),
                             Relationship     NVARCHAR(255),
                             EmergencyPhone   NVARCHAR(20),
                             CreateDate       DATETIME
                         );

    -- 更新 Patients 資料表
    UPDATE Patients
    SET Name             = @Name,
        Identifier       = @Identifier,
        Gender           = @Gender,
        Birthdate        = @Birthdate,
        NNTWN            = @NNTWN,
        Phone            = @Phone,
        Mobile           = @Mobile,
        Address          = @Address,
        Email            = @Email,
        EmergencyContact = @EmergencyContact,
        Relationship     = @Relationship,
        EmergencyPhone   = @EmergencyPhone
    OUTPUT INSERTED.ID,
           INSERTED.Name,
           INSERTED.Identifier,
           INSERTED.Gender,
           INSERTED.Birthdate,
           INSERTED.NNTWN,
           INSERTED.Phone,
           INSERTED.Mobile,
           INSERTED.Address,
           INSERTED.Email,
           INSERTED.EmergencyContact,
           INSERTED.Relationship,
           INSERTED.EmergencyPhone,
           INSERTED.CreateDate
        INTO @UpdatedRows
    WHERE ID = @ID;

    -- 返回更新後的記錄
    SELECT * FROM @UpdatedRows;
END;
GO

-- 儲存過程：刪除病人資料
CREATE PROCEDURE DeletePatient @ID INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @DeletedRows TABLE
                         (
                             ID               INT,
                             Name             NVARCHAR(255),
                             Identifier       NVARCHAR(50),
                             Gender           NVARCHAR(10),
                             Birthdate        DATE,
                             NNTWN            NVARCHAR(50),
                             Phone            NVARCHAR(20),
                             Mobile           NVARCHAR(20),
                             Address          NVARCHAR(255),
                             Email            NVARCHAR(255),
                             EmergencyContact NVARCHAR(255),
                             Relationship     NVARCHAR(255),
                             EmergencyPhone   NVARCHAR(20),
                             CreateDate       DATETIME
                         );

    -- 刪除 Patients 資料表中的記錄
    DELETE
    FROM Patients
    OUTPUT DELETED.ID,
           DELETED.Name,
           DELETED.Identifier,
           DELETED.Gender,
           DELETED.Birthdate,
           DELETED.NNTWN,
           DELETED.Phone,
           DELETED.Mobile,
           DELETED.Address,
           DELETED.Email,
           DELETED.EmergencyContact,
           DELETED.Relationship,
           DELETED.EmergencyPhone,
           DELETED.CreateDate
        INTO @DeletedRows
    WHERE ID = @ID;

    -- 返回刪除的記錄
    SELECT * FROM @DeletedRows;
END;
GO



CREATE TABLE Account
(
    ID       int PRIMARY KEY,    -- 欄位id
    AccID    varchar(10) UNIQUE, -- 帳號
    Password varchar(100),       -- 密碼
    AccType  varchar(20),         -- 帳戶類型
    UP_Date  datetime,           -- 更新時間
    UP_User  varchar(20),         -- 更新人員
    LoginAttempts  int DEFAULT 0,      -- 登入嘗試次數
    LastAttemptTime datetime            -- 最後嘗試時間
);


INSERT INTO ACCOUNT (ID, AccID, Password, AccType, UP_Date, UP_User)
VALUES (1, 'ntunhsEmp', '$2b$10$6O3JzrnRPLej.XfqyW0O2u7rwFnra2M9jRVEU1aQL/QiReXoLI6BK', '1', getdate(), '0')
