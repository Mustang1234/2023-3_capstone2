const db = require('./db');
const lodash = require('lodash');
//const Eclass = require('./Eclass');

function getCurrentDateTime() {
    const now = new Date();

    // 날짜
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // 월은 0부터 시작하므로 1을 더하고 2자리로 맞춤
    const day = String(now.getDate()).padStart(2, '0');

    // 시간
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    // 현재 시간을 yyyy-mm-dd HH:MM 형식으로 반환
    const currentDateTime = `${year}-${month}-${day} ${hours}:${minutes}`;

    return currentDateTime;
}

module.exports = {
    id_duplicate_check: async (Student_id) => {
        try {
            const _id_duplicate_check = await new Promise((resolve, reject) => {
                db.query(`SELECT * FROM StudentTable WHERE Student_id = ?`, [Student_id], (error, rows) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        if(rows.length === 0){
                            resolve(true);
                        }
                        else{
                            resolve(false);
                        }
                    }
                });
            });
            return _id_duplicate_check;
        } catch (error) {
            console.error('오류 발생:', error);
            //res.status(500).send('오류 발생');
        }
    },
    course_to_db: async (year_semester, timetable) => {
        try {
            if (timetable.length === 0) {
                //console.log('no table');
                return false;
            }
            const groupedData = lodash.groupBy(timetable, 'name');
            const timetable_result = Object.values(groupedData).map(group => group);
            //console.log(timetable_result)
            const j = timetable_result.length;
            for (let i = 0; i < j; i++) {
                const time_table_index = timetable_result[i];
                const CourseID = year_semester + time_table_index[0].day + time_table_index[0].time + time_table_index[0].name;
                //console.log(CourseID)
                const answer = await new Promise((resolve, reject) => {
                    db.query(`SELECT * FROM CourseTable WHERE Course_id = ?`, [CourseID], (error, rows) => {
                        if (error) {
                            console.error(error);
                            reject(error);
                        } else {
                            resolve(rows.length);
                        }
                    });
                });
                if (answer === 0) {
                    const l = time_table_index.length;
                    for (let k = 0; k < l; k++) {
                        const time_table_index2 = time_table_index[k];
                        await new Promise((resolve, reject) => {
                            db.query(`INSERT INTO CourseTable (Course_id, Course_name, year_semester, day, time) VALUES (?, ?, ?, ?, ?)`,
                                [CourseID, time_table_index2.name, year_semester, time_table_index2.day, time_table_index2.time], (error) => {
                                    if (error) {
                                        console.error(error);
                                        reject(error);
                                    } else {
                                        resolve();
                                    }
                                });
                        });
                    }
                }
            }

            return true;
        } catch (error) {
            console.error('오류 발생:', error);
            //res.status(500).send('오류 발생');
        }
    },
    timetable_to_db: async (Student_id, year_semester, timetable_small) => {
        try {
            if (timetable_small.length === 0) {
                //console.log('no table');
                return false;
            }
            // 먼저 해당 학생 및 학기의 시간표 데이터를 모두 삭제
            await new Promise((resolve, reject) => {
                db.query(`DELETE FROM TimeTable WHERE Student_id = ? AND year_semester = ?`, [Student_id, year_semester], (error) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            });

            const j = timetable_small.length;
            for (let i = 0; i < j; i++) {
                const data = timetable_small[i];
                await new Promise((resolve, reject) => {
                    db.query(`INSERT INTO TimeTable (Student_id, Course_id, year_semester) VALUES (?, ?, ?)`,
                        [Student_id, year_semester + data.day + data.time + data.name, year_semester], (error) => {
                            if (error) {
                                console.error(error);
                                reject(error);
                            } else {
                                resolve();
                            }
                        });
                });
            }

            return true;
        } catch (error) {
            console.error('오류 발생:', error);
            res.status(500).send('오류 발생');
        }
    },
    db_to_timetable: async (Student_id, year_semester) => {
        try {
            const timeTable = await new Promise((resolve, reject) => {
                db.query(`SELECT B.Course_id, B.day, B.time, B.Course_name
                FROM TimeTable as A INNER JOIN  CourseTable as B 
                ON A.Course_id = B.Course_id and A.Student_id = ? and A.year_semester = ?`, [Student_id, year_semester], (error, rows) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        const j = rows.length;
                        var result = [];
                        for (let i = 0; i < j; i++) {
                            result.push(rows[i]);
                        }
                        const Days_kor = ['월', '화', '수', '목', '금', '토', '일'];
                        result.sort((a, b) => Days_kor.indexOf(a.day) - Days_kor.indexOf(b.day));
                        resolve(result);
                    }
                });
            });
            return JSON.stringify(timeTable);
        } catch (error) {
            console.error('오류 발생:', error);
            res.status(500).send('오류 발생');
        }
    },
    db_to_timetable_small: async (Student_id, year_semester) => {
        try {
            const timeTable = await new Promise((resolve, reject) => {
                db.query(`SELECT DISTINCT A.Course_id, A.Course_name, A.day, A.time
                FROM CourseTable as A INNER JOIN TimeTable as B
                WHERE B.Student_id = ? and B.year_semester = ? and B.Course_id = A.Course_id;`, [Student_id, year_semester], (error, rows) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        const j = rows.length;
                        var result = [];
                        for (let i = 0; i < j; i++) {
                            result.push(rows[i]);
                        }
                        resolve(result);
                    }
                });
            });
            const timetable_small = Array.from(new Set(timeTable.map(item => item.Course_id)))
                .map(courseId => timeTable.find(item => item.Course_id === courseId));
            return JSON.stringify(timetable_small);
        } catch (error) {
            console.error('오류 발생:', error);
            res.status(500).send('오류 발생');
        }
    },
    get_student_table: async (Student_id) => {
        try {
            const _get_student_table = await new Promise((resolve, reject) => {
                db.query(`SELECT * FROM StudentTable where Student_id = ?`, [Student_id], (error, rows) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        resolve(rows[0]);
                    }
                });
            });
            return JSON.stringify(_get_student_table);
        } catch (error) {
            console.error('오류 발생:', error);
            throw new Error('오류 발생');
        }
    },
    get_student_photo_table: async (Student_id) => {
        try {
            const _get_student_photo_table = await new Promise((resolve, reject) => {
                db.query(`SELECT * FROM StudentPhotoTable where Student_id = ?`, [Student_id], (error, rows) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        resolve(rows[0]);
                    }
                });
            });
            return JSON.stringify(_get_student_photo_table);
        } catch (error) {
            console.error('오류 발생:', error);
            throw new Error('오류 발생');
        }
    },
    update_photo_student_table: async (Student_id, ProfilePhoto) => {
        try {
            const _update_photo_student_table = await new Promise((resolve, reject) => {
                db.query(`UPDATE StudentPhotoTable SET ProfilePhoto = ? WHERE Student_id= ?;`, [ProfilePhoto, Student_id], (error) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        resolve(true);
                    }
                });
            });
            return _update_photo_student_table;
        } catch (error) {
            console.error('오류 발생:', error);
            throw new Error('오류 발생');
        }
    },
    email_available: async (email) => {
        try {
            const _email_available = await new Promise((resolve, reject) => {
                db.query(`SELECT * FROM StudentTable WHERE email = ?`, [email], (error, rows) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        if(rows.length === 0){
                            resolve(true);
                        }
                        else{
                            resolve(false);
                        }
                    }
                });
            });
            return _email_available;

        } catch (error) {
            console.error('오류 발생:', error);
            throw new Error('오류 발생');
        }
    },
    add_student_table_not_verified: async (email, token) => {
        try {
            const _add_student_table_not_verified0 = await new Promise((resolve, reject) => {
                db.query(`SELECT * FROM StudentTable WHERE email = ? and verified = 1`, [email], (error, rows) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        if(rows.length === 0){
                            resolve(true);
                        }
                        else{
                            resolve(false);
                        }
                    }
                });
            });
            if(_add_student_table_not_verified0){
                const _add_student_table_not_verified1 = await new Promise((resolve, reject) => {
                    db.query(`DELETE FROM StudentTable WHERE email = ?`, [email], (error) => {
                        if (error) {
                            console.error(error);
                            reject(error);
                        } else {
                            resolve(true);
                        }
                    });
                });
                const _add_student_table_not_verified2 = await new Promise((resolve, reject) => {
                    db.query(`INSERT INTO StudentTable (email, token, verified) VALUES (?, ?, 0)`, [email, token], (error) => {
                        if (error) {
                            console.error(error);
                            reject(error);
                        } else {
                            resolve(true);
                        }
                    });
                });
                return _add_student_table_not_verified1 && _add_student_table_not_verified2;
            }
            else{
                return false;
            }

        } catch (error) {
            console.error('오류 발생:', error);
            throw new Error('오류 발생');
        }
    },
    student_verify: async (email, token) => {
        try {
            const _student_verify1 = await new Promise((resolve, reject) => {
                db.query(`SELECT * FROM StudentTable WHERE email = ?`, [email], (error, rows) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        //console.log(rows.length, rows[0].token, token)
                        if(rows.length > 0 && rows[0].token === token){
                            resolve(true);
                        }
                        else{
                            resolve(false);
                        }
                    }
                });
            });
            if(_student_verify1){
                const _student_verify2 = await new Promise((resolve, reject) => {
                    db.query(`UPDATE StudentTable SET verified = 1 WHERE email = ? and token = ?`, [email, token], (error) => {
                        if (error) {
                            console.error(error);
                            reject(error);
                        } else {
                            resolve(true);
                        }
                    });
                });
                return _student_verify1 && _student_verify2;
            }
            else{
                return _student_verify1;
            }
        } catch (error) {
            console.error('오류 발생:', error);
            throw new Error('오류 발생');
        }
    },
    has_student_verified: async (email) => {
        try {
            const _has_student_verified = await new Promise((resolve, reject) => {
                db.query(`SELECT * FROM StudentTable WHERE email = ?`, [email], (error, rows) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        if(rows.length > 0 && rows[0].verified == 1){
                            resolve(true);
                        }
                        else{
                            resolve(false);
                        }
                    }
                });
            });
            return _has_student_verified;
        } catch (error) {
            console.error('오류 발생:', error);
            throw new Error('오류 발생');
        }
    },
    email_used: async (email) => {
        try {
            const _email_used = await new Promise((resolve, reject) => {
                db.query(`SELECT * FROM StudentTable WHERE token is NULL and email = ?`, [email], (error, rows) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        if(rows.length === 0){
                            resolve(true);
                        }
                        else{
                            resolve(false);
                        }
                    }
                });
            });
            return _email_used;
        } catch (error) {
            console.error('오류 발생:', error);
            throw new Error('오류 발생');
        }
    },
    find_id_by_email: async (email) => {
        try {
            const _find_id_by_email = await new Promise((resolve, reject) => {
                db.query(`SELECT * FROM StudentTable WHERE email = ?`, [email], (error, rows) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        if(rows.length === 0){
                            resolve(false);
                        }
                        else{
                            resolve(rows[0].Student_id);
                        }
                    }
                });
            });
            return _find_id_by_email;
        } catch (error) {
            console.error('오류 발생:', error);
            throw new Error('오류 발생');
        }
    },
    get_email_from_id: async (Student_id) => {
        try {
            const _get_email_from_id = await new Promise((resolve, reject) => {
                db.query(`SELECT email FROM StudentTable WHERE Student_id = ?`, [Student_id], (error, rows) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        //console.log(rows.length, rows[0].token, token)
                        if(rows.length !== 0){
                            resolve(rows[0].email);
                        }
                        else{
                            resolve(false);
                        }
                    }
                });
            });
            return _get_email_from_id;
        } catch (error) {
            console.error('오류 발생:', error);
            throw new Error('오류 발생');
        }
    },
    set_new_pw: async (Student_id, current_password, new_password) => {
        try {
            const _set_new_pw1 = await new Promise((resolve, reject) => {
                db.query(`SELECT * FROM StudentTable WHERE Student_id = ? and Student_pw = ?`, [Student_id, current_password], (error, rows) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        //console.log(rows.length, rows[0].token, token)
                        if(rows.length !== 0){
                            resolve(true);
                        }
                        else{
                            resolve(false);
                        }
                    }
                });
            });
            if(_set_new_pw1){
                const _set_new_pw2 = await new Promise((resolve, reject) => {
                    db.query(`UPDATE StudentTable SET Student_pw = ? WHERE Student_id = ? and Student_pw = ?`, [new_password, Student_id, current_password], (error) => {
                        if (error) {
                            console.error(error);
                            reject(error);
                        } else {
                            resolve(true);
                        }
                    });
                });
                return _set_new_pw1 && _set_new_pw2;
            }
            else{
                return _set_new_pw1;
            }
        } catch (error) {
            console.error('오류 발생:', error);
            throw new Error('오류 발생');
        }
    },
    find_pw_by_email_token_insert: async (email, new_pw_token) => {
        try {
            const _find_pw_by_email_token_insert1 = await new Promise((resolve, reject) => {
                db.query(`SELECT * FROM StudentTable WHERE email = ?`, [email], (error, rows) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        //console.log(rows.length, rows[0].token, token)
                        if(rows.length !== 0 && rows[0].email === email){
                            resolve(true);
                        }
                        else{
                            resolve(false);
                        }
                    }
                });
            });
            if(_find_pw_by_email_token_insert1){
                const _find_pw_by_email_token_insert2 = await new Promise((resolve, reject) => {
                    db.query(`UPDATE StudentTable SET new_pw_token = ? WHERE email = ?`, [new_pw_token, email], (error) => {
                        if (error) {
                            console.error(error);
                            reject(error);
                        } else {
                            resolve(true);
                        }
                    });
                });
                return _find_pw_by_email_token_insert1 && _find_pw_by_email_token_insert2;
            }
            else{
                return _find_pw_by_email_token_insert1;
            }
        } catch (error) {
            console.error('오류 발생:', error);
            throw new Error('오류 발생');
        }
    },
    find_pw_by_email_token_check: async (email, new_pw_token, new_password) => {
        try {
            const _find_pw_by_email_token_check1 = await new Promise((resolve, reject) => {
                db.query(`SELECT * FROM StudentTable WHERE email = ? and new_pw_token = ?`, [email, new_pw_token], (error, rows) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        //console.log(rows.length, rows[0].token, token)
                        if(rows.length > 0 && rows[0].new_pw_token === new_pw_token){
                            resolve(true);
                        }
                        else{
                            resolve(false);
                        }
                    }
                });
            });
            if(_find_pw_by_email_token_check1){
                const _find_pw_by_email_token_check2 = await new Promise((resolve, reject) => {
                    db.query(`UPDATE StudentTable SET new_pw_token = NULL, Student_pw = ? WHERE email = ?`, [new_password, email], (error) => {
                        if (error) {
                            console.error(error);
                            reject(error);
                        } else {
                            resolve(true);
                        }
                    });
                });
                return _find_pw_by_email_token_check1 && _find_pw_by_email_token_check2;
            }
            else{
                return _find_pw_by_email_token_check1;
            }
        } catch (error) {
            console.error('오류 발생:', error);
            throw new Error('오류 발생');
        }
    },
    get_portal_info: async (Student_id) => {
        try {
            const _get_portal_info = await new Promise((resolve, reject) => {
                db.query(`SELECT portal_id, portal_pw FROM StudentTable WHERE Student_id = ?`, [Student_id], (error, rows) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        resolve(rows[0]);
                    }
                });
            });
            return JSON.stringify(_get_portal_info);

        } catch (error) {
            console.error('오류 발생:', error);
            throw new Error('오류 발생');
        }
    },
    add_student_table: async (email, Student_id, Student_pw, student_name, student_number, department, portal_id, portal_pw) => {
        try {
            const _add_student_table1 = await new Promise((resolve, reject) => {
                db.query(`UPDATE StudentTable SET Student_id = ?, Student_pw = ?, student_name = ?, student_number = ?,
                    speed = 100, department = ?, description = 'hello world!!', portal_id = ?, portal_pw = ? WHERE email = ? and verified = 1;`,
                    [Student_id, Student_pw, student_name, student_number, department, portal_id, portal_pw, email], (error) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        resolve(true);
                    }
                });
            });
            const _add_student_table2 = await new Promise((resolve, reject) => {
                db.query(`UPDATE StudentTable SET token = NULL WHERE Student_id = ?;`, [Student_id], (error) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        resolve(true);
                    }
                });
            });
            const _add_student_photo_table = await new Promise((resolve, reject) => {
                db.query(`INSERT INTO StudentPhotoTable
                    (Student_id, ProfilePhoto) VALUES (?, ?)`, [Student_id, null], (error) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        resolve(true);
                    }
                });
            });
            return _add_student_table1 && _add_student_table2 && _add_student_photo_table;

        } catch (error) {
            console.error('오류 발생:', error);
            throw new Error('오류 발생');
        }
    },
    sign_out: async (Student_id) => {
        try {
            const _sign_out1 = await new Promise((resolve, reject) => {
                db.query(`DELETE FROM JoinRequestTable WHERE req_Student_id = ?`, [Student_id], (error) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        resolve(true);
                    }
                });
            });
            const _sign_out2 = await new Promise((resolve, reject) => {
                db.query(`DELETE FROM JoinRequestTable WHERE Student_id = ?`, [Student_id], (error) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        resolve(true);
                    }
                });
            });
            const _sign_out3 = await new Promise((resolve, reject) => {
                db.query(`DELETE FROM StudentTable WHERE Student_id = ?`, [Student_id], (error) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        resolve(true);
                    }
                });
            });
            const _sign_out4 = await new Promise((resolve, reject) => {
                db.query(`DELETE FROM TimeTable WHERE Student_id = ?`, [Student_id], (error) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        resolve(true);
                    }
                });
            });
            const _sign_out5 = await new Promise((resolve, reject) => {
                db.query(`DELETE FROM StudentPhotoTable WHERE Student_id = ?`, [Student_id], (error) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        resolve(true);
                    }
                });
            });
            return _sign_out1 && _sign_out2 && _sign_out3 && _sign_out4 && _sign_out5;
        } catch (error) {
            console.error('오류 발생:', error);
            throw new Error('오류 발생');
        }
    },
    get_whole_schedule: async (Student_id, year_semester) => {
        try {
            const schedules = await new Promise((resolve, reject) => {
                db.query(`SELECT DISTINCT D.Course_id, F.Course_name, A.Team_name, C.Deadline, C.description, C.Student_id
                FROM TeamTable as A INNER JOIN TeamPeopleTable as B INNER JOIN ScheduleTable as C INNER JOIN TimeTable as D INNER JOIN CourseTable as F
                ON A.Team_id = B.Team_id and B.Team_id = C.Team_id and B.Student_id = ? and A.Course_id = D.Course_id and A.Course_id = F.Course_id and F.year_semester = ? ORDER BY Deadline ASC;`, [Student_id, year_semester], (error, rows) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        const j = rows.length;
                        var result = [];
                        for (let i = 0; i < j; i++) {
                            const scheduleTime = rows[i].Deadline;
                            const currentTime = getCurrentDateTime();
                            if(scheduleTime > currentTime){
                                result.push(rows[i]);
                            }
                        }
                        resolve(result);
                    }
                });
            });
            return JSON.stringify(schedules);
        } catch (error) {
            console.error('오류 발생:', error);
            // res 객체가 정의되지 않았으므로, 여기서 직접 응답을 처리하거나 에러를 던져야 합니다.
            throw new Error('오류 발생');
        }
    },
    add_schedule: async (Student_id, Team_id, Deadline, description) => {
        try {
            const _add_schedule1 = await new Promise((resolve, reject) => {
                db.query(`SELECT * from TeamPeopleTable where Student_id = ? and Team_id = ?`, [Student_id, Team_id], (error, rows) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        if(rows.length !== 0) {
                            resolve(true);
                        }
                        else {
                            resolve(false);
                        }
                    }
                });
            });
            if(_add_schedule1) {
                const _add_schedule2 = await new Promise((resolve, reject) => {
                    db.query(`INSERT INTO ScheduleTable (Team_id, Deadline, description, Student_id)VALUES (?, ?, ?, ?);`,
                    [Team_id, Deadline, description, Student_id], (error) => {
                        if (error) {
                            console.error(error);
                            reject(error);
                        } else {
                            resolve(true);
                        }
                    });
                });
                return _add_schedule2;
            }
            else {
                return false;
            }
        } catch (error) {
            console.error('오류 발생:', error);
            // res 객체가 정의되지 않았으므로, 여기서 직접 응답을 처리하거나 에러를 던져야 합니다.
            throw new Error('오류 발생');
        }
    },
    get_schedule: async (Student_id, Team_id) => {
        try {
            const _get_schedule1 = await new Promise((resolve, reject) => {
                db.query(`SELECT * from TeamPeopleTable where Student_id = ? and Team_id = ?`, [Student_id, Team_id], (error, rows) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        if(rows.length !== 0) {
                            resolve(true);
                        }
                        else {
                            resolve(false);
                        }
                    }
                });
            });
            if(_get_schedule1) {
                const _get_schedule2 = await new Promise((resolve, reject) => {
                    db.query(`SELECT * from ScheduleTable where Team_id = ? ORDER BY Deadline ASC;`, [Team_id], (error, rows) => {
                        if (error) {
                            console.error(error);
                            reject(error);
                        } else {
                            const j = rows.length;
                            var result = [];
                            for (let i = 0; i < j; i++) {
                                const scheduleTime = rows[i].Deadline;
                                const currentTime = getCurrentDateTime();
                                if(scheduleTime > currentTime){
                                    result.push(rows[i]);
                                }
                            }
                            resolve(result);
                        }
                    });
                });
                return JSON.stringify({ success: true, message: 'success', schedule : _get_schedule2 });
            }
            else {
                return JSON.stringify({ success: false, message: 'not in that team' });
            }
        } catch (error) {
            console.error('오류 발생:', error);
            // res 객체가 정의되지 않았으므로, 여기서 직접 응답을 처리하거나 에러를 던져야 합니다.
            throw new Error('오류 발생');
        }
    },
    team_voted: async (Team_id, Student_id) => {
        try {
            const _team_voted = await new Promise((resolve, reject) => {
                db.query(`SELECT DISTINCT Student_id, voted FROM TeamPeopleTable
                WHERE Team_id = ? and Student_id = ?;`, [Team_id, Student_id], (error, rows) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        if(rows.length === 0) resolve(true);
                        if(rows[0].voted === 0) resolve(false);
                        else if(rows[0].voted === 1) resolve(true);
                    }
                });
            });
            return _team_voted;
        } catch (error) {
            console.error('오류 발생:', error);
            // res 객체가 정의되지 않았으므로, 여기서 직접 응답을 처리하거나 에러를 던져야 합니다.
            throw new Error('오류 발생');
        }
    },
    team_vote: async (Team_id, Student_id) => {
        try {
            const _team_vote = await new Promise((resolve, reject) => {
                db.query(`UPDATE TeamPeopleTable SET voted = 1 WHERE Team_id = ? and Student_id = ?`, [Team_id, Student_id], (error, rows) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        resolve(true);
                    }
                });
            });
            return _team_vote;
        } catch (error) {
            console.error('오류 발생:', error);
            // res 객체가 정의되지 않았으므로, 여기서 직접 응답을 처리하거나 에러를 던져야 합니다.
            throw new Error('오류 발생');
        }
    },
    rapid_match_on_off: async (Team_id, Student_id, rapid_match) => {
        try {
            const _rapid_match_on0 = await new Promise((resolve, reject) => {
                db.query(`SELECT * FROM TeamTable WHERE Team_id = ? and head = ?;`, [Team_id, Student_id], (error, rows) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        if(rows.length === 0) resolve(false);
                        else resolve(true);
                    }
                });
            });
            if(_rapid_match_on0){
                const _rapid_match_on1 = await new Promise((resolve, reject) => {
                    db.query(`UPDATE TeamTable SET rapid_match = ? WHERE Team_id = ? and head = ?`, [rapid_match, Team_id, Student_id], (error) => {
                        if (error) {
                            console.error(error);
                            reject(error);
                        } else {
                            resolve(true);
                        }
                    });
                });
                return _rapid_match_on1;
            }
            else{
                return _rapid_match_on0;
            }
        } catch (error) {
            console.error('오류 발생:', error);
            // res 객체가 정의되지 않았으므로, 여기서 직접 응답을 처리하거나 에러를 던져야 합니다.
            throw new Error('오류 발생');
        }
    },
    get_rapid_match: async (Team_id) => {
        try {
            const _rapid_match_on0 = await new Promise((resolve, reject) => {
                db.query(`SELECT rapid_match FROM TeamTable WHERE Team_id = ?`, [Team_id], (error, rows) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        if(rows[0].rapid_match === 0) resolve(false);
                        else if(rows[0].rapid_match === 1) resolve(true);
                    }
                });
            });
            return _rapid_match_on0;
        } catch (error) {
            console.error('오류 발생:', error);
            // res 객체가 정의되지 않았으므로, 여기서 직접 응답을 처리하거나 에러를 던져야 합니다.
            throw new Error('오류 발생');
        }
    },
    list_my_team: async (Student_id, year_semester) => {
        try {
            const _list_my_team = await new Promise((resolve, reject) => {
                db.query(`SELECT DISTINCT A.rapid_match, A.Team_name, A.Team_id, A.head, C.Course_id, C.Course_name, A.max_member, A.current_member, A.finish_time, A.description, A.rapid_match
                FROM TeamTable as A INNER JOIN TeamPeopleTable as B INNER JOIN CourseTable as C
                ON A.Team_id = B.Team_id and B.Student_id = ? and A.Course_id = C.Course_id and C.year_semester = ? ORDER BY A.finish_time;`, [Student_id, year_semester], (error, rows) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        const j = rows.length;
                        var result = [];
                        for (let i = 0; i < j; i++) {
                            const scheduleTime = rows[i].finish_time;
                            const currentTime = getCurrentDateTime();
                            if(scheduleTime > currentTime) rows[i].expired = false;
                            else rows[i].expired = true;
                            result.push(rows[i]);
                        }
                        resolve(result);
                    }
                });
            });
            const j = _list_my_team.length;
            for (let i = 0; i < j; i++) {
                if(_list_my_team[i].rapid_match === 1) _list_my_team[i].rapid_match = true;
                else if(_list_my_team[i].rapid_match === 0) _list_my_team[i].rapid_match = false;
            }
            return JSON.stringify(_list_my_team);
        } catch (error) {
            console.error('오류 발생:', error);
            // res 객체가 정의되지 않았으므로, 여기서 직접 응답을 처리하거나 에러를 던져야 합니다.
            throw new Error('오류 발생');
        }
    },
    list_whole_team: async (Student_id, year_semester) => {
        try {
            const _list_whole_team = await new Promise((resolve, reject) => {
                db.query(`SELECT DISTINCT A.rapid_match, A.Team_name, A.Team_id, A.head, D.Course_id, D.Course_name, A.max_member, A.current_member, A.finish_time, A.description, A.rapid_match
                FROM TeamTable as A INNER JOIN CourseTable as D INNER JOIN TimeTable as E
                ON E.Student_id = ? and E.Course_id = D.Course_id and D.Course_id = A.Course_id and D.year_semester = ? ORDER BY A.finish_time;`, [Student_id, year_semester], (error, rows) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        const j = rows.length;
                        var result = [];
                        for (let i = 0; i < j; i++) {
                            const scheduleTime = rows[i].finish_time;
                            const currentTime = getCurrentDateTime();
                            if(scheduleTime > currentTime) rows[i].expired = false;
                            else rows[i].expired = true;
                            result.push(rows[i]);
                        }
                        resolve(result);
                    }
                });
            });
            const j = _list_whole_team.length;
            for (let i = 0; i < j; i++) {
                if(_list_whole_team[i].rapid_match === 1) _list_whole_team[i].rapid_match = true;
                else if(_list_whole_team[i].rapid_match === 0) _list_whole_team[i].rapid_match = false;
            }
            return JSON.stringify(_list_whole_team);
        } catch (error) {
            console.error('오류 발생:', error);
            // res 객체가 정의되지 않았으므로, 여기서 직접 응답을 처리하거나 에러를 던져야 합니다.
            throw new Error('오류 발생');
        }
    },
    list_team_expired: async (Student_id, year_semester) => {
        try {
            const teams = await new Promise((resolve, reject) => {
                db.query(`SELECT B.Course_id, B.Team_id, B.Team_name, B.max_member, B.current_member, B.head, B.description, B.finish_time, B.rapid_match, C.Student_id, A.year_semester, C.voted
                FROM TimeTable as A INNER JOIN TeamTable as B INNER JOIN TeamPeopleTable as C
                ON A.Student_id = ? and A.year_semester = ? and A.Course_id = B.Course_id and B.Team_id = C.Team_id and C.Student_id = ? and C.voted = 0;`, [Student_id, year_semester, Student_id], (error, rows) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        const j = rows.length;
                        var result = [];
                        for (let i = 0; i < j; i++) {
                            const scheduleTime = rows[i].finish_time;
                            const currentTime = getCurrentDateTime();
                            if(scheduleTime <= currentTime){
                                if(rows[i].rapid_match === 1) rows[i].rapid_match = true;
                                else if(rows[i].rapid_match === 0) rows[i].rapid_match = false;
                                result.push(rows[i]);
                            }
                        }
                        resolve(result);
                    }
                });
            });
            return JSON.stringify(teams);
        } catch (error) {
            console.error('오류 발생:', error);
            // res 객체가 정의되지 않았으므로, 여기서 직접 응답을 처리하거나 에러를 던져야 합니다.
            throw new Error('오류 발생');
        }
    },
    has_team_expired: async (Team_id) => {
        try {
            const _has_team_expired = await new Promise((resolve, reject) => {
                db.query(`SELECT DISTINCT finish_time FROM TeamTable WHERE Team_id = ?;`, [Team_id], (error, rows) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        if(rows.length === 0) resolve(false);
                        else{
                            const scheduleTime = rows[0].finish_time;
                            const currentTime = getCurrentDateTime();
                            if(scheduleTime <= currentTime) resolve(true);
                            else resolve(false);
                        }
                    }
                });
            });
            return _has_team_expired;
        } catch (error) {
            console.error('오류 발생:', error);
            // res 객체가 정의되지 않았으므로, 여기서 직접 응답을 처리하거나 에러를 던져야 합니다.
            throw new Error('오류 발생');
        }
    },
    list_team_peole: async (Student_id, Team_id) => {
        try {
            const team_peole = await new Promise((resolve, reject) => {
                db.query(`SELECT DISTINCT C.Student_id, C.Student_name
                FROM TeamTable as A INNER JOIN TeamPeopleTable as B INNER JOIN StudentTable as C
                ON A.Team_id = ? and A.Team_id = B.Team_id and B.Student_id = C.Student_id`, [Team_id], (error, rows) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        const j = rows.length;
                        var result = [];
                        for (let i = 0; i < j; i++) {
                            if (rows[i].Student_id !== Student_id) {
                                result.push(rows[i]);
                            }
                        }
                        resolve(result);
                    }
                });
            });
            return JSON.stringify(team_peole);
        } catch (error) {
            console.error('오류 발생:', error);
            // res 객체가 정의되지 않았으므로, 여기서 직접 응답을 처리하거나 에러를 던져야 합니다.
            throw new Error('오류 발생');
        }
    },
    vote_peole: async (Student_id2, vote_value) => {
        try {
            const _vote_people = await new Promise((resolve, reject) => {
                db.query(`UPDATE StudentTable
                    SET speed = LEAST(300, GREATEST(0, speed + ?))
                    WHERE Student_id = ?;`, [vote_value, Student_id2], (error) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        resolve(true);
                    }
                });
            });
            return _vote_people;
        } catch (error) {
            console.error('오류 발생:', error);
            // res 객체가 정의되지 않았으므로, 여기서 직접 응답을 처리하거나 에러를 던져야 합니다.
            throw new Error('오류 발생');
        }
    },
    get_team_avg_speed: async (Team_id) => {
        try {
            const _get_team_avg_speed = await new Promise((resolve, reject) => {
                db.query(`SELECT AVG(B.speed) AS average_speed
                FROM TeamPeopleTable as A INNER JOIN StudentTable as B
                ON A.Team_id = ? and A.Student_id = B.Student_id;`, [Team_id], (error, rows) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        resolve(rows[0].average_speed);
                    }
                });
            });
            return _get_team_avg_speed;
        } catch (error) {
            console.error('오류 발생:', error);
            // res 객체가 정의되지 않았으므로, 여기서 직접 응답을 처리하거나 에러를 던져야 합니다.
            throw new Error('오류 발생');
        }
    },
    create_team: async (Course_id, Team_name, max_member, Student_id, description, finish_time, rapid_match) => {
        try {
            const _create_team1 = await new Promise((resolve, reject) => {
                db.query(`INSERT INTO TeamTable (Course_id, Team_name, max_member, current_member, head, description, finish_time, rapid_match)
                VALUES (?, ?, ?, 1, ?, ?, ?, ?)`, [Course_id, Team_name, max_member, Student_id, description, finish_time, rapid_match], (error) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        resolve(true);
                    }
                });
            });
            const _create_team2 = await new Promise((resolve, reject) => {
                db.query(`SELECT * FROM TeamTable ORDER BY Team_id DESC LIMIT 1;`, [], (error, rows) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        resolve(rows[0].Team_id);
                    }
                });
            });
            const _create_team3 = await new Promise((resolve, reject) => {
                db.query(`INSERT INTO TeamPeopleTable (Team_id, Student_id, voted) VALUES (?, ?, 0)`, [_create_team2, Student_id], (error) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        resolve(true);
                    }
                });
            });
            return _create_team1 && _create_team3;
        } catch (error) {
            console.error('오류 발생:', error);
            // res 객체가 정의되지 않았으므로, 여기서 직접 응답을 처리하거나 에러를 던져야 합니다.
            throw new Error('오류 발생');
        }
    },
    delete_team: async (Team_id, Student_id) => {
        try {
            const _delete_team1 = await new Promise((resolve, reject) => {
                db.query(`SELECT * FROM TeamTable WHERE Team_id = ? and head = ?;`, [Team_id, Student_id], (error, rows) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        if(rows.length !== 0) {
                            resolve(true);
                        }
                        else {
                            resolve(false);
                        }
                    }
                });
            });
            if(_delete_team1){
                const _delete_team2 = await new Promise((resolve, reject) => {
                    db.query(`DELETE FROM TeamPeopleTable WHERE Team_id = ?;`, [Team_id], (error) => {
                        if (error) {
                            console.error(error);
                            reject(error);
                        } else {
                            resolve(true);
                        }
                    });
                });
                const _delete_team3 = await new Promise((resolve, reject) => {
                    db.query(`DELETE FROM TeamTable WHERE Team_id = ?;`, [Team_id], (error) => {
                        if (error) {
                            console.error(error);
                            reject(error);
                        } else {
                            resolve(true);
                        }
                    });
                });
                const _delete_team4 = await new Promise((resolve, reject) => {
                    db.query(`DELETE FROM JoinRequestTable WHERE Team_id = ?;`, [Team_id], (error) => {
                        if (error) {
                            console.error(error);
                            reject(error);
                        } else {
                            resolve(true);
                        }
                    });
                });
                const _delete_team5 = await new Promise((resolve, reject) => {
                    db.query(`DELETE FROM ScheduleTable WHERE Team_id = ?;`, [Team_id], (error) => {
                        if (error) {
                            console.error(error);
                            reject(error);
                        } else {
                            resolve(true);
                        }
                    });
                });
                return _delete_team2 && _delete_team3 && _delete_team4 && _delete_team5;
            }
            else{
                return false;
            }
        } catch (error) {
            console.error('오류 발생:', error);
            // res 객체가 정의되지 않았으므로, 여기서 직접 응답을 처리하거나 에러를 던져야 합니다.
            throw new Error('오류 발생');
        }
    },
    leave_team: async (Team_id, Student_id) => {
        //console.log("leave_team");
        try {
            const _leave_team0 = await new Promise((resolve, reject) => {
                db.query(`SELECT * FROM TeamPeopleTable WHERE Team_id = ? and Student_id = ?;`, [Team_id, Student_id], (error, rows) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        if(rows.length !== 0) {
                            resolve(true);
                        }
                        else {
                            resolve(false);
                        }
                    }
                });
            });
            //console.log(_leave_team0);
            if(_leave_team0){
                const _leave_team1 = await new Promise((resolve, reject) => {
                    db.query(`UPDATE TeamTable SET current_member = current_member - 1 WHERE Team_id = ?;`, [Team_id], (error) => {
                        if (error) {
                            console.error(error);
                            reject(error);
                        } else {
                            resolve(true);
                        }
                    });
                });
                //console.log(_leave_team1);
                const _leave_team2 = await new Promise((resolve, reject) => {
                    db.query(`SELECT * FROM TeamTable WHERE Team_id = ? and head = ?;`, [Team_id, Student_id], (error, rows) => {
                        if (error) {
                            console.error(error);
                            reject(error);
                        } else {
                            if(rows.length !== 0) {
                                resolve(Student_id);
                            }
                            else {
                                resolve(false);
                            }
                        }
                    });
                });
                //console.log(_leave_team2);
                if(_leave_team2){
                    const _leave_team3 = await new Promise((resolve, reject) => {
                        db.query(`SELECT * FROM TeamPeopleTable WHERE Team_id = ? and Student_id != ?;`, [Team_id, Student_id], (error, rows) => {
                            if (error) {
                                console.error(error);
                                reject(error);
                            } else {
                                if(rows.length !== 0) {
                                    resolve(rows[0].Student_id);
                                }
                                else {
                                    resolve(false);
                                }
                            }
                        });
                    });
                    //console.log(_leave_team3);
                    if(_leave_team3){
                        const _leave_team4 = await new Promise((resolve, reject) => {
                            db.query(`UPDATE TeamTable SET head = ? WHERE Team_id = ?;`, [_leave_team3, Team_id], (error) => {
                                if (error) {
                                    console.error(error);
                                    reject(error);
                                } else {
                                    resolve(true);
                                }
                            });
                        });
                    }
                    else{
                        const _delete_team1 = await new Promise((resolve, reject) => {
                            db.query(`DELETE FROM TeamPeopleTable WHERE Team_id = ?;`, [Team_id], (error) => {
                                if (error) {
                                    console.error(error);
                                    reject(error);
                                } else {
                                    resolve(true);
                                }
                            });
                        });
                        const _delete_team2 = await new Promise((resolve, reject) => {
                            db.query(`DELETE FROM TeamTable WHERE Team_id = ?;`, [Team_id], (error) => {
                                if (error) {
                                    console.error(error);
                                    reject(error);
                                } else {
                                    resolve(true);
                                }
                            });
                        });
                        const _delete_team3 = await new Promise((resolve, reject) => {
                            db.query(`DELETE FROM JoinRequestTable WHERE Team_id = ?;`, [Team_id], (error) => {
                                if (error) {
                                    console.error(error);
                                    reject(error);
                                } else {
                                    resolve(true);
                                }
                            });
                        });
                        const _delete_team4 = await new Promise((resolve, reject) => {
                            db.query(`DELETE FROM ScheduleTable WHERE Team_id = ?;`, [Team_id], (error) => {
                                if (error) {
                                    console.error(error);
                                    reject(error);
                                } else {
                                    resolve(true);
                                }
                            });
                        });
                    }
                }
                const _leave_team5 = await new Promise((resolve, reject) => {
                    db.query(`DELETE FROM TeamPeopleTable WHERE Team_id = ? and Student_id = ?;`, [Team_id, Student_id], (error) => {
                        if (error) {
                            console.error(error);
                            reject(error);
                        } else {
                            resolve(true);
                        }
                    });
                });
                return true;
            }
            else {
                return false;
            }
        } catch (error) {
            console.error('오류 발생:', error);
            // res 객체가 정의되지 않았으므로, 여기서 직접 응답을 처리하거나 에러를 던져야 합니다.
            throw new Error('오류 발생');
        }
    },
    join_team_request: async (Team_id, Student_id) => {
        try {
            const _join_team_request = await new Promise((resolve, reject) => {
                db.query(`select * from JoinRequestTable where Team_id = ? and req_Student_id = ?;`, [Team_id, Student_id], (error, rows) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        if(rows.length === 0){
                            resolve(true);
                        }
                        else{
                            resolve(false);
                        }
                    }
                });
            });
            if(_join_team_request) {
                const _join_team_request0 = await new Promise((resolve, reject) => {
                    db.query(`select * from TeamPeopleTable where Team_id = ? and Student_id = ?;`, [Team_id, Student_id], (error, rows) => {
                        if (error) {
                            console.error(error);
                            reject(error);
                        } else {
                            if(rows.length === 0){
                                resolve(true);
                            }
                            else{
                                resolve(false);
                            }
                        }
                    });
                });
                if(_join_team_request0){
                    const _join_team_request1 = await new Promise((resolve, reject) => {
                        db.query(`select * from TeamTable where Team_id = ?;`, [Team_id], (error, rows) => {
                            if (error) {
                                console.error(error);
                                reject(error);
                            } else {
                                if(rows[0].current_member < rows[0].max_member){
                                    resolve(true);
                                }
                                else{
                                    resolve(false);
                                }
                            }
                        });
                    });
                    if(_join_team_request1){
                        const _description = await new Promise((resolve, reject) => {
                            db.query(`SELECT * FROM StudentTable WHERE Student_id = ?;`, [Student_id], (error, rows) => {
                                if (error) {
                                    console.error(error);
                                    reject(error);
                                } else {
                                    resolve(rows[0].description);
                                }
                            });
                        });
                        const _head_Student_id = await new Promise((resolve, reject) => {
                            db.query(`SELECT * FROM TeamTable WHERE Team_id = ?;`, [Team_id], (error, rows) => {
                                if (error) {
                                    console.error(error);
                                    reject(error);
                                } else {
                                    if(rows.length === 0){
                                        return JSON.stringify({success: false, message : 'no such team' });
                                    }
                                    resolve(rows[0].head);
                                }
                            });
                        });
                        const _join_team_request3 = await new Promise((resolve, reject) => {
                            db.query(`INSERT INTO JoinRequestTable (Student_id, Team_id, req_Student_id, description)
                            VALUES (?, ?, ?, ?);`, [_head_Student_id, Team_id, Student_id, _description], (error) => {
                                if (error) {
                                    console.error(error);
                                    reject(error);
                                } else {
                                    resolve(true);
                                }
                            });
                        });
                        return JSON.stringify({success: _join_team_request3, message: 'requested'});
                    }
                    else{
                        return JSON.stringify({ success: false, message: "team full" });
                    }
                }
                else {
                    return JSON.stringify({ success: false, message: "already in that team" });
                }
            }
            else {
                return JSON.stringify({ success: false, message: "already requested" });
            }
        } catch (error) {
            console.error('오류 발생:', error);
            // res 객체가 정의되지 않았으므로, 여기서 직접 응답을 처리하거나 에러를 던져야 합니다.
            throw new Error('오류 발생');
        }
    },
    join_team_request_list: async (Student_id) => {
        try {
            const _join_team_request_list = await new Promise((resolve, reject) => {
                db.query(`select * from JoinRequestTable where Student_id = ?;`, [Student_id], (error, rows) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        const j = rows.length;
                        var result = [];
                        for (let i = 0; i < j; i++) {
                            result.push(rows[i]);
                        }
                        resolve(result);
                    }
                });
            });
                return JSON.stringify(_join_team_request_list);
            
        } catch (error) {
            console.error('오류 발생:', error);
            // res 객체가 정의되지 않았으므로, 여기서 직접 응답을 처리하거나 에러를 던져야 합니다.
            throw new Error('오류 발생');
        }
    },
    join_team_response_accept: async (JoinRequest_id, Team_id, Student_id, head) => {
        try {
            const _join_team0 = await new Promise((resolve, reject) => {
                db.query(`select * from JoinRequestTable where JoinRequest_id = ? and Student_id = ? and Team_id = ? and req_Student_id = ?;`,
                [JoinRequest_id, head, Team_id, Student_id], (error, rows) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        if(rows.length !== 0){
                            resolve(true);
                        }
                        else{
                            resolve(false);
                        }
                    }
                });
            });
            if(_join_team0){
                const _join_team1 = await new Promise((resolve, reject) => {
                    db.query(`select * from TeamTable where Team_id = ?;`, [Team_id], (error, rows) => {
                        if (error) {
                            console.error(error);
                            reject(error);
                        } else {
                            if(rows[0].current_member < rows[0].max_member){
                                resolve(true);
                            }
                            else{
                                resolve(false);
                            }
                        }
                    });
                });
                if(_join_team1){
                    const _join_team2 = await new Promise((resolve, reject) => {
                        db.query(`select * from TeamTable where Team_id = ? and head = ?;`, [Team_id, head], (error, rows) => {
                            if (error) {
                                console.error(error);
                                reject(error);
                            } else {
                                if(rows.length !== 0){
                                    resolve(true);
                                }
                                else{
                                    resolve(false);
                                }
                            }
                        });
                    });
                    if(_join_team2){
                        const _join_team3 = await new Promise((resolve, reject) => {
                            db.query(`INSERT INTO TeamPeopleTable (Team_id, Student_id, voted)VALUES (?, ?, 0);`, [Team_id, Student_id], (error) => {
                                if (error) {
                                    console.error(error);
                                    reject(error);
                                } else {
                                    resolve(true);
                                }
                            });
                        });
                        const _join_team4 = await new Promise((resolve, reject) => {
                            db.query(`UPDATE TeamTable SET current_member = current_member + 1 WHERE Team_id = ?;`, [Team_id], (error) => {
                                if (error) {
                                    console.error(error);
                                    reject(error);
                                } else {
                                    resolve(true);
                                }
                            });
                        });
                        const _join_team5 = await new Promise((resolve, reject) => {
                            db.query(`DELETE FROM JoinRequestTable WHERE JoinRequest_id = ?;`, [JoinRequest_id], (error) => {
                                if (error) {
                                    console.error(error);
                                    reject(error);
                                } else {
                                    resolve(true);
                                }
                            });
                        });
                        return JSON.stringify({success: _join_team3 && _join_team4 && _join_team5, message: 'accepted'});
                    }
                    else{
                        return JSON.stringify({success: false, message: 'you are not head of team'});
                    }
                }
                else{
                    const _join_team6 = await new Promise((resolve, reject) => {
                        db.query(`DELETE FROM JoinRequestTable WHERE JoinRequest_id = ?;`, [JoinRequest_id], (error) => {
                            if (error) {
                                console.error(error);
                                reject(error);
                            } else {
                                resolve(true);
                            }
                        });
                    });
                    return JSON.stringify({ success: _join_team2 && !_join_team6, message: "team full" });
                }
            }
            else {
                return JSON.stringify({ success: _join_team0, message: "not in request list" });
            }
        } catch (error) {
            console.error('오류 발생:', error);
            // res 객체가 정의되지 않았으므로, 여기서 직접 응답을 처리하거나 에러를 던져야 합니다.
            throw new Error('오류 발생');
        }
    },
    join_team_response_reject: async (JoinRequest_id, Team_id, Student_id, head) => {
        try {
            const _join_team0 = await new Promise((resolve, reject) => {
                db.query(`select * from JoinRequestTable where JoinRequest_id = ? and Student_id = ? and Team_id = ? and req_Student_id = ?;`,
                [JoinRequest_id, head, Team_id, Student_id], (error, rows) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        if(rows.length !== 0){
                            resolve(true);
                        }
                        else{
                            resolve(false);
                        }
                    }
                });
            });
            if(_join_team0){
                const _join_team1 = await new Promise((resolve, reject) => {
                    db.query(`DELETE FROM JoinRequestTable WHERE JoinRequest_id = ?;`, [JoinRequest_id], (error) => {
                        if (error) {
                            console.error(error);
                            reject(error);
                        } else {
                            resolve(true);
                        }
                    });
                });
                return JSON.stringify({ success: _join_team0 && _join_team1, message: "rejected" });
            }
            else {
                return JSON.stringify({ success: _join_team0, message: "not in request list" });
            }
        } catch (error) {
            console.error('오류 발생:', error);
            // res 객체가 정의되지 않았으므로, 여기서 직접 응답을 처리하거나 에러를 던져야 합니다.
            throw new Error('오류 발생');
        }
    },
    rapid_match: async (Course_id, Student_id) => {
        try {
            const _rapid_match0 = await new Promise((resolve, reject) => {
                db.query(`SELECT Team_id FROM TeamTable WHERE Course_id = ? and
                max_member > current_member and rapid_match = 1 ORDER BY current_member LIMIT 1`,
                [Course_id], (error, rows) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        if(rows.length !== 0){
                            resolve(rows[0].Team_id);
                        }
                        else{
                            resolve(false);
                        }
                    }
                });
            });
            if(_rapid_match0){
                const _rapid_match1 = await new Promise((resolve, reject) => {
                    db.query(`INSERT INTO TeamPeopleTable (Team_id, Student_id, voted)VALUES (?, ?, 0);`, [_rapid_match0, Student_id], (error) => {
                        if (error) {
                            console.error(error);
                            reject(error);
                        } else {
                            resolve(true);
                        }
                    });
                });
                const _rapid_match2 = await new Promise((resolve, reject) => {
                    db.query(`UPDATE TeamTable SET current_member = current_member + 1 WHERE Team_id = ?;`, [_rapid_match0], (error) => {
                        if (error) {
                            console.error(error);
                            reject(error);
                        } else {
                            resolve(true);
                        }
                    });
                });
                return JSON.stringify({ success: _rapid_match1 && _rapid_match2, joined_team: _rapid_match0, message: "team joined" });
            }
            else {
                return JSON.stringify({ success: _rapid_match0, message: "no available team" });
            }
        } catch (error) {
            console.error('오류 발생:', error);
            // res 객체가 정의되지 않았으므로, 여기서 직접 응답을 처리하거나 에러를 던져야 합니다.
            throw new Error('오류 발생');
        }
    },
    add_student_description: async (description, Student_id) => {
        try {
            const _add_student_description = await new Promise((resolve, reject) => {
                db.query(`UPDATE StudentTable SET description = ? WHERE Student_id= ?;`, [description, Student_id], (error) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        resolve(true);
                    }
                });
            });
            return _add_student_description;
        } catch (error) {
            console.error('오류 발생:', error);
            // res 객체가 정의되지 않았으므로, 여기서 직접 응답을 처리하거나 에러를 던져야 합니다.
            throw new Error('오류 발생');
        }
    },
    add_team_description: async (description, Team_id, Student_id) => {
        try {
            const _add_team_description1 = await new Promise((resolve, reject) => {
                db.query(`SELECT * FROM TeamTable WHERE Team_id = ? and head = ?;`, [Team_id, Student_id], (error, rows) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        if(rows.length !== 0) {
                            resolve(Student_id);
                        }
                        else {
                            resolve(false);
                        }
                    }
                });
            });
            if(_add_team_description1) {
                const _add_team_description2 = await new Promise((resolve, reject) => {
                    db.query(`UPDATE TeamTable SET description = ? WHERE Team_id= ? and head = ?;`, [description, Team_id, Student_id], (error) => {
                        if (error) {
                            console.error(error);
                            reject(error);
                        } else {
                            resolve(true);
                        }
                    });
                });
                return _add_team_description2;
            }
            else {
                return false;
            }
        } catch (error) {
            console.error('오류 발생:', error);
            // res 객체가 정의되지 않았으므로, 여기서 직접 응답을 처리하거나 에러를 던져야 합니다.
            throw new Error('오류 발생');
        }
    }
}
