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
    course_to_db: async (year_semester, timetable) => {
        try {
            if (timetable.length === 0) {
                //console.log('no table');
                return false;
            }
            const groupedData = lodash.groupBy(timetable, 'name');
            const timetable_result = Object.values(groupedData).map(group => group);
            console.log(timetable_result)
            const j = timetable_result.length;
            for (let i = 0; i < j; i++) {
                const time_table_index = timetable_result[i];
                const CourseID = year_semester + time_table_index[0].day + time_table_index[0].time + time_table_index[0].name;
                console.log(CourseID)
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
                db.query(`SELECT Course_id FROM TimeTable WHERE Student_id = ? and year_semester = ?;`, [Student_id, year_semester], (error, rows) => {
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
            return JSON.stringify(timeTable);
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
    add_student_table: async (Student_id, Student_pw, student_name, student_number, department) => {
        try {
            const _add_student_table = await new Promise((resolve, reject) => {
                db.query(`INSERT INTO StudentTable
                (Student_id, Student_pw, Student_name, Student_number, Speed, department)
                VALUES (?, ?, ?, ?, ?, ?)`, [Student_id, Student_pw, student_name, student_number, 100, department], (error) => {
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
            return _add_student_table && _add_student_photo_table;
        } catch (error) {
            console.error('오류 발생:', error);
            throw new Error('오류 발생');
        }
    },
    get_schedule: async (Student_id) => {
        try {
            const schedules = await new Promise((resolve, reject) => {
                db.query(`SELECT DISTINCT F.Course_name, D.Project_name, A.Team_name, C.Deadline, C.description
                FROM TeamTable as A INNER JOIN  TeamPeopleTable as B INNER JOIN ScheduleTable as C INNER JOIN ProjectTable as D INNER JOIN TimeTable as E INNER JOIN CourseTable as F
                ON A.Team_id = B.Team_id and B.Team_id = C.Team_id and A.Project_id = D.Project_id and D.Course_id = E.Course_id and E.Course_id = F.Course_id and E.Student_id = ?`, [Student_id], (error, rows) => {
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
    add_schedule: async (Team_id, Deadline, description) => {
        try {
            const _add_schedule = await new Promise((resolve, reject) => {
                db.query(`INSERT INTO ScheduleTable (Team_id, Deadline, description)VALUES (?, ?, ?);`, [Team_id, Deadline, description], (error) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        resolve(true);
                    }
                });
            });
            return _add_schedule;
        } catch (error) {
            console.error('오류 발생:', error);
            // res 객체가 정의되지 않았으므로, 여기서 직접 응답을 처리하거나 에러를 던져야 합니다.
            throw new Error('오류 발생');
        }
    },
    add_project: async (Course_id, Project_name, start_time, finish_time, description) => {
        try {
            const _add_project = await new Promise((resolve, reject) => {
                db.query(`INSERT INTO ProjectTable (Course_id, Project_name, start_time, finish_time, description, voted)
                VALUES (?, ?, ?, ?);`, [Course_id, Project_name, start_time, finish_time, description, 0], (error) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        resolve(true);
                    }
                });
            });
            return _add_project;
        } catch (error) {
            console.error('오류 발생:', error);
            // res 객체가 정의되지 않았으므로, 여기서 직접 응답을 처리하거나 에러를 던져야 합니다.
            throw new Error('오류 발생');
        }
    },
    project_voted: async (Project_id, Student_id) => {
        try {
            const _project_voted = await new Promise((resolve, reject) => {
                db.query(`SELECT DISTINCT Student_id, voted
                FROM TeamTable as A INNER JOIN TeamPeopleTable as B
                ON A.Project_id = ? and A.Team_id = B.Team_id and B.Student_id = ?;`, [Project_id, Student_id], (error, rows) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        if(rows[0].voted === 0) resolve(false);
                        else if(rows[0].voted === 1) resolve(true);
                    }
                });
            });
            return _project_voted;
        } catch (error) {
            console.error('오류 발생:', error);
            // res 객체가 정의되지 않았으므로, 여기서 직접 응답을 처리하거나 에러를 던져야 합니다.
            throw new Error('오류 발생');
        }
    },
    project_vote: async (Project_id, Student_id) => {
        try {
            const _project_vote = await new Promise((resolve, reject) => {
                db.query(`UPDATE TeamPeopleTable 
                INNER JOIN TeamTable ON TeamTable.Project_id = ? and
                TeamTable.Team_id = TeamPeopleTable.Team_id and TeamPeopleTable.Student_id = ?
                SET TeamPeopleTable.voted = 1;`, [Project_id, Student_id], (error, rows) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        resolve(true);
                    }
                });
            });
            return _project_vote;
        } catch (error) {
            console.error('오류 발생:', error);
            // res 객체가 정의되지 않았으므로, 여기서 직접 응답을 처리하거나 에러를 던져야 합니다.
            throw new Error('오류 발생');
        }
    },
    list_my_project: async (Student_id, year_semester) => {
        try {
            const projects = await new Promise((resolve, reject) => {
                db.query(`SELECT DISTINCT B.Project_id, B.Project_name, B.Course_id, B.start_time, B.finish_time, B.description
                FROM TeamTable as A INNER JOIN  ProjectTable as B INNER JOIN TeamPeopleTable as C INNER JOIN TimeTable as D
                ON C.Student_id = ? and C.Team_id = A.Team_id and A.Project_id = B.project_id and B.Course_id = D.Course_id and D.year_semester = ?`, [Student_id, year_semester], (error, rows) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        const j = rows.length;
                        var result = [];
                        for (let i = 0; i < j; i++) {
                            const scheduleTime = rows[i].finish_time;
                            const currentTime = getCurrentDateTime();
                            if(scheduleTime > currentTime){
                                result.push(rows[i]);
                            }
                        }
                        resolve(result);
                    }
                });
            });
            return JSON.stringify(projects);
        } catch (error) {
            console.error('오류 발생:', error);
            // res 객체가 정의되지 않았으므로, 여기서 직접 응답을 처리하거나 에러를 던져야 합니다.
            throw new Error('오류 발생');
        }
    },
    list_my_team: async (Student_id, year_semester) => {
        try {
            const _list_my_team = await new Promise((resolve, reject) => {
                db.query(`SELECT DISTINCT A.Team_name, A.Team_id, A.head, C.Course_id, D.Course_name, A.max_member, A.current_member, C.finish_time, A.description
                FROM TeamTable as A INNER JOIN TeamPeopleTable as B INNER JOIN ProjectTable as C INNER JOIN CourseTable as D
                ON A.Team_id = B.Team_id and B.Student_id = ? and A.Project_id = C.Project_id and C.Course_id = D.Course_id and D.year_semester = ?;`, [Student_id, year_semester], (error, rows) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        const j = rows.length;
                        var result = [];
                        for (let i = 0; i < j; i++) {
                            const scheduleTime = rows[i].finish_time;
                            const currentTime = getCurrentDateTime();
                            if(scheduleTime > currentTime){
                                result.push(rows[i]);
                            }
                        }
                        resolve(result);
                    }
                });
            });
            return JSON.stringify(_list_my_team);
        } catch (error) {
            console.error('오류 발생:', error);
            // res 객체가 정의되지 않았으므로, 여기서 직접 응답을 처리하거나 에러를 던져야 합니다.
            throw new Error('오류 발생');
        }
    },
    list_whole_project: async (Student_id, year_semester) => {
        try {
            const projects = await new Promise((resolve, reject) => {
                db.query(`SELECT DISTINCT B.Project_id, B.Project_name, B.Course_id, B.start_time, B.finish_time, B.description
                FROM TimeTable as A INNER JOIN ProjectTable as B
                ON A.Student_id = ? and A.year_semester = ? and A.Course_id = B.Course_id`, [Student_id, year_semester], (error, rows) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        const j = rows.length;
                        var result = [];
                        for (let i = 0; i < j; i++) {
                            const scheduleTime = rows[i].finish_time;
                            const currentTime = getCurrentDateTime();
                            if(scheduleTime > currentTime){
                                result.push(rows[i]);
                            }
                        }
                        resolve(result);
                    }
                });
            });
            return JSON.stringify(projects);
        } catch (error) {
            console.error('오류 발생:', error);
            // res 객체가 정의되지 않았으므로, 여기서 직접 응답을 처리하거나 에러를 던져야 합니다.
            throw new Error('오류 발생');
        }
    },
    list_whole_team: async (Student_id, year_semester) => {
        try {
            const _list_whole_team = await new Promise((resolve, reject) => {
                db.query(`SELECT DISTINCT A.Team_name, A.Team_id, A.head, C.Course_id, D.Course_name, A.max_member, A.current_member, C.finish_time, A.description
                FROM TeamTable as A INNER JOIN TeamPeopleTable as B INNER JOIN ProjectTable as C INNER JOIN CourseTable as D INNER JOIN TimeTable as E
                ON E.Student_id = ? and E.Course_id = D.Course_id and D.Course_id = C.Course_id and C.Project_id = A.Project_id and D.year_semester = ?;`, [Student_id, year_semester], (error, rows) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        const j = rows.length;
                        var result = [];
                        for (let i = 0; i < j; i++) {
                            const scheduleTime = rows[i].finish_time;
                            const currentTime = getCurrentDateTime();
                            if(scheduleTime > currentTime){
                                result.push(rows[i]);
                            }
                        }
                        resolve(result);
                    }
                });
            });
            return JSON.stringify(_list_whole_team);
        } catch (error) {
            console.error('오류 발생:', error);
            // res 객체가 정의되지 않았으므로, 여기서 직접 응답을 처리하거나 에러를 던져야 합니다.
            throw new Error('오류 발생');
        }
    },
    list_project_expired: async (Student_id, year_semester) => {
        try {
            const projects = await new Promise((resolve, reject) => {
                db.query(`SELECT DISTINCT B.Project_id, B.Project_name, B.Course_id, B.start_time, B.finish_time, B.description
                FROM TimeTable as A INNER JOIN ProjectTable as B
                ON A.Student_id = ? and A.year_semester = ? and A.Course_id = B.Course_id;`, [Student_id, year_semester], (error, rows) => {
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
                                result.push(rows[i]);
                            }
                        }
                        resolve(result);
                    }
                });
            });
            return JSON.stringify(projects);
        } catch (error) {
            console.error('오류 발생:', error);
            // res 객체가 정의되지 않았으므로, 여기서 직접 응답을 처리하거나 에러를 던져야 합니다.
            throw new Error('오류 발생');
        }
    },
    has_project_expired: async (Project_id) => {
        try {
            const _has_project_expired = await new Promise((resolve, reject) => {
                db.query(`SELECT DISTINCT Project_id, Project_name, finish_time
                        FROM ProjectTable WHERE Project_id = ?;`, [Project_id], (error, rows) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        const scheduleTime = rows[0].finish_time;
                        const currentTime = getCurrentDateTime();
                        if(scheduleTime <= currentTime) resolve(true);
                        else resolve(false);
                    }
                });
            });
            return _has_project_expired;
        } catch (error) {
            console.error('오류 발생:', error);
            // res 객체가 정의되지 않았으므로, 여기서 직접 응답을 처리하거나 에러를 던져야 합니다.
            throw new Error('오류 발생');
        }
    },
    list_project_peole: async (Student_id, Project_id) => {
        try {
            const project_peole = await new Promise((resolve, reject) => {
                db.query(`SELECT DISTINCT C.Student_id, C.Student_name
                FROM TeamTable as A INNER JOIN TeamPeopleTable as B INNER JOIN StudentTable as C
                ON A.Project_id = ? and A.Team_id = B.Team_id and B.Student_id = C.Student_id`, [Project_id], (error, rows) => {
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
            return JSON.stringify(project_peole);
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
                SET speed = speed + ?
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
    create_team: async (Project_id, Team_name, max_member, Student_id) => {
        try {
            const _create_team1 = await new Promise((resolve, reject) => {
                db.query(`INSERT INTO TeamTable (Project_id, Team_name, max_member, current_member, head) VALUES (?, ?, ?, 1, ?)`, [Project_id, Team_name, max_member, Student_id], (error) => {
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
                return _delete_team2 && _delete_team3;
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
            }
            return true;
        } catch (error) {
            console.error('오류 발생:', error);
            // res 객체가 정의되지 않았으므로, 여기서 직접 응답을 처리하거나 에러를 던져야 합니다.
            throw new Error('오류 발생');
        }
    },
    join_team: async (Team_id, Student_id) => {
        try {
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
                    db.query(`INSERT INTO TeamPeopleTable (Team_id, Student_id, voted)VALUES (?, ?, 0);`, [Team_id, Student_id], (error) => {
                        if (error) {
                            console.error(error);
                            reject(error);
                        } else {
                            resolve(true);
                        }
                    });
                });
                const _join_team3 = await new Promise((resolve, reject) => {
                    db.query(`UPDATE TeamTable SET current_member = current_member + 1 WHERE Team_id = ?;`, [Team_id], (error) => {
                        if (error) {
                            console.error(error);
                            reject(error);
                        } else {
                            resolve(true);
                        }
                    });
                });
                return {success: _join_team2 && _join_team3};
            }
            else{
                return { success: false, message: "team full" };
            }
        } catch (error) {
            console.error('오류 발생:', error);
            // res 객체가 정의되지 않았으므로, 여기서 직접 응답을 처리하거나 에러를 던져야 합니다.
            throw new Error('오류 발생');
        }
    },
    list_team: async (Project_id) => {
        try {
            const teams = await new Promise((resolve, reject) => {
                db.query(`SELECT DISTINCT A.Project_id, B.Project_name, A.Team_id, A.Team_name, B.finish_time
                FROM TeamTable as A INNER JOIN ProjectTable as B
                ON B.Project_id = ?`, [Project_id], (error, rows) => {
                    if (error) {
                        console.error(error);
                        reject(error);
                    } else {
                        const j = rows.length;
                        var result = [];
                        for (let i = 0; i < j; i++) {
                            const scheduleTime = rows[i].finish_time;
                            const currentTime = getCurrentDateTime();
                            if(scheduleTime > currentTime){
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
