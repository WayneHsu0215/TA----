import crypto from "crypto"
import sql from "mssql"
import svgCaptcha from 'svg-captcha';
import moment from 'moment';
import bcrypt from 'bcrypt';

export const postStudentLogin = async (req, res) => {
	try {
		const { Account, password, captcha } = req.body;
		const pool = req.app.locals.pool;

		// 驗證驗證碼
		if (req.session.captcha !== captcha) {
			return res.status(400).json({ success: false, message: '驗證碼錯誤' });
		}

		const query = `
            SELECT Account, password, Status, LastLoginTime, LoginAttempts
            FROM stuAccount 
            WHERE Account = @username;
        `;

		const result = await pool.request()
			.input('username', Account)
			.query(query);

		if (result.recordset.length > 0) {
			const user = result.recordset[0];
			const now = moment();
			const LastLoginTime = moment(user.LastLoginTime);

			if (user.LoginAttempts >= 5 && now.diff(LastLoginTime, 'minutes') < 15) {
				return res.status(429).json({ success: false, message: '嘗試次數過多，請15分鐘後再試。' });
			}

			const userStatus = user.Status;



			// 檢查密碼是否有效
			const isValid = await bcrypt.compare(password, user.password);

			if (isValid) {
				// 設置會話 cookie
				const options = { path: '/', maxAge: 60 * 60 * 24 * 14 };
				res.cookie("StuAccount", Account, options);
				req.session.user = { Account: Account };

				if (userStatus === 0 && Account === password) {
					// 如果狀態是0，且帳號和密碼相同，則重定向到 /newpwd
					return res.json({ redirect: `${process.env.BASE_URL ?? ''}/newpwd` });
				}

				// 更新 LastLoginTime 和重置 LoginAttempts
				const updateQuery = `
                    UPDATE stuAccount
                    SET LastLoginTime = GETDATE(), LoginAttempts = 0
                    WHERE Account = @username;
                `;
				await pool.request()
					.input('username', Account)
					.input('LastLoginTime', now.toDate())
					.query(updateQuery);

				res.json({ success: true, message: `Login successful ${Account}` });
			} else {
				// 增加 LoginAttempts 和更新 LastLoginTime
				const updateAttemptsQuery = `
                    UPDATE stuAccount
                    SET LoginAttempts = LoginAttempts + 1, LastLoginTime = GETDATE()
                    WHERE Account = @username;
                `;
				await pool.request()
					.input('username', Account)
					.query(updateAttemptsQuery);

				res.status(400).json({ success: false, message: '密碼錯誤' });
			}
		} else {
			res.status(401).json({ success: false, message: 'Unauthorized' });
		}
	} catch (err) {
		console.error('Error during login:', err);
		res.status(500).send('Internal Server Error');
	}
}

export const postResetPasswordRequest = async (req, res) => {
	try {
		const { studentId } = req.body; // 从请求中获取学号
		const pool = req.app.locals.pool;

		// 构造学生的电子邮件地址
		const email = `${studentId}@ntunhs.edu.tw`;

		// 生成重置令牌和过期时间
		const token = crypto.randomBytes(20).toString('hex');
		const expireTime = new Date();
		expireTime.setHours(expireTime.getHours() + 1); // 设置令牌1小时后过期

		// 将令牌和过期时间存储到数据库
		const updateQuery = `
			UPDATE stuAccount 
			SET ResetToken = @ResetToken, TokenExpireTime = @ExpireTime 
			WHERE Account = @Account;
		`;
		await pool.request()
			.input('ResetToken', sql.VarChar, token)
			.input('ExpireTime', sql.DateTime, expireTime)
			.input('Account', sql.VarChar, studentId)
			.query(updateQuery);

		// Reset password link for the user
		const resetLink = `https://localhost:3251/reset-password/${token}`;

		// Prepare email to be sent
		const mailOptions = {
			from: 'ntunhs.gradapply@gmail.com',
			to: email,
			subject: 'Password Reset',
			text: `Please click on the following link to reset your password: ${resetLink}`
		};

		// Sending the email
		transporter.sendMail(mailOptions, (error, info) => {
			if (error) {
				console.error('Error sending email', error);
				res.status(500).send('Error sending email');
			} else {
				console.log('Email sent: ' + info.response);
				res.status(200).send('Reset password email sent');
			}
		});
	} catch (err) {
		console.error('Error in reset-password-request', err);
		res.status(500).send('Internal Server Error');
	}
}

export const getAccountByResetToken = async (req, res) => {
	try {
		const { resetToken } = req.params; // 从路由参数中获取重置令牌
		const pool = req.app.locals.pool;

		// 查询帐户使用重置令牌
		const query = `
			SELECT Account 
			FROM stuAccount 
			WHERE ResetToken = @ResetToken;
		`;

		// Execute the query with the reset token
		const result = await pool.request()
			.input('ResetToken', sql.VarChar, resetToken)
			.query(query);

		if (result.recordset.length === 0) {
			res.status(404).send('Account not found or token expired');
			return;
		}

		// Extract account information from result
		const account = result.recordset[0].Account;

		// Send the account information back to the client
		res.status(200).json({ account });
	} catch (err) {
		console.error('Error in get-account-by-reset-token', err);
		res.status(500).send('Internal Server Error');
	}
}

export const getAccountType = async (req, res) => {
	try {
		const pool = req.app.locals.pool
		const request = pool.request()
		const account = req.params.account
		const query = `SELECT AccID, AccType
                   FROM Account
                   WHERE AccID = '${account}'`
		const result = await request.query(query)
		res.json(result.recordset)
	} catch (err) {
		console.error(err)
		res.status(500).json({ error: "Server error" })
	}
}

export const postStudentLogout = async (req, res) => {
	try {
		if (req.session.user) {
			req.session.destroy(err => {
				// Clear client cookies
				res.clearCookie("Account");
				res.clearCookie("StuAccount");

				if (err) {
					// Handle session destruction errors
					console.error('Error destroying session:', err);
					res.status(500).json({success: false, message: 'Internal Server Error'});
				} else {
					// Confirm logout success
					res.status(200).json({success: true, message: 'logout成功'});
				}
			});
		} else {
			// No user session exists, return unauthorized status
			console.log('Attempted logout without active session:', req.session.user);
			res.status(401).json({message: 'Unauthorized'});
		}
	} catch (err) {
		// Handle any other errors
		console.error('Error during logout:', err);
		res.status(500).json({message: 'Internal Server Error'});
	}
}

export const getStudentAccounts = async (req, res) => {
	try {
		const pool = req.app.locals.pool;
		const page = parseInt(req.query.page) || 1; // 確保有預設值
		const limit = parseInt(req.query.limit) || 10;
		const offset = (page - 1) * limit;

		// 查詢當前頁面的數據
		const queryData = `
            SELECT ID, Account,Department, EducationSystem, Password, Level ,CONVERT(varchar, UP_Date, 23) AS UP_Date, UP_User
            FROM stuAccount
            ORDER BY ID
            OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY;
        `;

		// 計算總記錄數的查詢
		const queryTotal = `
            SELECT COUNT(*) AS TotalCount
            FROM stuAccount;
        `;

		// 執行兩個查詢
		const resultData = await pool.request().query(queryData);
		const resultTotal = await pool.request().query(queryTotal);

		// 從結果中提取總記錄數
		const totalCount = resultTotal.recordset[0].TotalCount;

		// 返回包含兩部分信息的對象
		res.json({data: resultData.recordset, total: totalCount});
	} catch (err) {
		console.error('Error querying stuAccount table', err);
		res.status(500).send('Internal Server Error');
	}
}

export const createStudentAccount = async (req, res) => {
	try {
		const { ID, Account, Password,Department, EducationSystem, Level ,UP_User } = req.body; // 從請求主體中獲取新的帳戶資料
		const pool = req.app.locals.pool;
		const hashedPassword = await bcrypt.hash(Account, 10); // 密碼加密處理

		// 建立新帳戶資料的 SQL 查詢語句
		const query = `
			INSERT INTO stuAccount (Account, Password,Department, EducationSystem,Level, UP_Date, UP_User) 
			VALUES (@Account, @Password,@Department,@EducationSystem,@Level, GETDATE(), @UP_User);
		`;

		// 將新的帳戶資料保存到資料庫
		await pool.request()
			.input('Account', sql.NVarChar, Account)
			.input('Password', sql.NVarChar, hashedPassword)
			.input('UP_User', sql.NVarChar, UP_User)
			.input('Department', sql.NVarChar, Department)
			.input('EducationSystem', sql.NVarChar, EducationSystem)
			.input('Level', sql.NVarChar, Level)
			.query(query);

		// 回傳成功建立帳戶的訊息
		res.status(201).json({message: `Account added successfully with ID: ${ID}`});
	} catch (err) {
		console.error('Error adding new Account', err);
		res.status(500).send('Internal Server Error');
	}
}

export const updateStudentAccount = async (req, res) => {
	try {
		const { ID } = req.params; // 從路由參數中獲取ID
		const { Account, UP_User,Department, EducationSystem,Level } = req.body; // 從請求主體中獲取更新的資料
		const pool = req.app.locals.pool;

		// 構造更新帳戶資料的 SQL 查詢
		const query = `
			UPDATE stuAccount 
			SET Account = @Account,Level = @Level,Department = @Department, EducationSystem = @EducationSystem, UP_Date = GETDATE(), UP_User = @UP_User 
			WHERE ID = @ID;
		`;

		// 執行資料庫更新操作
		const result = await pool.request()
			.input('ID', sql.Int, ID)
			.input('Account', sql.NVarChar, Account)
			.input('UP_User', sql.NVarChar, UP_User)
			.input('Department', sql.NVarChar, Department)
			.input('EducationSystem', sql.NVarChar, EducationSystem)
			.input('Level', sql.NVarChar, Level)
			.query(query);

		// 檢查是否有行被成功更新
		if (result.rowsAffected[0] === 0) {
			res.status(404).send('Account not found');
			return;
		}

		// 回傳更新成功的消息
		res.status(200).json({message: 'Account updated successfully'});
	} catch (err) {
		console.error('Error updating Account', err);
		res.status(500).send('Internal Server Error');
	}
}

export const updateStudentPassword = async (req, res) => {
	try {
		const { Account } = req.params; // 從路由參數中獲取帳戶名稱
		const { Password } = req.body; // 從請求主體中獲取新密碼
		const pool = req.app.locals.pool;

		// Hash the new password
		const hashedPassword = await bcrypt.hash(Password, 10); // 密碼加密處理

		// 構造更新密碼的 SQL 查詢
		const query = `
			UPDATE stuAccount 
			SET Password = @Password, Status = 1 
			WHERE Account = @Account;
		`;

		// 執行資料庫更新操作
		await pool.request()
			.input('Account', sql.VarChar(10), Account)
			.input('Password', sql.NVarChar, hashedPassword)
			.query(query);

		// 回傳更新成功的消息
		res.status(200).json({message: 'Password updated successfully', status: 1});
	} catch (err) {
		console.error('Error updating password:', err);
		res.status(500).json({error: 'Server error'});
	}
}

export const updateStudentPasswordById = async (req, res) => {
	try {
		const { ID } = req.params; // 從路由參數中獲取學生ID
		const { Password, UP_User } = req.body; // 從請求主體中獲取新的密碼和更新者用戶名
		const pool = req.app.locals.pool;

		// Hash the new password
		const hashedPassword = await bcrypt.hash(Password, 10); // 密碼加密處理

		// 構造更新密碼的 SQL 查詢
		const query = `
			UPDATE stuAccount 
			SET Password = @Password, UP_Date = GETDATE(), UP_User = @UP_User 
			WHERE ID = @ID;
		`;

		// 執行資料庫更新操作
		const result = await pool.request()
			.input('ID', sql.Int, ID)
			.input('Password', sql.NVarChar, hashedPassword)
			.input('UP_User', sql.NVarChar, UP_User)
			.query(query);

		// 檢查是否有行被成功更新
		if (result.rowsAffected[0] === 0) {
			res.status(404).send('Account not found');
			return;
		}

		// 回傳更新成功的消息
		res.status(200).json({message: 'Password updated successfully'});
	} catch (err) {
		console.error('Error updating password:', err);
		res.status(500).send('Internal Server Error');
	}
}

export const deleteStudentAccount = async (req, res) => {
	try {
		const { account } = req.params; // 從路由參數中獲取帳號
		const pool = req.app.locals.pool;

		// 構造刪除帳戶的 SQL 查詢
		const query1 = `
			DELETE FROM stuAccount 
			WHERE Account = @account;
		`;

		const query2 = `
			DELETE FROM Reply 
			WHERE StudentID = @account;
		`;

		const query3 = `
			DELETE FROM List 
			WHERE StudentID = @account;
		`;

		// 執行資料庫刪除操作
		const result1 = await pool.request()
			.input('account', sql.NVarChar, account)
			.query(query1);

		const result2 = await pool.request()
			.input('account', sql.NVarChar, account)
			.query(query2);

		const result3 = await pool.request()
			.input('account', sql.NVarChar, account)
			.query(query3);

		// 檢查是否有行被成功刪除
		if (result1.rowsAffected[0] === 0) {
			res.status(404).send('Account not found');
			return;
		}

		// 回傳刪除成功的消息
		res.status(200).json({message: 'Account deleted successfully'});
	} catch (err) {
		console.error('Error deleting account:', err);
		res.status(500).send('Internal Server Error');
	}
}

export const getStudentAccountsByAccount = async (req, res) => {
	try {
		const pool = req.app.locals.pool;
		const account = req.params.Account;

		const query = `
            SELECT ID, Account, Password,Department, EducationSystem,Level, CONVERT(varchar, UP_Date, 23) AS UP_Date, UP_User
            FROM stuAccount
            WHERE Account LIKE '%' + @Account + '%';
        `;

		const result = await pool
			.request()
			.input('Account', account)
			.query(query);

		if (result.recordset.length === 0) {

			res.status(404).json({message: 'Account not found'});
		} else {

			res.json(result.recordset);
		}
	} catch (err) {
		console.error('Error querying stuAccount table', err);
		res.status(500).send('Internal Server Error');
	}
}

export const loginUser = async (req, res) => {
	try {
		const { AccID, password, captcha } = req.body;
		const pool = req.app.locals.pool;

		// 驗證驗證碼
		if (req.session.captcha !== captcha) {
			return res.status(400).json({ success: false, message: '驗證碼錯誤' });
		}

		const query = `
            SELECT AccID, Password
            FROM Account
            WHERE AccID =  @username;
        `;


		const result = await pool.request()
			.input('username', AccID)
			.query(query);

		if (result.recordset.length > 0) {
			const account = result.recordset[0];
			const now = moment();
			const lastAttemptTime = moment(account.LastAttemptTime);

			if (account.LoginAttempts >= 5 && now.diff(lastAttemptTime, 'minutes') < 15) {
				return res.status(429).json({ success: false, message: '嘗試次數過多，請15分鐘後再試。' });
			}

			const isValid = await bcrypt.compare(password, account.Password);

			if (isValid) {
				// 定義會話 cookie 的選項
				const options = {
					path: '/',
					maxAge: 60 * 60 * 24 * 14 // 14 天
				};

				// 設置會話 cookie
				res.cookie("MAccount", AccID, options);
				req.session.user = { AccID: AccID };

				// 成功登錄後重置登錄嘗試次數
				await pool.request()
					.input('username', AccID)
					.query(`UPDATE Account SET LoginAttempts = 0, LastAttemptTime = NULL WHERE AccID =  @username;`);

				res.status(200).json({ success: true, message: `Login successful ${AccID}` });
			} else {
				await pool.request()
					.input('username', AccID)
					.input('lastAttemptTime', now.toDate())
					.query(`UPDATE Account 
                            SET LoginAttempts = LoginAttempts + 1, 
                                LastAttemptTime = @lastAttemptTime 
                            WHERE AccID =  @username;`);

				res.status(400).json({ success: false, message: 'Invalid password' });
			}
		} else {
			res.status(401).json({ success: false, message: 'Account not found' });
		}
	} catch (err) {
		console.error('Error during login:', err);
		res.status(500).send('Internal Server Error');
	}
};

export const logoutUser = async (req, res) => {
	try {
		console.log('Current session state:', req.session); // Log the current session state for debugging

		// Check if the user is currently logged in
		if (req.session.user) {
			// Clear relevant cookies
			res.clearCookie("MAccount");
			res.clearCookie("AccID");

			// Destroy the session
			req.session.destroy(err => {
				if (err) {
					// Log the error and return a server error response
					console.error('Error destroying session:', err);
					res.status(500).json({success: false, message: 'Internal Server Error'});
				} else {
					// Confirm the successful logout
					res.status(200).json({success: true, message: 'Logout successful'});
				}
			});
		} else {
			// If no user is logged in, return an unauthorized status
			console.log('Logout attempt without active session:', req.session.user); // Log for debugging
			res.status(401).json({message: 'Unauthorized'});
		}
	} catch (err) {
		// Log any exceptions and return a server error response
		console.error('Error during logout:', err);
		res.status(500).json({message: 'Internal Server Error'});
	}
};

export const getAccounts = async (req, res) => {
	try {
		const pool = req.app.locals.pool;
		const page = parseInt(req.query.page) || 1; // 確保有預設值
		const limit = parseInt(req.query.limit) || 10;
		const offset = (page - 1) * limit;

		// 查詢當前頁面的數據
		const queryData = `
            SELECT ID, AccID, Password, AccType, CONVERT(varchar, UP_Date, 23) AS UP_Date, UP_User
            FROM Account
            ORDER BY ID
            OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY;
        `;

		// 計算總記錄數的查詢
		const queryTotal = `
            SELECT COUNT(*) AS TotalCount
            FROM Account;
        `;

		// 執行兩個查詢
		const resultData = await pool.request().query(queryData);
		const resultTotal = await pool.request().query(queryTotal);

		// 從結果中提取總記錄數
		const totalCount = resultTotal.recordset[0].TotalCount;

		// 返回包含兩部分信息的對象
		res.json({data: resultData.recordset, total: totalCount});
	} catch (err) {
		console.error('Error querying Account table', err);
		res.status(500).send('Internal Server Error');
	}
}

export const createAccount = async (req, res) => {
	try {
		const { ID, AccID, Password, AccType, UP_User } = req.body; // 從請求主體中獲取新的帳戶資料
		const pool = req.app.locals.pool;

		// Encrypt the password using bcrypt
		const hashedPassword = await bcrypt.hash(Password, 10); // 密碼加密處理

		// Prepare SQL query to insert new account data
		const query = `
            INSERT INTO Account (ID, AccID, Password, AccType, UP_Date, UP_User) 
            VALUES (@ID, @AccID, @Password, @AccType, GETDATE(), @UP_User);
        `;

		// Execute the query with the provided parameters
		await pool.request()
			.input('ID', sql.Int, ID)
			.input('AccID', sql.NVarChar, AccID)
			.input('Password', sql.NVarChar, hashedPassword)
			.input('AccType', sql.NVarChar, AccType)
			.input('UP_User', sql.NVarChar, UP_User)
			.query(query);

		// Return a success response
		res.status(201).json({ message: `Account successfully added with ID: ${ID}` });
	} catch (err) {
		console.error('Error adding new account:', err);
		res.status(500).send('Internal Server Error');
	}
}

export const updateAccount = async (req, res) => {
	try {
		const { ID } = req.params; // Extract ID from route parameters
		const { AccID, AccType, UP_User } = req.body; // Extract new account details from request body
		const pool = req.app.locals.pool;

		// Prepare SQL query to update account data
		const query = `
            UPDATE Account 
            SET AccID = @AccID, AccType = @AccType, UP_Date = GETDATE(), UP_User = @UP_User 
            WHERE ID = @ID;
        `;

		// Execute the update query
		const result = await pool.request()
			.input('ID', sql.Int, ID)
			.input('AccID', sql.NVarChar, AccID)
			.input('AccType', sql.NVarChar, AccType)
			.input('UP_User', sql.NVarChar, UP_User)
			.query(query);

		// Check if the update affected any rows
		if (result.rowsAffected[0] === 0) {
			res.status(404).send('Account not found');
			return;
		}

		// Return success message if update is successful
		res.status(200).json({ message: 'Account updated successfully' });
	} catch (err) {
		console.error('Error updating account:', err);
		res.status(500).send('Internal Server Error');
	}
}

export const updatePassword = async (req, res) => {
	try {
		const { ID } = req.params; // Extract the ID from route parameters
		const { Password, UP_User } = req.body; // Extract the new password and updater user from the request body
		const pool = req.app.locals.pool;

		// Hash the new password using bcrypt with a salt round of 10
		const hashedPassword = await bcrypt.hash(Password, 10);

		// Prepare SQL query for updating the password
		const query = `
            UPDATE Account 
            SET Password = @Password, UP_Date = GETDATE(), UP_User = @UP_User 
            WHERE ID = @ID;
        `;

		// Execute the update query
		const result = await pool.request()
			.input('ID', sql.Int, ID)
			.input('Password', sql.NVarChar, hashedPassword)
			.input('UP_User', sql.NVarChar, UP_User)
			.query(query);

		// Check if the update affected any rows
		if (result.rowsAffected[0] === 0) {
			res.status(404).send('Account not found'); // Account not found
			return;
		}

		// Return success message if update is successful
		res.status(200).json({ message: 'Password updated successfully' });
	} catch (err) {
		console.error('Error updating password:', err);
		res.status(500).send('Internal Server Error'); // Handle server errors
	}
}

export const deleteAccount = async (req, res) => {
	try {
		const { ID } = req.params; // Extract the account ID from route parameters
		const pool = req.app.locals.pool;

		// Prepare SQL query to delete an account
		const query = `
            DELETE FROM Account 
            WHERE ID = @ID;
        `;

		// Execute the delete query
		const result = await pool.request()
			.input('ID', sql.NVarChar, ID) // Ensure the ID is treated as NVarChar for the query
			.query(query);

		// Check if the delete operation affected any rows
		if (result.rowsAffected[0] === 0) {
			res.status(404).send('Account not found'); // Provide a clear and professional error message
			return;
		}

		// Return success message if deletion is successful
		res.status(200).json({ message: 'Account deleted successfully' });
	} catch (err) {
		console.error('Error deleting account:', err); // Log the specific error to help with debugging
		res.status(500).send('Internal Server Error'); // Use a more generic server error message for public responses
	}
}

export const getCaptcha = async (req, res) => {
	const captcha = svgCaptcha.create();
	req.session.captcha = captcha.text;
	res.type('svg');
	res.status(200).send(captcha.data);
}


